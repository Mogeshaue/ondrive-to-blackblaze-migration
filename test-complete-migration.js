const { 
  testOneDriveConnection, 
  testB2Connection, 
  checkOneDriveApproval, 
  validateTokenForMigration,
  startMigration,
  getJobStatus
} = require('./server/migration/migrationService');
const { getAllUsers } = require('./server/services/tokenStorage');

console.log('=== COMPREHENSIVE MIGRATION SYSTEM TEST ===\n');

async function runCompleteTest() {
  try {
    // Step 1: Check for logged-in users
    console.log('🔍 STEP 1: Checking for logged-in users');
    console.log('=====================================');
    const users = getAllUsers();
    console.log(`Found ${users.length} users with stored tokens:`);
    users.forEach(userId => console.log(`  - ${userId}`));

    if (users.length === 0) {
      console.log('❌ NO USERS FOUND! Please log in first at http://localhost:5173');
      return;
    }

    // Use the second user (Alice) which has a valid token
    const testUserId = users[1] || users[0]; // Prefer the second user
    console.log(`\n🧪 Testing with user: ${testUserId}`);

    // Step 2: Test token validation
    console.log('\n🔍 STEP 2: Testing token validation');
    console.log('===================================');
    try {
      await validateTokenForMigration(testUserId);
      console.log('✅ Token validation passed');
    } catch (error) {
      console.log(`❌ Token validation failed: ${error.message}`);
      return;
    }

    // Step 3: Test OneDrive approval
    console.log('\n🔍 STEP 3: Testing OneDrive approval');
    console.log('=====================================');
    try {
      const approvalResult = await checkOneDriveApproval(testUserId);
      if (approvalResult.approved) {
        console.log('✅ OneDrive approval check passed');
        console.log(`   Drive ID: ${approvalResult.driveId}`);
      } else {
        console.log(`❌ OneDrive approval check failed: ${approvalResult.error}`);
        console.log('   User needs admin approval for OneDrive access');
        return;
      }
    } catch (error) {
      console.log(`❌ OneDrive approval check failed: ${error.message}`);
      return;
    }

    // Step 4: Test OneDrive connection
    console.log('\n🔍 STEP 4: Testing OneDrive connection');
    console.log('=======================================');
    try {
      const onedriveResult = await testOneDriveConnection(testUserId);
      if (onedriveResult.success) {
        console.log('✅ OneDrive connection test passed');
        console.log(`   Output: ${onedriveResult.output.substring(0, 200)}...`);
      } else {
        console.log(`❌ OneDrive connection test failed: ${onedriveResult.error}`);
        return;
      }
    } catch (error) {
      console.log(`❌ OneDrive connection test failed: ${error.message}`);
      return;
    }

    // Step 5: Test B2 connection
    console.log('\n🔍 STEP 5: Testing B2 connection');
    console.log('=================================');
    try {
      const b2Result = await testB2Connection();
      if (b2Result.success) {
        console.log('✅ B2 connection test passed');
        console.log(`   Output: ${b2Result.output.substring(0, 200)}...`);
      } else {
        console.log(`❌ B2 connection test failed: ${b2Result.error}`);
        return;
      }
    } catch (error) {
      console.log(`❌ B2 connection test failed: ${error.message}`);
      return;
    }

    // Step 6: Test migration with a small file
    console.log('\n🔍 STEP 6: Testing migration (small test)');
    console.log('==========================================');
    try {
      const testItems = ['Documents/test.txt']; // Test with a single file
      console.log(`   Test items: ${testItems.join(', ')}`);
      
      const result = await startMigration(testUserId, testItems, 'test-migration');
      console.log(`✅ Migration started successfully:`);
      console.log(`   Manifest ID: ${result.manifestId}`);
      console.log(`   Status: ${result.status}`);

      // Wait a moment and check status
      setTimeout(async () => {
        const status = getJobStatus(result.manifestId);
        console.log(`\n📊 Job status after 3 seconds:`);
        console.log(`   Status: ${status?.status}`);
        console.log(`   Started: ${status?.startedAt}`);
        console.log(`   Exit Code: ${status?.exitCode}`);
        console.log(`   Error: ${status?.error}`);
        console.log(`   Items: ${status?.items}`);
        console.log(`   Destination: ${status?.destination}`);
        
        if (status?.status === 'completed') {
          console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
        } else if (status?.status === 'failed') {
          console.log('\n❌ MIGRATION FAILED!');
        } else {
          console.log('\n⏳ Migration still running...');
        }
      }, 3000);

    } catch (error) {
      console.log(`❌ Migration test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Complete test failed:', error.message);
  }
}

// Run the complete test
runCompleteTest();
