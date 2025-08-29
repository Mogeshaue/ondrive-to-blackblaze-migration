const { getAllUsers } = require('./server/services/tokenStorage');

console.log('=== COMPLETE FLOW TEST ===\n');

// Check if users are logged in
console.log('🔍 STEP 1: Checking for logged-in users');
console.log('=====================================');
const users = getAllUsers();
console.log(`Found ${users.length} users with stored tokens:`);
users.forEach(userId => console.log(`  - ${userId}`));

if (users.length === 0) {
  console.log('\n❌ NO USERS FOUND!');
  console.log('\n💡 To fix this:');
  console.log('   1. Go to http://localhost:5173');
  console.log('   2. Log in with your Microsoft account');
  console.log('   3. This will generate fresh tokens');
  console.log('   4. Then run this test again');
} else {
  console.log('\n✅ Users found! You can now test the migration.');
  console.log('\n💡 Next steps:');
  console.log('   1. Go to http://localhost:5173');
  console.log('   2. Browse your OneDrive files');
  console.log('   3. Select files to migrate');
  console.log('   4. Click "Start Migration"');
}

console.log('\n🔧 Server Status:');
console.log('   - Backend: http://localhost:3000 ✅');
console.log('   - Frontend: http://localhost:5173 ✅');
console.log('\n🎯 Ready to test migration!');









