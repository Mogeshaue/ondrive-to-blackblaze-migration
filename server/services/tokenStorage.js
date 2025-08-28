const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple file-based token storage (in production, use a database)
const TOKENS_FILE = path.join(__dirname, '../data/tokens.json');

// Ensure data directory exists
const dataDir = path.dirname(TOKENS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load tokens from file
function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load tokens:', error.message);
  }
  return {};
}

// Save tokens to file
function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Failed to save tokens:', error.message);
  }
}

// Store user token
function storeUserToken(userId, accessToken, refreshToken, expiresIn) {
  console.log(`🔐 Storing tokens for user: ${userId}`);
  
  const tokens = loadTokens();
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000); // minus 60s buffer
  
  tokens[userId] = {
    accessToken,
    refreshToken,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  saveTokens(tokens);
  console.log(`✅ Tokens stored successfully for user: ${userId}`);
  console.log(`   Expires at: ${expiresAt.toISOString()}`);
}

// Get valid access token
function getValidAccessToken(userId) {
  console.log(`🔍 Getting token for user: ${userId}`);
  
  const tokens = loadTokens();
  const tokenData = tokens[userId];
  
  if (!tokenData) {
    console.log(`❌ No tokens found for user: ${userId}`);
    throw new Error(`No tokens found for user: ${userId}`);
  }
  
  const expiresAt = new Date(tokenData.expiresAt);
  if (new Date() >= expiresAt) {
    console.log(`❌ Token expired for user: ${userId}`);
    throw new Error('Token expired, needs refresh');
  }
  
  console.log(`✅ Token retrieved successfully for user: ${userId}`);
  return tokenData.accessToken;
}

// Get valid access token with auto-refresh
async function getValidAccessTokenWithRefresh(userId) {
  try {
    return getValidAccessToken(userId);
  } catch (error) {
    if (error.message.includes('expired') || error.message.includes('needs refresh')) {
      console.log(`🔄 Auto-refreshing token for user: ${userId}`);
      return await refreshUserToken(userId);
    }
    throw error;
  }
}

// Refresh token
async function refreshUserToken(userId) {
  console.log(`🔄 Refreshing token for user: ${userId}`);
  
  const tokens = loadTokens();
  const tokenData = tokens[userId];
  
  if (!tokenData) {
    throw new Error(`No token data found for user: ${userId}`);
  }
  
  try {
    const axios = require('axios');
    const response = await axios.post(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET,
        refresh_token: tokenData.refreshToken,
        grant_type: 'refresh_token',
        redirect_uri: process.env.MS_REDIRECT_URI
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const { access_token, refresh_token, expires_in } = response.data;
    
    // Update tokens
    storeUserToken(userId, access_token, refresh_token || tokenData.refreshToken, expires_in);
    
    console.log(`✅ Token refreshed successfully for user: ${userId}`);
    return access_token;
  } catch (error) {
    console.error(`❌ Token refresh failed for user: ${userId}:`, error.message);
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

// Get all users
function getAllUsers() {
  const tokens = loadTokens();
  return Object.keys(tokens);
}

// Clear all tokens (for testing)
function clearAllTokens() {
  saveTokens({});
  console.log('🧹 All tokens cleared');
}

module.exports = {
  storeUserToken,
  getValidAccessToken,
  getValidAccessTokenWithRefresh,
  refreshUserToken,
  getAllUsers,
  clearAllTokens,
  loadTokens
};
