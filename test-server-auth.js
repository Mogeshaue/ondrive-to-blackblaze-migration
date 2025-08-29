const axios = require('axios');

console.log('=== SERVER AUTH TEST ===\n');

async function testServerAuth() {
  try {
    // Test 1: Check if server is responding
    console.log('🔍 STEP 1: Testing server response...');
    const response = await axios.get('http://localhost:3000/');
    console.log('✅ Server is responding');
    
    // Test 2: Test OneDrive API without authentication (should fail with 401)
    console.log('\n🔍 STEP 2: Testing OneDrive API without auth...');
    try {
      const onedriveResponse = await axios.get('http://localhost:3000/api/onedrive/list');
      console.log('❌ Unexpected success - should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly requires authentication (401)');
      } else if (error.response?.status === 500) {
        console.log('❌ Server error (500) - this is the problem!');
        console.log('   Error details:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.statusText);
      }
    }
    
    // Test 3: Test migration status endpoint
    console.log('\n🔍 STEP 3: Testing migration status endpoint...');
    try {
      const migrationResponse = await axios.get('http://localhost:3000/api/migrate/test/status');
      console.log('❌ Unexpected success - should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly requires authentication (401)');
      } else if (error.response?.status === 500) {
        console.log('❌ Server error (500) - this is the problem!');
        console.log('   Error details:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.statusText);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testServerAuth();








