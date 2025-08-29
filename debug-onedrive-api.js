const { getAllUsers, getValidAccessTokenWithRefresh } = require('./server/services/tokenStorage');
const axios = require('axios');

console.log('=== ONEDRIVE API DEBUG ===\n');

async function debugOneDriveAPI() {
  try {
    // Check if users exist
    const users = getAllUsers();
    console.log(`🔍 Found ${users.length} users with tokens`);
    
    if (users.length === 0) {
      console.log('❌ No users found. Please log in first.');
      return;
    }
    
    const userId = users[0];
    console.log(`🔍 Testing with user: ${userId}`);
    
    // Test token retrieval
    console.log('\n🔍 STEP 1: Testing token retrieval...');
    try {
      const accessToken = await getValidAccessTokenWithRefresh(userId);
      if (accessToken) {
        console.log('✅ Access token retrieved successfully');
        console.log(`   Token preview: ${accessToken.substring(0, 20)}...`);
      } else {
        console.log('❌ Failed to get access token');
        return;
      }
    } catch (error) {
      console.log('❌ Token retrieval error:', error.message);
      return;
    }
    
    // Test OneDrive API directly
    console.log('\n🔍 STEP 2: Testing OneDrive API...');
    try {
      const accessToken = await getValidAccessTokenWithRefresh(userId);
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('✅ OneDrive API call successful');
      console.log(`   Found ${response.data.value.length} items`);
      
      // Show first few items
      response.data.value.slice(0, 3).forEach(item => {
        console.log(`   - ${item.name} (${item.folder ? 'folder' : 'file'})`);
      });
      
    } catch (error) {
      console.log('❌ OneDrive API error:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Test our server endpoint
    console.log('\n🔍 STEP 3: Testing our server endpoint...');
    try {
      const response = await axios.get('http://localhost:3000/api/onedrive/list');
      console.log('✅ Server endpoint working');
      console.log(`   Found ${response.data.items.length} items`);
    } catch (error) {
      console.log('❌ Server endpoint error:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugOneDriveAPI();
