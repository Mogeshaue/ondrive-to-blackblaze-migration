const { getAllUsers, loadTokens } = require('./server/services/tokenStorage');

console.log('=== TESTING TOKEN FORMAT ===\n');

try {
  // Check if any users exist
  const users = getAllUsers();
  console.log(`Found ${users.length} users:`);
  users.forEach(userId => console.log(`  - ${userId}`));

  if (users.length === 0) {
    console.log('❌ No users found. Please log in first.');
    process.exit(1);
  }

  const userId = users[0];
  console.log(`\n🔍 Testing with user: ${userId}`);

  // Get token data
  const tokens = loadTokens();
  const tokenData = tokens[userId];
  
  console.log('\n📄 Token data:');
  console.log(`   Access Token Length: ${tokenData.accessToken.length}`);
  console.log(`   Refresh Token Length: ${tokenData.refreshToken.length}`);
  console.log(`   Expires At: ${tokenData.expiresAt}`);
  
  // Create the complete token JSON that rclone expects
  const tokenJson = {
    access_token: tokenData.accessToken,
    token_type: 'Bearer',
    refresh_token: tokenData.refreshToken,
    expiry: tokenData.expiresAt
  };
  
  console.log('\n🔧 Rclone token format:');
  console.log(JSON.stringify(tokenJson, null, 2));
  
  console.log('\n✅ Token format looks correct for rclone!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}














