const axios = require('axios');

console.log('=== SERVER ERROR DEBUG ===\n');

async function testServerError() {
  try {
    // Test the OneDrive API endpoint and capture the full error
    console.log('🔍 Testing OneDrive API endpoint...');
    try {
      const response = await axios.get('http://localhost:3000/api/onedrive/list?path=%2Fdrive%2Froot:%2FAttachments');
      console.log('✅ OneDrive API working');
      console.log(`   Found ${response.data.items.length} items`);
    } catch (error) {
      console.log('❌ OneDrive API error:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
      if (error.message) {
        console.log('   Error message:', error.message);
      }
    }
    
    // Test migration status endpoint
    console.log('\n🔍 Testing migration status endpoint...');
    try {
      const response = await axios.get('http://localhost:3000/api/migrate/test/status');
      console.log('✅ Migration status working');
    } catch (error) {
      console.log('❌ Migration status error:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testServerError();








