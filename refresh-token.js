const { refreshUserToken, getAllUsers, loadTokens } = require('./server/services/tokenStorage');
const fs = require('fs');
const path = require('path');

console.log('=== REFRESHING TOKEN ===\n');

async function refreshToken() {
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
    console.log(`\n🔄 Refreshing token for user: ${userId}`);

    // Refresh the token
    const newAccessToken = await refreshUserToken(userId);
    console.log(`✅ Token refreshed successfully!`);

    // Get updated token data
    const tokens = loadTokens();
    const tokenData = tokens[userId];
    
    // Create the complete token JSON that rclone expects
    const tokenJson = {
      access_token: tokenData.accessToken,
      token_type: 'Bearer',
      refresh_token: tokenData.refreshToken,
      expiry: tokenData.expiresAt
    };
    
    // Update the rclone configuration
    const configPath = path.join(__dirname, 'rclone-fixed.conf');
    const configContent = `# Rclone configuration for OneDrive to B2 Migration
# Updated with proper token format

[onedrive]
type = onedrive
token = ${JSON.stringify(tokenJson)}
drive_type = personal
drive_id = me

[b2]
type = b2
account = 005a95b5368061c0000000002
key = K00502rApPuMbQmsZoF4MDx4oPVo9gw
hard_delete = false
versions = false
`;

    // Write updated config
    fs.writeFileSync(configPath, configContent);
    console.log(`✅ Updated rclone configuration: ${configPath}`);
    console.log(`   New expiry: ${tokenData.expiresAt}`);

    // Test the new configuration
    console.log(`\n🧪 Testing new configuration...`);
    const { execSync } = require('child_process');
    const output = execSync(`rclone lsd onedrive: --config "${configPath}"`, { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log(`✅ OneDrive test successful:`);
    console.log(output);

  } catch (error) {
    console.error('❌ Token refresh failed:', error.message);
  }
}

refreshToken();



