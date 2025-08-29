require('dotenv').config();
const axios = require('axios');

async function debugRefreshToken() {
  const tokens = require('./server/services/tokenStorage').loadTokens();
  const userId = 'e1c943b6-11ac-4425-a9f2-f24ee05854f5';
  const tokenData = tokens[userId];
  
  if (!tokenData) {
    console.log('❌ No token data found');
    return;
  }
  
  console.log('🔍 Debugging refresh token request...');
  console.log('User ID:', userId);
  console.log('Refresh Token (first 50 chars):', tokenData.refreshToken.substring(0, 50) + '...');
  console.log('Client ID:', process.env.MS_CLIENT_ID);
  console.log('Client Secret (first 10 chars):', process.env.MS_CLIENT_SECRET?.substring(0, 10) + '...');
  console.log('Redirect URI:', process.env.MS_REDIRECT_URI);
  
  const requestData = {
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    refresh_token: tokenData.refreshToken,
    grant_type: 'refresh_token',
    redirect_uri: process.env.MS_REDIRECT_URI
  };
  
  console.log('\n📤 Request data:');
  console.log(JSON.stringify(requestData, null, 2));
  
  try {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams(requestData).toString(),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        }
      }
    );
    
    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ Error details:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Error Message:', error.message);
  }
}

debugRefreshToken();









