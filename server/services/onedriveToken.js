const crypto = require('crypto');

// Simple in-memory token storage with persistence
const userTokens = new Map();

// Store user token - simplified version
function storeUserToken(userId, accessToken, refreshToken, expiresAt) {
  console.log(`🔐 Storing tokens for user: ${userId}`);
  console.log(`   Access token length: ${accessToken ? accessToken.length : 0}`);
  console.log(`   Refresh token length: ${refreshToken ? refreshToken.length : 0}`);
  console.log(`   Expires at: ${new Date(expiresAt).toISOString()}`);
  
  const tokenData = {
    access_token: accessToken, // Store plain text for now
    refresh_token: refreshToken,
    expires_at: expiresAt
  };
  
  userTokens.set(userId, tokenData);
  console.log(`✅ Tokens stored successfully. Total users: ${userTokens.size}`);
  console.log(`   Current users: ${Array.from(userTokens.keys()).join(', ')}`);
}

// Get user token for rclone
function getUserToken(userId) {
  console.log(`🔍 Getting token for user: ${userId}`);
  console.log(`   Available users: ${Array.from(userTokens.keys()).join(', ')}`);
  
  const tokenData = userTokens.get(userId);
  if (!tokenData) {
    console.log(`❌ No token found for user: ${userId}`);
    throw new Error(`No token found for user: ${userId}`);
  }

  // Check if token is expired
  if (Date.now() >= tokenData.expires_at) {
    console.log(`❌ Token expired for user: ${userId}`);
    throw new Error('Token expired, needs refresh');
  }

  console.log(`✅ Token retrieved successfully for user: ${userId}`);
  return tokenData.access_token;
}

// Build rclone OneDrive source string with token
function buildOneDriveSource(userId) {
  try {
    console.log(`🔧 Building OneDrive source for user: ${userId}`);
    const accessToken = getUserToken(userId);
    
    // Build the token JSON that rclone expects
    const tokenJSON = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600
    };

    // Return the configless rclone source string
    const source = `:onedrive,client_id=${process.env.MS_CLIENT_ID},client_secret=${process.env.MS_CLIENT_SECRET},token=${JSON.stringify(tokenJSON)}:`;
    console.log(`✅ OneDrive source built successfully: ${source.substring(0, 50)}...`);
    return source;
  } catch (error) {
    console.error(`❌ Failed to build OneDrive source: ${error.message}`);
    throw new Error(`Failed to build OneDrive source: ${error.message}`);
  }
}

// Get all stored users (for debugging)
function getAllUsers() {
  return Array.from(userTokens.keys());
}

// Clear all tokens (for testing)
function clearAllTokens() {
  userTokens.clear();
  console.log('🧹 All tokens cleared');
}

module.exports = {
  storeUserToken,
  getUserToken,
  buildOneDriveSource,
  userTokens,
  getAllUsers,
  clearAllTokens
};
