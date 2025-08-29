const fs = require('fs');
const path = require('path');
const { getValidAccessToken, getAllUsers } = require('./server/services/tokenStorage');

console.log('=== DEBUG RCLONE CONFIG ===\n');

async function debugRcloneConfig() {
  try {
    // Check if any users exist
    const users = getAllUsers();
    console.log(`Found ${users.length} users:`);
    users.forEach(userId => console.log(`  - ${userId}`));

    if (users.length === 0) {
      console.log('❌ No users found. Please log in first.');
      return;
    }

    const userId = users[0];
    console.log(`\n🔍 Testing with user: ${userId}`);

    // Get token
    const token = getValidAccessToken(userId);
    console.log(`✅ Token retrieved (length: ${token.length})`);

    // Get complete token data
    const tokens = require('./server/services/tokenStorage').loadTokens();
    const tokenData = tokens[userId];
    
    // Create the complete token JSON that rclone expects
    const tokenJson = {
      access_token: tokenData.accessToken,
      token_type: 'Bearer',
      refresh_token: tokenData.refreshToken,
      expiry: tokenData.expiresAt
    };
    
    // Create a simple rclone config manually
    const configPath = path.join(__dirname, 'server/data/rclone.conf');
    const configContent = `[onedrive-${userId}]
type = onedrive
token = ${JSON.stringify(tokenJson)}
drive_type = personal

[b2]
type = b2
account = ${process.env.B2_APPLICATION_KEY_ID || process.env.B2_KEY_ID || 'your-b2-key-id'}
key = ${process.env.B2_APPLICATION_KEY || process.env.B2_APPLICATION_KEY_SECRET || 'your-b2-application-key'}
`;

    // Write config
    fs.writeFileSync(configPath, configContent);
    console.log(`✅ Rclone config written to: ${configPath}`);
    console.log('\n📄 Config content:');
    console.log(configContent);

    // Test rclone command
    const rclonePath = process.env.RCLONE_PATH || 'rclone';
    console.log(`\n🧪 Testing rclone command:`);
    console.log(`Command: ${rclonePath} lsd "onedrive-${userId}:" --config "${configPath}"`);

    try {
      const { execSync } = require('child_process');
      const output = execSync(`"${rclonePath}" lsd "onedrive-${userId}:" --config "${configPath}"`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(`✅ OneDrive test successful:`);
      console.log(output);
    } catch (error) {
      console.log(`❌ OneDrive test failed:`);
      console.log(error.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRcloneConfig();
