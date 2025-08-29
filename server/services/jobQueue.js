const Queue = require('bull');
const Redis = require('redis');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

// Job status constants
const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

// Job types
const JOB_TYPES = {
  MIGRATION: 'migration',
  VERIFICATION: 'verification'
};

class JobQueueService {
  constructor() {
    this.queues = new Map();
    this.redisClient = null;
    this.useRedis = false;
    this.fileStoragePath = path.join(__dirname, '../data/jobs');
    
    // Ensure file storage directory exists
    if (!fs.existsSync(this.fileStoragePath)) {
      fs.mkdirSync(this.fileStoragePath, { recursive: true });
    }
    
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = Redis.createClient({ url: redisUrl });
      
      await this.redisClient.connect();
      this.useRedis = true;
      logger.info('Redis connected successfully');
      
      // Create queues
      this.createQueues();
      
    } catch (error) {
      logger.warn('Redis connection failed, using file-based storage', { error: error.message });
      this.useRedis = false;
      this.redisClient = null;
    }
  }

  createQueues() {
    if (!this.useRedis) return;

    // Migration queue
    this.queues.set('migration', new Queue('migration', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    }));

    // Progress tracking queue
    this.queues.set('progress', new Queue('progress', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 100
      }
    }));

    // Set up queue event handlers
    this.setupQueueEventHandlers();
  }

  setupQueueEventHandlers() {
    const migrationQueue = this.queues.get('migration');
    if (!migrationQueue) return;

    migrationQueue.on('completed', (job, result) => {
      logger.info('Migration job completed', { 
        jobId: job.id, 
        result: result 
      });
      this.updateJobStatus(job.id, JOB_STATUS.COMPLETED, result);
    });

    migrationQueue.on('failed', (job, err) => {
      logger.error('Migration job failed', { 
        jobId: job.id, 
        error: err.message 
      });
      this.updateJobStatus(job.id, JOB_STATUS.FAILED, { error: err.message });
    });

    migrationQueue.on('stalled', (job) => {
      logger.warn('Migration job stalled', { jobId: job.id });
    });
  }

  async addMigrationJob(userId, items, dstPrefix = '') {
    const jobId = uuidv4();
    const jobData = {
      id: jobId,
      type: JOB_TYPES.MIGRATION,
      userId,
      items,
      dstPrefix,
      status: JOB_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      error: null,
      result: null
    };

    if (this.useRedis) {
      // Add to Bull queue
      const migrationQueue = this.queues.get('migration');
      const job = await migrationQueue.add('migration', jobData, {
        jobId: jobId,
        priority: 1
      });
      
      logger.info('Migration job added to Redis queue', { jobId, queueId: job.id });
    } else {
      // Store in file system
      this.saveJobToFile(jobData);
      logger.info('Migration job saved to file system', { jobId });
    }

    return jobData;
  }

  async getJobStatus(jobId) {
    if (this.useRedis) {
      const migrationQueue = this.queues.get('migration');
      const job = await migrationQueue.getJob(jobId);
      
      if (job) {
        const state = await job.getState();
        const progress = job.progress();
        const result = job.returnvalue;
        const failedReason = job.failedReason;
        
        return {
          id: jobId,
          status: this.mapBullStateToStatus(state),
          progress: progress || 0,
          result: result,
          error: failedReason,
          startedAt: job.processedOn ? new Date(job.processedOn) : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn) : null
        };
      }
    } else {
      return this.loadJobFromFile(jobId);
    }
    
    return null;
  }

  async getAllJobs(userId = null) {
    if (this.useRedis) {
      const migrationQueue = this.queues.get('migration');
      const jobs = await migrationQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
      
      return jobs.map(job => ({
        id: job.id,
        status: this.mapBullStateToStatus(await job.getState()),
        progress: job.progress() || 0,
        userId: job.data.userId,
        createdAt: job.timestamp ? new Date(job.timestamp) : null,
        startedAt: job.processedOn ? new Date(job.processedOn) : null,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : null
      }));
    } else {
      return this.loadAllJobsFromFiles(userId);
    }
  }

  async cancelJob(jobId) {
    if (this.useRedis) {
      const migrationQueue = this.queues.get('migration');
      const job = await migrationQueue.getJob(jobId);
      
      if (job) {
        await job.remove();
        logger.info('Job cancelled from Redis queue', { jobId });
        return true;
      }
    } else {
      return this.cancelJobFromFile(jobId);
    }
    
    return false;
  }

  async updateJobProgress(jobId, progress, details = {}) {
    if (this.useRedis) {
      const migrationQueue = this.queues.get('migration');
      const job = await migrationQueue.getJob(jobId);
      
      if (job) {
        await job.progress(progress);
        
        // Add progress update to progress queue
        const progressQueue = this.queues.get('progress');
        await progressQueue.add('progress-update', {
          jobId,
          progress,
          timestamp: new Date().toISOString(),
          ...details
        });
      }
    } else {
      this.updateJobProgressInFile(jobId, progress, details);
    }
  }

  // File-based storage methods (fallback)
  saveJobToFile(jobData) {
    const filePath = path.join(this.fileStoragePath, `${jobData.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(jobData, null, 2));
  }

  loadJobFromFile(jobId) {
    const filePath = path.join(this.fileStoragePath, `${jobId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to load job from file', { jobId, error: error.message });
      return null;
    }
  }

  loadAllJobsFromFiles(userId = null) {
    const jobs = [];
    
    try {
      const files = fs.readdirSync(this.fileStoragePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const jobId = file.replace('.json', '');
          const job = this.loadJobFromFile(jobId);
          
          if (job && (!userId || job.userId === userId)) {
            jobs.push(job);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load jobs from files', { error: error.message });
    }
    
    return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  updateJobStatus(jobId, status, result = null) {
    const job = this.loadJobFromFile(jobId);
    if (job) {
      job.status = status;
      job.result = result;
      
      if (status === JOB_STATUS.RUNNING && !job.startedAt) {
        job.startedAt = new Date().toISOString();
      } else if (status === JOB_STATUS.COMPLETED || status === JOB_STATUS.FAILED) {
        job.completedAt = new Date().toISOString();
      }
      
      this.saveJobToFile(job);
    }
  }

  updateJobProgressInFile(jobId, progress, details = {}) {
    const job = this.loadJobFromFile(jobId);
    if (job) {
      job.progress = progress;
      job.lastProgressUpdate = new Date().toISOString();
      job.progressDetails = details;
      this.saveJobToFile(job);
    }
  }

  cancelJobFromFile(jobId) {
    const job = this.loadJobFromFile(jobId);
    if (job && job.status === JOB_STATUS.PENDING) {
      job.status = JOB_STATUS.CANCELLED;
      job.completedAt = new Date().toISOString();
      this.saveJobToFile(job);
      return true;
    }
    return false;
  }

  mapBullStateToStatus(bullState) {
    const stateMap = {
      'active': JOB_STATUS.RUNNING,
      'waiting': JOB_STATUS.PENDING,
      'completed': JOB_STATUS.COMPLETED,
      'failed': JOB_STATUS.FAILED,
      'delayed': JOB_STATUS.PENDING,
      'paused': JOB_STATUS.PAUSED
    };
    return stateMap[bullState] || JOB_STATUS.PENDING;
  }

  async isUserMigrationRunning(userId) {
    const jobs = await this.getAllJobs(userId);
    return jobs.some(job => job.status === JOB_STATUS.RUNNING);
  }

  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}

// Create singleton instance
const jobQueueService = new JobQueueService();

module.exports = {
  jobQueueService,
  JOB_STATUS,
  JOB_TYPES
};





