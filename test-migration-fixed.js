const { getAllUsers } = require('./server/services/tokenStorage');
const { startMigration, getJobStatus } = require('./server/migration/migrationService');

console.log('=== FIXED MIGRATION TEST ===\n');

async function testFixedMigration() {
  try {
    // Get user
    const users = getAllUsers();
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = users[0];
    console.log(`🔍 Testing with user: ${userId}`);
    
    // Simulate what the frontend sends (with /drive/root: prefix)
    const selectedItems = [
      { path: '/drive/root:/DA member info.xlsx' },
      { path: '/drive/root:/ALICE SHEENA FERNANDO_alicesheena.23cs@kct.ac.in.pdf' }
    ];
    
    console.log('\n🔍 Processing file paths...');
    
    // Extract file paths from selected items (same logic as server.js)
    const filePaths = selectedItems.map(item => {
      let path = item.path;
      
      // Remove leading slash if present
      if (path.startsWith('/')) {
        path = path.substring(1);
      }
      
      // Remove /drive/root: prefix if present
      if (path.startsWith('drive/root:')) {
        path = path.substring('drive/root:'.length);
      }
      
      // Remove leading slash again if present
      if (path.startsWith('/')) {
        path = path.substring(1);
      }
      
      // Replace backslashes with forward slashes
      path = path.replace(/\\/g, '/');
      
      console.log(`Processing path: "${item.path}" -> "${path}"`);
      return path;
    });
    
    console.log('\n🔍 Starting migration with processed paths...');
    console.log(`   Files to migrate: ${filePaths.join(', ')}`);
    
    try {
      const result = await startMigration(userId, filePaths, 'test-fixed');
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

testFixedMigration();







