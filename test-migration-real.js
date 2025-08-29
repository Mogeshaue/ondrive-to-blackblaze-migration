const { getAllUsers } = require('./server/services/tokenStorage');
const { startMigration, getJobStatus } = require('./server/migration/migrationService');

console.log('=== REAL MIGRATION TEST ===\n');

async function testRealMigration() {
  try {
    // Get user
    const users = getAllUsers();
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = users[0];
    console.log(`🔍 Testing with user: ${userId}`);
    
    // Test with a real file that exists in OneDrive
    const testItems = [
      'check.docx'  // This file exists in OneDrive root
    ];
    
    console.log('\n🔍 Starting migration with real file...');
    console.log(`   Files to migrate: ${testItems.join(', ')}`);
    
    try {
      const result = await startMigration(userId, testItems, 'test-real');
      console.log('✅ Migration started successfully');
      console.log(`   Manifest ID: ${result.manifestId}`);
      console.log(`   Status: ${result.status}`);
      
      // Wait a bit and check status
      setTimeout(async () => {
        console.log('\n🔍 Checking migration status...');
        const job = getJobStatus(result.manifestId);
        if (job) {
          console.log(`   Status: ${job.status}`);
          console.log(`   Started: ${job.startedAt}`);
          console.log(`   Finished: ${job.finishedAt || 'Not finished'}`);
          console.log(`   Exit Code: ${job.exitCode || 'N/A'}`);
          console.log(`   Error: ${job.error || 'None'}`);
        } else {
          console.log('❌ Job not found');
        }
      }, 5000);
      
    } catch (error) {
      console.log('❌ Migration start failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testRealMigration();
