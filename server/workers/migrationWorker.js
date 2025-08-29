const Queue = require('bull');
const Redis = require('redis');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logger, createJobLogger, logMigrationEvent, logMigrationError, logMigrationProgress } = require('../services/logger');
const { getValidAccessTokenWithRefresh } = require('../services/tokenStorage');

// Worker configuration
const WORKER_CONFIG = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  maxConcurrentJobs: process.env.MAX_CONCURRENT_JOBS || 2,
  jobTimeout: process.env.JOB_TIMEOUT || 24 * 60 * 60 * 1000, // 24 hours
  progressUpdateInterval: process.env.PROGRESS_UPDATE_INTERVAL || 5000 // 5 seconds
};

class MigrationWorker {
  constructor() {
    this.migrationQueue = null;
    this.progressQueue = null;
    this.activeJobs = new Map(); // jobId -> { process, startTime, progress }
    this.redisClient = null;
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      logger.info('Initializing migration worker...');
      
      // Connect to Redis
      this.redisClient = Redis.createClient({ url: WORKER_CONFIG.redisUrl });
      await this.redisClient.connect();
      logger.info('Redis connected successfully');
      
      // Create queues
      this.migrationQueue = new Queue('migration', WORKER_CONFIG.redisUrl, {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          timeout: WORKER_CONFIG.jobTimeout
        }
      });

      this.progressQueue = new Queue('progress', WORKER_CONFIG.redisUrl, {
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 100
        }
      });

      // Set up event handlers
      this.setupEventHandlers();
      
      // Start processing jobs
      await this.startProcessing();
      
      logger.info('Migration worker initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize migration worker', { error: error.message });
      process.exit(1);
    }
  }

  setupEventHandlers() {
    // Migration queue events
    this.migrationQueue.on('completed', (job, result) => {
      logger.info('Migration job completed', { jobId: job.id, result });
      this.cleanupJob(job.id);
    });

    this.migrationQueue.on('failed', (job, err) => {
      logger.error('Migration job failed', { jobId: job.id, error: err.message });
      this.cleanupJob(job.id);
    });

    this.migrationQueue.on('stalled', (job) => {
      logger.warn('Migration job stalled', { jobId: job.id });
    });

    // Progress queue events
    this.progressQueue.on('completed', (job, result) => {
      logger.debug('Progress update processed', { jobId: job.data.jobId, progress: job.data.progress });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  async startProcessing() {
    // Process migration jobs
    this.migrationQueue.process(WORKER_CONFIG.maxConcurrentJobs, async (job) => {
      return await this.processMigrationJob(job);
    });

    // Process progress updates
    this.progressQueue.process(async (job) => {
      return await this.processProgressUpdate(job);
    });

    logger.info(`Started processing jobs with max concurrency: ${WORKER_CONFIG.maxConcurrentJobs}`);
  }

  async processMigrationJob(job) {
    const { id, userId, items, dstPrefix } = job.data;
    const jobLogger = createJobLogger(id);
    
    try {
      logMigrationEvent(id, 'started', { userId, itemCount: items.length });
      
      // Check if user already has a running migration
      const isRunning = await this.checkUserMigrationStatus(userId);
      if (isRunning) {
        throw new Error('User already has a migration in progress');
      }

      // Validate and refresh token
      await this.validateUserToken(userId);
      
      // Start rclone process
      const result = await this.startRcloneProcess(id, userId, items, dstPrefix);
      
      logMigrationEvent(id, 'completed', result);
      return result;
      
    } catch (error) {
      logMigrationError(id, error, { userId, items: items.length });
      throw error;
    } finally {
      this.cleanupJob(id);
    }
  }

  async checkUserMigrationStatus(userId) {
    try {
      const activeJobs = await this.migrationQueue.getJobs(['active']);
      return activeJobs.some(job => job.data.userId === userId);
    } catch (error) {
      logger.error('Failed to check user migration status', { userId, error: error.message });
      return false;
    }
  }

  async validateUserToken(userId) {
    try {
      await getValidAccessTokenWithRefresh(userId);
      logger.debug('User token validated', { userId });
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  async startRcloneProcess(jobId, userId, items, dstPrefix) {
    return new Promise((resolve, reject) => {
      const jobLogger = createJobLogger(jobId);
      
      try {
        // Create manifest file
        const manifestFile = path.join(__dirname, '../data', `${jobId}.txt`);
        fs.writeFileSync(manifestFile, items.join('\n'));
        
        // Build rclone command
        const rcloneArgs = this.buildRcloneArgs(jobId, manifestFile, dstPrefix);
        const rclonePath = process.env.RCLONE_PATH || 'rclone';
        
        jobLogger.info('Starting rclone process', { 
          command: `${rclonePath} ${rcloneArgs.join(' ')}`,
          itemCount: items.length 
        });
        
        // Spawn rclone process
        const child = spawn(rclonePath, rcloneArgs, {
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false // Keep attached for proper cleanup
        });
        
        // Store job info
        this.activeJobs.set(jobId, {
          process: child,
          startTime: Date.now(),
          progress: 0,
          manifestFile
        });
        
        let outputBuffer = '';
        let lastProgressUpdate = 0;
        
        // Handle stdout
        child.stdout.on('data', (data) => {
          const output = data.toString();
          outputBuffer += output;
          jobLogger.debug('Rclone output', { output: output.trim() });
          
          // Parse progress from output
          const progress = this.parseProgressFromOutput(output);
          if (progress !== null && Date.now() - lastProgressUpdate > WORKER_CONFIG.progressUpdateInterval) {
            this.updateJobProgress(jobId, progress);
            lastProgressUpdate = Date.now();
          }
        });
        
        // Handle stderr
        child.stderr.on('data', (data) => {
          const output = data.toString();
          jobLogger.warn('Rclone stderr', { output: output.trim() });
        });
        
        // Handle process completion
        child.on('close', (code) => {
          jobLogger.info('Rclone process completed', { exitCode: code });
          
          // Clean up manifest file
          try {
            fs.unlinkSync(manifestFile);
          } catch (e) {
            jobLogger.warn('Failed to delete manifest file', { error: e.message });
          }
          
          if (code === 0) {
            resolve({
              success: true,
              exitCode: code,
              output: outputBuffer,
              duration: Date.now() - this.activeJobs.get(jobId)?.startTime
            });
          } else {
            reject(new Error(`Rclone process failed with exit code: ${code}`));
          }
        });
        
        // Handle process errors
        child.on('error', (error) => {
          jobLogger.error('Rclone process error', { error: error.message });
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  buildRcloneArgs(jobId, manifestFile, dstPrefix) {
    const bucketName = process.env.B2_BUCKET_NAME || 'onedrive-migrations';
    const dst = `b2:${bucketName}/${dstPrefix || jobId}`;
    
    return [
      'copy',
      'onedrive:',
      dst,
      '--files-from', manifestFile,
      '--progress',
      '--transfers', '8',
      '--checkers', '8',
      '--retries', '3',
      '--low-level-retries', '5',
      '--stats', '1s',
      '--buffer-size', '16M',
      '--config', path.join(__dirname, '../data/rclone.conf')
    ];
  }

  parseProgressFromOutput(output) {
    // Parse rclone progress output
    const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
    if (progressMatch) {
      return parseFloat(progressMatch[1]);
    }
    
    // Parse transferred files count
    const transferredMatch = output.match(/Transferred:\s*(\d+)\/(\d+)/);
    if (transferredMatch) {
      const transferred = parseInt(transferredMatch[1]);
      const total = parseInt(transferredMatch[2]);
      return total > 0 ? (transferred / total) * 100 : 0;
    }
    
    return null;
  }

  async updateJobProgress(jobId, progress) {
    try {
      await job.updateProgress(progress);
      logMigrationProgress(jobId, progress);
    } catch (error) {
      logger.error('Failed to update job progress', { jobId, progress, error: error.message });
    }
  }

  async processProgressUpdate(job) {
    const { jobId, progress, timestamp, ...details } = job.data;
    logger.debug('Processing progress update', { jobId, progress, details });
    return { processed: true, timestamp };
  }

  cleanupJob(jobId) {
    const jobInfo = this.activeJobs.get(jobId);
    if (jobInfo) {
      // Kill process if still running
      if (jobInfo.process && !jobInfo.process.killed) {
        jobInfo.process.kill('SIGTERM');
      }
      
      // Clean up manifest file
      if (jobInfo.manifestFile && fs.existsSync(jobInfo.manifestFile)) {
        try {
          fs.unlinkSync(jobInfo.manifestFile);
        } catch (e) {
          logger.warn('Failed to delete manifest file during cleanup', { jobId, error: e.message });
        }
      }
      
      this.activeJobs.delete(jobId);
    }
  }

  async gracefulShutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown...');
    
    // Stop accepting new jobs
    await this.migrationQueue.pause();
    await this.progressQueue.pause();
    
    // Wait for active jobs to complete (with timeout)
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, 30000); // 30 seconds
    
    // Clean up active jobs
    for (const [jobId, jobInfo] of this.activeJobs.entries()) {
      logger.info('Cleaning up active job', { jobId });
      this.cleanupJob(jobId);
    }
    
    // Close queues
    await this.migrationQueue.close();
    await this.progressQueue.close();
    
    // Close Redis connection
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  }
}

// Start the worker
if (require.main === module) {
  const worker = new MigrationWorker();
  worker.initialize().catch((error) => {
    logger.error('Worker initialization failed', { error: error.message });
    process.exit(1);
  });
}

module.exports = MigrationWorker;





