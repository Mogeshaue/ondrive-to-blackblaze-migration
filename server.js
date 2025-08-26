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

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
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
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// In-memory storage for jobs (in production, use Redis or database)
const jobs = new Map();
const userTokens = new Map();

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

// Microsoft OAuth endpoints
app.get('/api/auth/login', (req, res) => {
  const authUrl = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${process.env.MS_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3000/auth/microsoft/callback')}&` +
    `scope=${encodeURIComponent('offline_access Files.Read.All')}&` +
    `response_mode=query`;
  
  res.json({ authUrl });
});

app.get('/auth/microsoft/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('OAuth error:', error);
    return res.redirect('/login?error=oauth_error');
  }
  
  if (!code) {
    return res.redirect('/login?error=no_code');
  }

  try {
    console.log('Exchanging code for tokens...');
    
    // Exchange code for tokens
    const tokenResponse = await axios.post(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      code,
      redirect_uri: 'http://localhost:3000/auth/microsoft/callback',
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

    // Store in memory for quick access
    userTokens.set(user.id, {
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: Date.now() + (expires_in * 1000)
    });

    console.log('Authentication successful, redirecting to dashboard');
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.redirect('/login?error=auth_failed');
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.session.user);
});

app.get('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
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
    
    return access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

// Get valid access token
const getValidAccessToken = async (userId) => {
  const userTokenData = userTokens.get(userId);
  if (!userTokenData) return null;

  if (Date.now() >= userTokenData.expires_at) {
    return await refreshAccessToken(userId);
  }

  return decryptToken(userTokenData.access_token);
};

// OneDrive API endpoints
app.get('/api/onedrive/list', requireAuth, async (req, res) => {
  try {
    const { path = '/' } = req.query;
    const accessToken = await getValidAccessToken(req.session.user.id);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    // Fix the OneDrive API URL - use correct format
    const apiUrl = path === '/' 
      ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
      : `https://graph.microsoft.com/v1.0/me/drive/root:${path}:/children`;
    
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
    const accessToken = await getValidAccessToken(req.session.user.id);
    
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
    
    if (!selectedItems || selectedItems.length === 0) {
      return res.status(400).json({ error: 'No items selected for migration' });
    }

    const jobId = crypto.randomUUID();
    const job = {
      id: jobId,
      userId,
      userEmail,
      selectedItems,
      status: 'starting',
      progress: 0,
      startTime: new Date(),
      logs: []
    };

    jobs.set(jobId, job);

    // Start migration process
    startMigration(jobId, selectedItems, emailPrefix);

    res.json({ jobId, message: 'Migration started' });
  } catch (error) {
    console.error('Migration start error:', error);
    res.status(500).json({ error: 'Failed to start migration' });
  }
});

app.get('/api/migrate/:jobId/status', requireAuth, (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    startTime: job.startTime,
    endTime: job.endTime,
    logs: job.logs.slice(-50) // Last 50 logs
  });
});

app.get('/api/migrate/:jobId/report', requireAuth, (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    startTime: job.startTime,
    endTime: job.endTime,
    selectedItems: job.selectedItems,
    results: job.results || [],
    logs: job.logs
  });
});

// Migration process
const startMigration = async (jobId, selectedItems, emailPrefix) => {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    job.logs.push(`Starting migration for ${selectedItems.length} items`);
    
    // Create manifest file
    const manifestPath = `/tmp/manifest_${jobId}.txt`;
    const manifestContent = selectedItems.map(item => item.path).join('\n');
    require('fs').writeFileSync(manifestPath, manifestContent);
    
    job.logs.push('Created manifest file with selected items');
    
    // Rclone command
    const rclonePath = process.env.RCLONE_PATH || 'rclone';
    const source = 'onedrive:/';
    const destination = `b2:${process.env.B2_BUCKET_NAME}/users/${emailPrefix}/`;
    
    const args = [
      'copy',
      '--files-from', manifestPath,
      '--transfers', '4',
      '--checkers', '8',
      '--progress',
      '--stats', '1s',
      source,
      destination
    ];

    job.logs.push(`Executing: ${rclonePath} ${args.join(' ')}`);
    
    const rcloneProcess = spawn(rclonePath, args);
    
    rcloneProcess.stdout.on('data', (data) => {
      const output = data.toString();
      job.logs.push(output.trim());
      
      // Parse progress
      const progressMatch = output.match(/(\d+%)/);
      if (progressMatch) {
        job.progress = parseInt(progressMatch[1]);
      }
      
      // Emit to connected clients
      io.to(`jobs/${jobId}`).emit('log', { jobId, message: output.trim() });
      io.to(`jobs/${jobId}`).emit('progress', { jobId, progress: job.progress });
    });

    rcloneProcess.stderr.on('data', (data) => {
      const error = data.toString();
      job.logs.push(`ERROR: ${error.trim()}`);
      io.to(`jobs/${jobId}`).emit('log', { jobId, message: `ERROR: ${error.trim()}` });
    });

    rcloneProcess.on('close', (code) => {
      job.endTime = new Date();
      
      if (code === 0) {
        job.status = 'completed';
        job.progress = 100;
        job.logs.push('Migration completed successfully');
        io.to(`jobs/${jobId}`).emit('done', { jobId, status: 'completed' });
      } else {
        job.status = 'failed';
        job.logs.push(`Migration failed with code: ${code}`);
        io.to(`jobs/${jobId}`).emit('done', { jobId, status: 'failed', code });
      }
      
      // Clean up manifest file
      try {
        require('fs').unlinkSync(manifestPath);
      } catch (e) {
        console.error('Failed to delete manifest file:', e);
      }
    });

  } catch (error) {
    job.status = 'failed';
    job.logs.push(`Migration error: ${error.message}`);
    job.endTime = new Date();
    io.to(`jobs/${jobId}`).emit('done', { jobId, status: 'failed', error: error.message });
  }
};

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OAuth redirect URI: http://localhost:3000/auth/microsoft/callback`);
});
