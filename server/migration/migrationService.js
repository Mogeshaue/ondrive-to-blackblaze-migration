const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { getValidAccessTokenWithRefresh, loadTokens } = require('../services/tokenStorage');

// Jobs storage
const jobs = new Map(); // manifestId -> { status, startedAt, logFile, process }

// Check if user has admin approval for OneDrive access
async function checkOneDriveApproval(userId) {
  console.log(`🔍 Checking OneDrive approval for user: ${userId}`);
  
  try {
    const accessToken = await getValidAccessTokenWithRefresh(userId);
    
    // Test OneDrive access via Microsoft Graph API
    const response = await axios.get('https://graph.microsoft.com/v1.0/me/drive', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ OneDrive access approved for user: ${userId}`);
    return { approved: true, driveId: response.data.id };
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log(`❌ OneDrive access denied for user: ${userId} - Admin approval required`);
      return { approved: false, error: 'Admin approval required for OneDrive access' };
    }
    
    console.error(`❌ Error checking OneDrive approval:`, error.message);
    throw new Error(`Failed to check OneDrive approval: ${error.message}`);
  }
}

// Validate and refresh token before migration
async function validateTokenForMigration(userId) {
  console.log(`🔐 Validating token for migration - user: ${userId}`);
  
  try {
    const tokens = loadTokens();
    const tokenData = tokens[userId];
    
    if (!tokenData) {
      throw new Error(`No token data found for user ${userId}`);
    }
    
    // Check if token is expired or will expire soon (within 5 minutes)
    const expiresAt = new Date(tokenData.expiresAt);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    if (expiresAt <= fiveMinutesFromNow) {
      console.log(`🔄 Token expires soon, refreshing...`);
      await getValidAccessTokenWithRefresh(userId);
    }
    
    console.log(`✅ Token validated for migration`);
    return true;
    
  } catch (error) {
    console.error(`❌ Token validation failed:`, error.message);
    throw error;
  }
}

// Ensure rclone remotes are properly configured
async function ensureRcloneRemotes(userId) {
  console.log(`🔧 Ensuring rclone remotes for user: ${userId}`);
  
  try {
    const configPath = path.join(__dirname, '../data/rclone.conf');
    
    if (!fs.existsSync(configPath)) {
      throw new Error('Rclone config file not found');
    }
    
    // Get current valid access token
    const accessToken = await getValidAccessTokenWithRefresh(userId);
    
    // Read existing config
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update the OneDrive token with the current valid token
    // We need to construct the full token object that rclone expects
    const tokens = loadTokens();
    const tokenData = tokens[userId];
    
    if (tokenData) {
      const tokenObject = {
        access_token: accessToken,
        token_type: "Bearer",
        refresh_token: tokenData.refreshToken,
        expiry: tokenData.expiresAt
      };
      
      const tokenRegex = /token = \{.*?\}/s;
      const newToken = `token = ${JSON.stringify(tokenObject)}`;
      
      if (tokenRegex.test(configContent)) {
        configContent = configContent.replace(tokenRegex, newToken);
        fs.writeFileSync(configPath, configContent);
        console.log(`✅ Updated rclone config with fresh token`);
      } else {
        console.log(`⚠️ Could not find token in rclone config to update`);
      }
    } else {
      console.log(`⚠️ No token data found for user ${userId}`);
    }
    
    // Check if OneDrive remote exists
    if (!configContent.includes('[onedrive]')) {
      throw new Error('OneDrive remote not found in rclone config');
    }
    
    // Check if B2 remote exists
    if (!configContent.includes('[b2]')) {
      throw new Error('B2 remote not found in rclone config');
    }
    
    console.log(`✅ Rclone remotes configured`);
    return {
      onedriveRemote: 'onedrive',
      b2Remote: 'b2',
      configPath: configPath
    };
    
  } catch (error) {
    console.error(`❌ Rclone remote configuration failed:`, error.message);
    throw error;
  }
}

// Start migration job with comprehensive error handling
async function startMigration(userId, items, dstPrefix = '') {
  console.log(`🚀 Starting migration for user: ${userId}`);
  console.log(`   Items: ${items.length}`);
  console.log(`   Destination prefix: ${dstPrefix || userId}`);
  
  if (!items || items.length === 0) {
    throw new Error('No items to migrate');
  }
  
  // Create manifest ID (idempotent)
  const manifestId = crypto.createHash('sha1')
    .update(userId + JSON.stringify(items) + (dstPrefix || ''))
    .digest('hex');
  
  console.log(`   Manifest ID: ${manifestId}`);
  
  // Check if job is already running
  const existingJob = jobs.get(manifestId);
  if (existingJob && existingJob.status === 'running') {
    console.log(`⚠️ Job already running for manifest: ${manifestId}`);
    return { manifestId, status: 'already_running' };
  }
  
  try {
    // Step 1: Validate token
    await validateTokenForMigration(userId);
    
    // Step 2: Check OneDrive approval
    const approvalCheck = await checkOneDriveApproval(userId);
    if (!approvalCheck.approved) {
      throw new Error(approvalCheck.error);
    }
    
    // Step 3: Ensure rclone remotes
    const remotes = await ensureRcloneRemotes(userId);
    
    // Step 4: Create manifest file
    const manifestFile = path.join(__dirname, `${manifestId}.txt`);
    fs.writeFileSync(manifestFile, items.join('\n'));
    console.log(`   Manifest file: ${manifestFile}`);
    
    // Step 5: Create log file
    const logFile = path.join(__dirname, '../logs', `${manifestId}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Step 6: Build destination
    const bucketName = process.env.B2_BUCKET_NAME || 'onedrive-migrations';
    const dst = `${remotes.b2Remote}:${bucketName}/${dstPrefix || userId}`;
    
    // Step 7: Rclone arguments
    const args = [
      'copy',
      `${remotes.onedriveRemote}:`,
      dst,
      '--files-from', manifestFile,
      '--progress',
      '--transfers', '8',
      '--checkers', '8',
      '--retries', '3',
      '--low-level-retries', '5',
      '--stats', '1s',
      '--buffer-size', '16M',
      '--config', remotes.configPath
    ];
    
    console.log(`   Rclone command: rclone ${args.join(' ')}`);
    
    // Step 8: Start rclone process
    const rclonePath = process.env.RCLONE_PATH || 'rclone';
    const child = spawn(rclonePath, args, { 
      env: { ...process.env, RCLONE_CONFIG: remotes.configPath },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Step 9: Store job info
    jobs.set(manifestId, { 
      status: 'running', 
      startedAt: new Date(), 
      logFile,
      process: child,
      manifestFile,
      userId,
      items: items.length,
      destination: dst
    });
    
    // Step 10: Handle stdout
    child.stdout.on('data', (data) => {
      const output = data.toString();
      try {
        logStream.write(output);
      } catch (streamError) {
        console.error(`[${manifestId}] Stream write error:`, streamError.message);
      }
      console.log(`[${manifestId}] ${output.trim()}`);
    });
    
    // Step 11: Handle stderr
    child.stderr.on('data', (data) => {
      const output = data.toString();
      try {
        logStream.write(output);
      } catch (streamError) {
        console.error(`[${manifestId}] Stream write error:`, streamError.message);
      }
      console.log(`[${manifestId}] ERROR: ${output.trim()}`);
    });
    
    // Step 12: Handle process close
    child.on('close', (code) => {
      try {
        logStream.write(`\nEXIT ${code}\n`);
        logStream.end();
      } catch (streamError) {
        console.error(`[${manifestId}] Stream write error:`, streamError.message);
      }
      
      const job = jobs.get(manifestId);
      if (job) {
        job.status = code === 0 ? 'completed' : 'failed';
        job.finishedAt = new Date();
        job.exitCode = code;
        delete job.process; // Remove process reference
        
        // Clean up manifest file
        try {
          fs.unlinkSync(job.manifestFile);
        } catch (e) {
          console.error(`Failed to delete manifest file: ${e.message}`);
        }
      }
      
      console.log(`[${manifestId}] Process finished with code: ${code}`);
    });
    
    // Step 13: Handle process error
    child.on('error', (error) => {
      try {
        logStream.write(`\nPROCESS ERROR: ${error.message}\n`);
        logStream.end();
      } catch (streamError) {
        console.error(`[${manifestId}] Stream write error:`, streamError.message);
      }
      
      const job = jobs.get(manifestId);
      if (job) {
        job.status = 'failed';
        job.finishedAt = new Date();
        job.error = error.message;
        delete job.process;
      }
      
      console.error(`[${manifestId}] Process error:`, error.message);
    });
    
    console.log(`✅ Migration started successfully for manifest: ${manifestId}`);
    return { manifestId, status: 'started' };
    
  } catch (error) {
    console.error(`❌ Failed to start migration:`, error.message);
    throw error;
  }
}

// Get job status
function getJobStatus(manifestId) {
  return jobs.get(manifestId) || null;
}

// Get all jobs
function getAllJobs() {
  return Array.from(jobs.entries()).map(([id, job]) => ({
    manifestId: id,
    ...job
  }));
}

// Stop job
function stopJob(manifestId) {
  const job = jobs.get(manifestId);
  if (job && job.process) {
    job.process.kill('SIGTERM');
    job.status = 'stopped';
    job.finishedAt = new Date();
    console.log(`[${manifestId}] Job stopped`);
    return true;
  }
  return false;
}

// Get job logs
function getJobLogs(manifestId) {
  const job = jobs.get(manifestId);
  if (!job || !job.logFile) {
    return null;
  }
  
  try {
    return fs.readFileSync(job.logFile, 'utf8');
  } catch (error) {
    console.error(`Failed to read log file: ${error.message}`);
    return null;
  }
}

// Test OneDrive connection
async function testOneDriveConnection(userId) {
  console.log(`🧪 Testing OneDrive connection for user: ${userId}`);
  
  try {
    // Validate token
    await validateTokenForMigration(userId);
    
    // Check approval
    const approvalCheck = await checkOneDriveApproval(userId);
    if (!approvalCheck.approved) {
      return { success: false, error: approvalCheck.error };
    }
    
    // Test rclone access
    const remotes = await ensureRcloneRemotes(userId);
    const rclonePath = process.env.RCLONE_PATH || 'rclone';
    
    const testOutput = require('child_process').execSync(
      `"${rclonePath}" lsd "${remotes.onedriveRemote}:" --config "${remotes.configPath}"`,
      { stdio: 'pipe' }
    );
    
    console.log(`✅ OneDrive connection test passed`);
    return { success: true, output: testOutput.toString() };
    
  } catch (error) {
    console.error(`❌ OneDrive connection test failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Test B2 connection
async function testB2Connection() {
  console.log(`🧪 Testing B2 connection`);
  
  try {
    const configPath = path.join(__dirname, '../data/rclone.conf');
    const rclonePath = process.env.RCLONE_PATH || 'rclone';
    
    const testOutput = require('child_process').execSync(
      `"${rclonePath}" lsd "b2:" --config "${configPath}"`,
      { stdio: 'pipe' }
    );
    
    console.log(`✅ B2 connection test passed`);
    return { success: true, output: testOutput.toString() };
    
  } catch (error) {
    console.error(`❌ B2 connection test failed:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  startMigration,
  getJobStatus,
  getAllJobs,
  stopJob,
  getJobLogs,
  testOneDriveConnection,
  testB2Connection,
  checkOneDriveApproval,
  validateTokenForMigration,
  ensureRcloneRemotes
};


