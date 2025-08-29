const { getAllUsers } = require('./server/services/tokenStorage');
const { startMigration, validateTokenForMigration, checkOneDriveApproval, ensureRcloneRemotes } = require('./server/migration/migrationService');

console.log('=== MIGRATION START TEST ===\n');

async function testMigrationStart() {
  try {
    // Get user
    const users = getAllUsers();
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = users[0];
    console.log(`🔍 Testing with user: ${userId}`);
    
    // Test items (simulate what the frontend sends)
    const testItems = [
      'test-file-1.txt',
      'test-file-2.txt'
    ];
    
    console.log('\n🔍 STEP 1: Testing token validation...');
    try {
      await validateTokenForMigration(userId);
      console.log('✅ Token validation passed');
    } catch (error) {
      console.log('❌ Token validation failed:', error.message);
      return;
    }
    
    console.log('\n🔍 STEP 2: Testing OneDrive approval...');
    try {
      const approval = await checkOneDriveApproval(userId);
      if (approval.approved) {
        console.log('✅ OneDrive approval passed');
      } else {
        console.log('❌ OneDrive approval failed:', approval.error);
        return;
      }
    } catch (error) {
      console.log('❌ OneDrive approval check failed:', error.message);
      return;
    }
    
    console.log('\n🔍 STEP 3: Testing rclone remotes...');
    try {
      const remotes = await ensureRcloneRemotes(userId);
      console.log('✅ Rclone remotes configured');
      console.log(`   OneDrive: ${remotes.onedriveRemote}`);
      console.log(`   B2: ${remotes.b2Remote}`);
      console.log(`   Config: ${remotes.configPath}`);
    } catch (error) {
      console.log('❌ Rclone remotes failed:', error.message);
      return;
    }
    
    console.log('\n🔍 STEP 4: Testing migration start...');
    try {
      const result = await startMigration(userId, testItems, 'test-prefix');
      console.log('✅ Migration started successfully');
      console.log(`   Manifest ID: ${result.manifestId}`);
      console.log(`   Status: ${result.status}`);
    } catch (error) {
      console.log('❌ Migration start failed:', error.message);
      console.log('   This is likely the root cause of the 500 errors');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testMigrationStart();




