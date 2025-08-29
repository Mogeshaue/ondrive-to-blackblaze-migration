const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();
const config = require('./config/configManager');
const { storeUserToken, getValidAccessToken, getValidAccessTokenWithRefresh, refreshUserToken } = require('./server/services/tokenStorage');
const { startMigration, getJobStatus, getAllJobs, stopJob, getJobLogs, testOneDriveConnection, testB2Connection, checkOneDriveApproval, validateTokenForMigration } = require('./server/migration/migrationService');
const tokenManager = require('./server/services/tokenManager');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.getCorsOrigin(),
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.getCorsOrigin(),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.isProduction(),
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// In-memory storage for jobs (in production, use Redis or database)
// Jobs are now managed by the migration service

// Utility functions
const encryptToken = (text) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.SESSION_SECRET || 'fallback', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decryptToken = (text) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.SESSION_SECRET || 'fallback', 'salt', 32);
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, null, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: config.getConfig().environment,
    version: '1.0.0'
  });
});

// Microsoft OAuth endpoints
app.get('/api/auth/login', (req, res) => {
  const authUrl = config.getMicrosoftAuthUrl();
  res.json({ authUrl });
});

app.get('/auth/microsoft/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('OAuth error:', error);
    return res.redirect('http://localhost:5173/login?error=oauth_error');
  }
  
      if (!code) {
      return res.redirect('http://localhost:5173/login?error=no_code');
    }

  try {
    console.log('Exchanging code for tokens...');
    
    // Exchange code for tokens
    const tokenResponse = await axios.post(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      code,
      redirect_uri: config.getRedirectUri(),
      grant_type: 'authorization_code'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    console.log('Tokens received successfully');

    // Get user info
    console.log('Getting user info...');
    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const user = userResponse.data;
    console.log('User info received:', user.displayName);
    
    // Store encrypted tokens
    const encryptedAccessToken = encryptToken(access_token);
    const encryptedRefreshToken = encryptToken(refresh_token);
    
    req.session.user = {
      id: user.id,
      email: user.mail || user.userPrincipalName,
      displayName: user.displayName
    };
    
    req.session.tokens = {
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: Date.now() + (expires_in * 1000)
    };

    // Store in memory for quick access (handled by OneDrive service)

    // Store tokens in our token storage service
    console.log('=== Token Storage Debug ===');
    console.log('User ID:', user.id);
    console.log('Access token length:', access_token.length);
    console.log('Refresh token length:', refresh_token.length);
    console.log('Expires in:', expires_in, 'seconds');
    
    try {
      storeUserToken(user.id, access_token, refresh_token, expires_in);
      console.log('✅ Tokens stored successfully');
    } catch (error) {
      console.error('❌ Failed to store tokens:', error.message);
    }

    // Update rclone.conf with the access token
    try {
      const fs = require('fs');
      const rcloneConfigPath = path.join(__dirname, 'rclone.conf');
      let configContent = fs.readFileSync(rcloneConfigPath, 'utf8');
      
      // Replace the placeholder token with the real access token
      configContent = configContent.replace(
        /token = your_oauth_token_here/,
        `token = ${access_token}`
      );
      
      fs.writeFileSync(rcloneConfigPath, configContent);
      console.log('Updated rclone.conf with access token');
      
      // Also update the user's rclone config
      const userRcloneConfigPath = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Roaming', 'rclone', 'rclone.conf');
      fs.writeFileSync(userRcloneConfigPath, configContent);
      console.log('Updated user rclone config with access token');
      
    } catch (error) {
      console.error('Failed to update rclone config:', error);
    }

    console.log('Authentication successful, redirecting to dashboard');
    res.redirect('http://localhost:5173/');
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.redirect('http://localhost:5173/login?error=auth_failed');
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.session.user);
});

app.get('/api/auth/logout', (req, res) => {
  // Clear user tokens from memory (handled by OneDrive service)
  
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    // Clear session cookie
    res.clearCookie('connect.sid');
    
    // Redirect to Microsoft logout URL to clear OAuth cache
    const msLogoutUrl = config.getMicrosoftLogoutUrl();
    res.redirect(msLogoutUrl);
  });
});

// Token refresh function
const refreshAccessToken = async (userId) => {
  const userTokenData = userTokens.get(userId);
  if (!userTokenData) return null;

  try {
    const refresh_token = decryptToken(userTokenData.refresh_token);
    
    const response = await axios.post(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, expires_in } = response.data;
    const encryptedAccessToken = encryptToken(access_token);
    
    userTokenData.access_token = encryptedAccessToken;
    userTokenData.expires_at = Date.now() + (expires_in * 1000);
    
    // Update rclone.conf with new access token
    try {
      const fs = require('fs');
      const rcloneConfigPath = path.join(__dirname, 'rclone.conf');
      let configContent = fs.readFileSync(rcloneConfigPath, 'utf8');
      
      // Replace the old token with the new access token
      configContent = configContent.replace(
        /token = [^\n]+/,
        `token = ${access_token}`
      );
      
      fs.writeFileSync(rcloneConfigPath, configContent);
      console.log('Updated rclone.conf with refreshed access token');
      
      // Also update the user's rclone config
      const userRcloneConfigPath = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Roaming', 'rclone', 'rclone.conf');
      fs.writeFileSync(userRcloneConfigPath, configContent);
      console.log('Updated user rclone config with refreshed access token');
      
    } catch (error) {
      console.error('Failed to update rclone config with refreshed token:', error);
    }
    
    return access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

// Get valid access token (wrapper for compatibility)
const getValidAccessTokenWrapper = async (userId) => {
  try {
    return getValidAccessTokenWithRefresh(userId);
  } catch (error) {
    console.error('Failed to get access token:', error.message);
    // Return null instead of throwing, so the API can handle it gracefully
    return null;
  }
};

// OneDrive API endpoints
app.get('/api/onedrive/list', requireAuth, async (req, res) => {
  try {
    const { path = '/' } = req.query;
    const accessToken = await getValidAccessTokenWrapper(req.session.user.id);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    // Fix the OneDrive API URL - use correct format
    let apiUrl;
    if (path === '/' || path === '/drive') {
      apiUrl = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
    } else {
      // Remove /drive/root: prefix if present and clean the path
      let cleanPath = path;
      if (cleanPath.startsWith('/drive/root:')) {
        cleanPath = cleanPath.substring('/drive/root:'.length);
      }
      // Remove leading slash if present
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }
      apiUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${cleanPath}:/children`;
    }
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const items = response.data.value.map(item => ({
      id: item.id,
      name: item.name,
      path: item.parentReference?.path ? `${item.parentReference.path}/${item.name}` : `/${item.name}`,
      type: item.folder ? 'folder' : 'file',
      size: item.size,
      lastModified: item.lastModifiedDateTime
    }));

    res.json({ items });
  } catch (error) {
    console.error('OneDrive list error:', error);
    res.status(500).json({ error: 'Failed to list OneDrive items' });
  }
});

app.get('/api/onedrive/search', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    const accessToken = await getValidAccessTokenWrapper(req.session.user.id);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/search(q='${encodeURIComponent(query)}')`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const items = response.data.value.map(item => ({
      id: item.id,
      name: item.name,
      path: item.parentReference?.path ? `${item.parentReference.path}/${item.name}` : `/${item.name}`,
      type: item.folder ? 'folder' : 'file',
      size: item.size,
      lastModified: item.lastModifiedDateTime
    }));

    res.json({ items });
  } catch (error) {
    console.error('OneDrive search error:', error);
    res.status(500).json({ error: 'Failed to search OneDrive items' });
  }
});

// Migration endpoints
app.post('/api/migrate', requireAuth, async (req, res) => {
  try {
    const { selectedItems } = req.body;
    const userId = req.session.user.id;
    const userEmail = req.session.user.email;
    const emailPrefix = userEmail.split('@')[0];
    
    console.log('Migration request received:', {
      userId,
      userEmail,
      emailPrefix,
      selectedItemsCount: selectedItems?.length
    });
    
    if (!selectedItems || selectedItems.length === 0) {
      return res.status(400).json({ error: 'No items selected for migration' });
    }

    // Extract file paths from selected items
    const filePaths = selectedItems.map(item => {
      let path = item.path;
      
      // Remove leading slash if present
      if (path.startsWith('/')) {
        path = path.substring(1);
      }
      
      // Remove /drive/root: prefix if present
      if (path.startsWith('drive/root:')) {
        path = path.substring('drive/root:'.length);
      }
      
      // Remove leading slash again if present
      if (path.startsWith('/')) {
        path = path.substring(1);
      }
      
      // Replace backslashes with forward slashes
      path = path.replace(/\\/g, '/');
      
      console.log(`Processing path: "${item.path}" -> "${path}"`);
      return path;
    });

    // Start migration using new service
    const result = await startMigration(userId, filePaths, emailPrefix);
    
    res.json({ 
      jobId: result.manifestId, 
      manifestId: result.manifestId,
      status: result.status,
      message: 'Migration started' 
    });
  } catch (error) {
    console.error('Migration start error:', error);
    res.status(500).json({ error: 'Failed to start migration: ' + error.message });
  }
});

// Job status endpoint
app.get('/api/migrate/:manifestId/status', requireAuth, (req, res) => {
  try {
    const { manifestId } = req.params;
    console.log(`🔍 Checking status for job: ${manifestId}`);
    
    const job = getJobStatus(manifestId);
    
    if (!job) {
      console.log(`❌ Job not found: ${manifestId}`);
      return res.status(404).json({ error: 'Job not found' });
    }
    
    console.log(`✅ Job found: ${manifestId} - Status: ${job.status}`);
    
    res.json({
      manifestId,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      exitCode: job.exitCode,
      error: job.error
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to get job status', details: error.message });
  }
});

// Job logs endpoint
app.get('/api/migrate/:manifestId/logs', requireAuth, (req, res) => {
  const { manifestId } = req.params;
  const logs = getJobLogs(manifestId);
  
  if (logs === null) {
    return res.status(404).json({ error: 'Logs not found' });
  }
  
  res.json({ logs });
});

// Stop job endpoint
app.post('/api/migrate/:manifestId/stop', requireAuth, (req, res) => {
  const { manifestId } = req.params;
  const stopped = stopJob(manifestId);
  
  if (stopped) {
    res.json({ message: 'Job stopped successfully' });
  } else {
    res.status(404).json({ error: 'Job not found or already stopped' });
  }
});

// Report endpoint (simplified for now)
app.get('/api/migrate/:manifestId/report', requireAuth, (req, res) => {
  const { manifestId } = req.params;
  const job = getJobStatus(manifestId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    manifestId,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    exitCode: job.exitCode,
    error: job.error
  });
});

// Test OneDrive connection endpoint
app.post('/api/test/onedrive', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await testOneDriveConnection(userId);
    res.json(result);
  } catch (error) {
    console.error('OneDrive connection test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test B2 connection endpoint
app.post('/api/test/b2', requireAuth, async (req, res) => {
  try {
    const result = await testB2Connection();
    res.json(result);
  } catch (error) {
    console.error('B2 connection test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check OneDrive approval endpoint
app.post('/api/test/approval', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await checkOneDriveApproval(userId);
    res.json(result);
  } catch (error) {
    console.error('Approval check failed:', error);
    res.status(500).json({ approved: false, error: error.message });
  }
});

// Validate token endpoint
app.post('/api/test/token', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    await validateTokenForMigration(userId);
    res.json({ success: true, message: 'Token is valid' });
  } catch (error) {
    console.error('Token validation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verification endpoint (simplified for now)
app.post('/api/migrate/:manifestId/verify', requireAuth, async (req, res) => {
  const { manifestId } = req.params;
  const job = getJobStatus(manifestId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Migration must be completed before verification' });
  }

  res.json({ 
    success: true, 
    message: 'Verification endpoint - to be implemented with new rclone config' 
  });
});

// Migration process is now handled by the migration service

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-job', (jobId) => {
    socket.join(`jobs/${jobId}`);
    console.log(`Client ${socket.id} joined job ${jobId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start the token manager service
  console.log('🔧 Starting Token Manager Service...');
  tokenManager.start();
  
  console.log('✅ OneDrive to B2 Migration Server is ready!');
  console.log(`   - Frontend: http://localhost:5173`);
  console.log(`   - Backend: http://localhost:${PORT}`);
  console.log(`   - Token Manager: Active`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  tokenManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  tokenManager.stop();
  process.exit(0);
});
