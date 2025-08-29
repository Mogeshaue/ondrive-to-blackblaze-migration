const { getAllUsers, storeUserToken } = require('./server/services/onedriveToken');

console.log('=== LOGIN FLOW TEST ===');
console.log('This will test if the login process works correctly\n');

// Test 1: Check current state
console.log('🔍 STEP 1: Current state');
console.log('========================');
const currentUsers = getAllUsers();
console.log(`Current users: ${currentUsers.length}`);
console.log(`User IDs: ${currentUsers.join(', ') || 'None'}`);

// Test 2: Simulate a login (store test tokens)
console.log('\n🔍 STEP 2: Simulating login');
console.log('============================');
const testUserId = 'test-user-123';
const testAccessToken = 'test-access-token-123';
const testRefreshToken = 'test-refresh-token-123';
const testExpiresAt = Date.now() + (3600 * 1000); // 1 hour from now

try {
  storeUserToken(testUserId, testAccessToken, testRefreshToken, testExpiresAt);
  console.log('✅ Test login successful');
  
  // Verify storage
  const usersAfterLogin = getAllUsers();
  console.log(`Users after login: ${usersAfterLogin.length}`);
  console.log(`User IDs: ${usersAfterLogin.join(', ')}`);
  
} catch (error) {
  console.log(`❌ Test login failed: ${error.message}`);
}

// Test 3: Check if tokens persist
console.log('\n🔍 STEP 3: Token persistence test');
console.log('==================================');
const finalUsers = getAllUsers();
console.log(`Final user count: ${finalUsers.length}`);

if (finalUsers.length > 0) {
  console.log('✅ Token storage is working');
  console.log('💡 Now you can test the migration');
} else {
  console.log('❌ Token storage is not working');
  console.log('💡 This is why migration fails');
}

console.log('\n=== NEXT STEPS ===');
console.log('1. If token storage works: The issue is in the OAuth callback');
console.log('2. If token storage fails: We need to fix the storage mechanism');
console.log('3. Go to http://localhost:5173 and try to log in');
console.log('4. After login, run: node debug-migration.js');










