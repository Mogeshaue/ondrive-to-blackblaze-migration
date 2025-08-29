const { getAllUsers } = require('./server/services/tokenStorage');
const { getJobStatus, getAllJobs } = require('./server/migration/migrationService');

console.log('=== MIGRATION DEBUG ===\n');

// Check current jobs
console.log('🔍 STEP 1: Checking current jobs...');
const allJobs = getAllJobs();
console.log(`Found ${allJobs.length} jobs:`);
allJobs.forEach(job => {
  console.log(`  - ${job.manifestId}: ${job.status} (started: ${job.startedAt})`);
});

// Check specific job
const manifestId = 'bf018b17167635e5d33b3328d47241cd611823ee';
console.log(`\n🔍 STEP 2: Checking specific job: ${manifestId}`);
const job = getJobStatus(manifestId);
if (job) {
  console.log('✅ Job found:');
  console.log(`   Status: ${job.status}`);
  console.log(`   Started: ${job.startedAt}`);
  console.log(`   Finished: ${job.finishedAt || 'Not finished'}`);
  console.log(`   Exit Code: ${job.exitCode || 'N/A'}`);
  console.log(`   Error: ${job.error || 'None'}`);
  console.log(`   Items: ${job.items || 'Unknown'}`);
  console.log(`   Destination: ${job.destination || 'Unknown'}`);
} else {
  console.log('❌ Job not found - this explains the 500 error!');
}

// Check users
console.log('\n🔍 STEP 3: Checking users...');
const users = getAllUsers();
console.log(`Found ${users.length} users with tokens:`);
users.forEach(userId => console.log(`  - ${userId}`));

console.log('\n💡 If the job is not found, the migration likely failed during startup.');
console.log('   Check the server logs for any error messages during migration start.');








