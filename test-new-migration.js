const { storeUserToken, getValidAccessToken, getAllUsers } = require('./server/services/tokenStorage');
const { ensureRemotes, testRemotes } = require('./server/migration/rcloneConfig');
const { startMigration, getJobStatus } = require('./server/migration/migrationService');

console.log('=== TESTING NEW MIGRATION SYSTEM ===\n');

async function testMigration() {
  try {
    // Step 1: Check if any users are logged in
    console.log('🔍 STEP 1: Checking for logged-in users');
    const users = getAllUsers();
    console.log(`Found ${users.length} users with stored tokens:`);
    users.forEach(userId => console.log(`  - ${userId}`));

    if (users.length === 0) {
      console.log('❌ NO USERS FOUND! Please log in first at http://localhost:5173');
      return;
    }

    const testUserId = users[0];
    console.log(`\n🧪 Testing with user: ${testUserId}`);

    // Step 2: Test token retrieval
    console.log('\n🔍 STEP 2: Testing token retrieval');
    try {
      const token = getValidAccessToken(testUserId);
      console.log(`✅ Token retrieved successfully (length: ${token.length})`);
    } catch (error) {
      console.log(`❌ Token retrieval failed: ${error.message}`);
      return;
    }

    // Step 3: Test rclone remotes
    console.log('\n🔍 STEP 3: Testing rclone remotes');
    try {
      const remotes = await ensureRemotes(testUserId);
      console.log(`✅ Remotes configured successfully:`);
      console.log(`   OneDrive: ${remotes.onedriveRemote}`);
      console.log(`   B2: ${remotes.b2Remote}`);
      console.log(`   Config: ${remotes.configPath}`);
    } catch (error) {
      console.log(`❌ Remote configuration failed: ${error.message}`);
      return;
    }

    // Step 4: Test remote connectivity
    console.log('\n🔍 STEP 4: Testing remote connectivity');
    try {
      const remoteTest = await testRemotes(testUserId);
      if (remoteTest) {
        console.log(`✅ Remote connectivity test passed`);
      } else {
        console.log(`❌ Remote connectivity test failed`);
        return;
      }
    } catch (error) {
      console.log(`❌ Remote test failed: ${error.message}`);
      return;
    }

    // Step 5: Test migration with a small file
    console.log('\n🔍 STEP 5: Testing migration (dry run)');
    try {
      const testItems = ['Documents/test.txt']; // Test with a single file
      const result = await startMigration(testUserId, testItems, 'test-migration');
      console.log(`✅ Migration started successfully:`);
      console.log(`   Manifest ID: ${result.manifestId}`);
      console.log(`   Status: ${result.status}`);

      // Wait a moment and check status
      setTimeout(async () => {
        const status = getJobStatus(result.manifestId);
        console.log(`\n📊 Job status after 2 seconds:`);
        console.log(`   Status: ${status?.status}`);
        console.log(`   Started: ${status?.startedAt}`);
        console.log(`   Exit Code: ${status?.exitCode}`);
        console.log(`   Error: ${status?.error}`);
      }, 2000);

    } catch (error) {
      console.log(`❌ Migration test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMigration();










