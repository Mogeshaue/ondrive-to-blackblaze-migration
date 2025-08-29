const axios = require('axios');

console.log('=== SESSION DEBUG TEST ===\n');

async function testSession() {
  try {
    // Test 1: Check if we can get user info from the session
    console.log('🔍 STEP 1: Testing session authentication...');
    try {
      const response = await axios.get('http://localhost:3000/api/auth/me', {
        withCredentials: true // Include cookies
      });
      console.log('✅ Session authentication working');
      console.log('   User data:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Session not authenticated (401)');
        console.log('   This means the frontend needs to log in again');
      } else {
        console.log('❌ Session error:', error.response?.status, error.response?.statusText);
      }
    }
    
    // Test 2: Try to access OneDrive API with session
    console.log('\n🔍 STEP 2: Testing OneDrive API with session...');
    try {
      const response = await axios.get('http://localhost:3000/api/onedrive/list', {
        withCredentials: true // Include cookies
      });
      console.log('✅ OneDrive API working with session');
      console.log(`   Found ${response.data.items.length} items`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ OneDrive API requires authentication (401)');
      } else if (error.response?.status === 500) {
        console.log('❌ OneDrive API server error (500)');
        console.log('   Error details:', error.response.data);
      } else {
        console.log('❌ OneDrive API error:', error.response?.status, error.response?.statusText);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testSession();




