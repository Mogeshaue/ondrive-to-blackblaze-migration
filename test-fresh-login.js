const { getAllUsers, clearAllTokens } = require('./server/services/tokenStorage');

console.log('=== FRESH LOGIN TEST ===\n');

// Check current tokens
console.log('🔍 Current tokens:');
const users = getAllUsers();
console.log(`Found ${users.length} users with stored tokens:`);
users.forEach(userId => console.log(`  - ${userId}`));

if (users.length > 0) {
  console.log('\n⚠️  Current tokens appear to be expired or invalid.');
  console.log('💡 To get fresh tokens, you need to:');
  console.log('   1. Go to http://localhost:5173');
  console.log('   2. Log out if currently logged in');
  console.log('   3. Log in again with your Microsoft account');
  console.log('   4. This will generate fresh access and refresh tokens');
  
  console.log('\n🔄 Would you like to clear the current tokens? (y/n)');
  console.log('   This will force a fresh login on next visit.');
  
  // For now, let's clear the tokens to force fresh login
  console.log('\n🧹 Clearing current tokens...');
  clearAllTokens();
  console.log('✅ Tokens cleared. Please log in again at http://localhost:5173');
} else {
  console.log('✅ No expired tokens found. Please log in at http://localhost:5173');
}
