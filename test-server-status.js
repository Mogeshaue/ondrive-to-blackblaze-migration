const axios = require('axios');

console.log('=== SERVER STATUS TEST ===\n');

async function testServer() {
  try {
    // Test 1: Basic server response
    console.log('🔍 Testing basic server response...');
    const response = await axios.get('http://localhost:3000/');
    console.log('✅ Server is responding');
    
    // Test 2: Check if user is authenticated
    console.log('\n🔍 Testing authentication status...');
    try {
      const authResponse = await axios.get('http://localhost:3000/api/auth/me');
      console.log('✅ User is authenticated:', authResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️  User not authenticated (expected)');
      } else {
        console.log('❌ Auth check failed:', error.message);
      }
    }
    
    // Test 3: Test OneDrive API (should fail without auth)
    console.log('\n🔍 Testing OneDrive API...');
    try {
      const onedriveResponse = await axios.get('http://localhost:3000/api/onedrive/list');
      console.log('✅ OneDrive API working');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️  OneDrive API requires authentication (expected)');
      } else if (error.response?.status === 500) {
        console.log('❌ OneDrive API server error:', error.response.data);
      } else {
        console.log('❌ OneDrive API error:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Server test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running. Please start it with: node server.js');
    }
  }
}

testServer();





