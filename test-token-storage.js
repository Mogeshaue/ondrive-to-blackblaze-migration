const { userTokens, storeUserToken, getUserToken } = require('./server/services/onedriveToken');

console.log('=== Token Storage Test ===');

// Test 1: Check current state
console.log('\n1. Current token storage state:');
console.log('userTokens size:', userTokens.size);
console.log('userTokens keys:', Array.from(userTokens.keys()));

// Test 2: Try to store a test token
console.log('\n2. Testing token storage...');
try {
  const testUserId = 'test-user-123';
  const testAccessToken = 'test-access-token-123';
  const testRefreshToken = 'test-refresh-token-123';
  const testExpiresAt = Date.now() + (3600 * 1000); // 1 hour from now
  
  storeUserToken(testUserId, testAccessToken, testRefreshToken, testExpiresAt);
  console.log('✅ Test token stored successfully');
  
  // Check if it was stored
  console.log('userTokens size after storage:', userTokens.size);
  console.log('userTokens keys after storage:', Array.from(userTokens.keys()));
  
  // Test retrieval
  const retrievedToken = getUserToken(testUserId);
  console.log('✅ Token retrieved successfully:', retrievedToken.substring(0, 20) + '...');
  
} catch (error) {
  console.log('❌ Token storage test failed:', error.message);
}

// Test 3: Check if tokens persist across module reloads
console.log('\n3. Testing module persistence...');
try {
  // Clear the module cache to simulate a fresh load
  delete require.cache[require.resolve('./server/services/onedriveToken')];
  
  // Reload the module
  const { userTokens: newUserTokens } = require('./server/services/onedriveToken');
  console.log('userTokens after module reload:', newUserTokens.size);
  
  if (newUserTokens.size === 0) {
    console.log('⚠️ Tokens are lost after module reload - this is expected for in-memory storage');
    console.log('In production, use a database or persistent storage');
  }
  
} catch (error) {
  console.log('❌ Module reload test failed:', error.message);
}

console.log('\n=== Token Storage Test Complete ===');
console.log('\nNext steps:');
console.log('1. If token storage works, the issue is in the OAuth callback');
console.log('2. If token storage fails, we need to fix the storage mechanism');
console.log('3. Check the server logs during login to see if tokens are being stored');










