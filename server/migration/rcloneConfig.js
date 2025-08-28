const fs = require('fs');
const path = require('path');
const { getValidAccessTokenWithRefresh } = require('../services/tokenStorage');

const RCLONE_CONFIG_PATH = path.join(__dirname, '../data/rclone.conf');

// Ensure data directory exists
const dataDir = path.dirname(RCLONE_CONFIG_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Read INI file
function readIni(path) {
  try {
    if (fs.existsSync(path)) {
      const raw = fs.readFileSync(path, 'utf8');
      return parseIni(raw);
    }
  } catch (error) {
    console.error('Failed to read INI file:', error.message);
  }
  return {};
}

// Parse INI content
function parseIni(s) {
  const out = {};
  let cur = null;
  s.split(/\r?\n/).forEach(line => {
    if (line.match(/^\s*;/) || !line.trim()) return;
    const sec = line.match(/^\s*\[(.+?)\]\s*$/);
    if (sec) { 
      cur = sec[1]; 
      out[cur] = out[cur] || {}; 
      return; 
    }
    const kv = line.match(/^\s*([^=]+?)\s*=\s*(.*)\s*$/);
    if (kv && cur) out[cur][kv[1].trim()] = kv[2];
  });
  return out;
}

// Write INI file
function writeIni(path, obj) {
  let out = "";
  for (const [sec, kv] of Object.entries(obj)) {
    out += `[${sec}]\n`;
    for (const [k, v] of Object.entries(kv)) out += `${k} = ${v}\n`;
    out += `\n`;
  }
  fs.writeFileSync(path, out, { encoding: 'utf8', mode: 0o600 });
}

// Ensure remotes exist for a user
async function ensureRemotes(userId) {
  console.log(`🔧 Ensuring rclone remotes for user: ${userId}`);
  
  try {
    // Get valid access token with auto-refresh
    const accessToken = await getValidAccessTokenWithRefresh(userId);
    
    // Read existing config
    const cfg = readIni(RCLONE_CONFIG_PATH);
    
    // Create OneDrive remote for this user
    const onedriveRemote = `onedrive-${userId}`;
    
    // Get the complete token data from storage
    const tokens = require('../services/tokenStorage').loadTokens();
    const tokenData = tokens[userId];
    
    if (!tokenData) {
      throw new Error(`No token data found for user ${userId}`);
    }
    
    // Create the complete token JSON that rclone expects
    const tokenJson = {
      access_token: tokenData.accessToken,
      token_type: 'Bearer',
      refresh_token: tokenData.refreshToken,
      expiry: tokenData.expiresAt
    };
    
    cfg[onedriveRemote] = {
      type: 'onedrive',
      token: JSON.stringify(tokenJson),
      drive_type: 'personal',
      drive_id: 'me'
    };
    
    // Create B2 remote
    cfg['b2'] = {
      type: 'b2',
      account: process.env.B2_APPLICATION_KEY_ID || process.env.B2_KEY_ID,
      key: process.env.B2_APPLICATION_KEY || process.env.B2_APPLICATION_KEY_SECRET
    };
    
    // Write config
    writeIni(RCLONE_CONFIG_PATH, cfg);
    
    console.log(`✅ Rclone remotes configured successfully`);
    console.log(`   OneDrive remote: ${onedriveRemote}`);
    console.log(`   B2 remote: b2`);
    
    return { 
      onedriveRemote, 
      b2Remote: 'b2',
      configPath: RCLONE_CONFIG_PATH 
    };
    
  } catch (error) {
    console.error(`❌ Failed to ensure remotes for user ${userId}:`, error.message);
    throw error;
  }
}

// Test remotes
async function testRemotes(userId) {
  console.log(`🧪 Testing rclone remotes for user: ${userId}`);
  
  try {
    const { onedriveRemote, b2Remote } = await ensureRemotes(userId);
    const rclonePath = process.env.RCLONE_PATH || 'rclone';
    
    // Test OneDrive access
    console.log(`Testing OneDrive remote: ${onedriveRemote}`);
    const onedriveTest = require('child_process').execSync(
      `"${rclonePath}" lsd "${onedriveRemote}:" --config "${RCLONE_CONFIG_PATH}"`,
      { stdio: 'pipe' }
    );
    console.log(`✅ OneDrive test passed: ${onedriveTest.toString().trim()}`);
    
    // Test B2 access
    console.log(`Testing B2 remote: ${b2Remote}`);
    const b2Test = require('child_process').execSync(
      `"${rclonePath}" lsd "${b2Remote}:" --config "${RCLONE_CONFIG_PATH}"`,
      { stdio: 'pipe' }
    );
    console.log(`✅ B2 test passed: ${b2Test.toString().trim()}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Remote test failed:`, error.message);
    return false;
  }
}

module.exports = {
  ensureRemotes,
  testRemotes,
  RCLONE_CONFIG_PATH
};
