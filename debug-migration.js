const { userTokens, storeUserToken, getUserToken, buildOneDriveSource, getAllUsers } = require('./server/services/onedriveToken');

console.log('=== MIGRATION DEBUG SCRIPT ===');
console.log('This script will show you exactly what\'s happening with the migration process\n');

// Step 1: Check if any users are logged in
console.log('🔍 STEP 1: Checking for logged-in users');
console.log('=====================================');
const users = getAllUsers();
console.log(`Found ${users.length} users with stored tokens:`);
users.forEach(userId => console.log(`  - ${userId}`));

if (users.length === 0) {
  console.log('❌ NO USERS FOUND! This means:');
  console.log('   1. No one has logged in yet');
  console.log('   2. OAuth tokens are not being stored properly');
  console.log('   3. Migration cannot work without tokens');
  console.log('\n💡 SOLUTION: Go to http://localhost:5173 and log in first');
  process.exit(1);
}

// Step 2: Test token retrieval
console.log('\n🔍 STEP 2: Testing token retrieval');
console.log('==================================');
const testUserId = users[0];
console.log(`Testing with user: ${testUserId}`);

try {
  const token = getUserToken(testUserId);
  console.log(`✅ Token retrieved successfully`);
  console.log(`   Token length: ${token.length}`);
  console.log(`   Token preview: ${token.substring(0, 50)}...`);
} catch (error) {
  console.log(`❌ Token retrieval failed: ${error.message}`);
  process.exit(1);
}

// Step 3: Test OneDrive source building
console.log('\n🔍 STEP 3: Testing OneDrive source building');
console.log('==========================================');
try {
  const source = buildOneDriveSource(testUserId);
  console.log(`✅ OneDrive source built successfully`);
  console.log(`   Source: ${source.substring(0, 100)}...`);
} catch (error) {
  console.log(`❌ OneDrive source building failed: ${error.message}`);
  process.exit(1);
}

// Step 4: Test rclone availability
console.log('\n🔍 STEP 4: Testing rclone availability');
console.log('=====================================');
const rclonePath = 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\\rclone-v1.71.0-windows-amd64\\rclone.exe';

try {
  const versionOutput = require('child_process').execSync(`"${rclonePath}" version`, { stdio: 'pipe' });
  console.log(`✅ Rclone found: ${versionOutput.toString().split('\n')[0]}`);
} catch (error) {
  console.log(`❌ Rclone not found: ${error.message}`);
  console.log('   Please ensure rclone is installed');
  process.exit(1);
}

// Step 5: Test OneDrive access
console.log('\n🔍 STEP 5: Testing OneDrive access');
console.log('==================================');
try {
  const source = buildOneDriveSource(testUserId);
  const onedriveOutput = require('child_process').execSync(`"${rclonePath}" lsd "${source}"`, { stdio: 'pipe' });
  console.log(`✅ OneDrive access successful`);
  console.log(`   OneDrive contents: ${onedriveOutput.toString().trim()}`);
} catch (error) {
  console.log(`❌ OneDrive access failed: ${error.message}`);
  console.log('   This means the OAuth tokens are not working properly');
  process.exit(1);
}

// Step 6: Test B2 access
console.log('\n🔍 STEP 6: Testing B2 access');
console.log('============================');
try {
  const b2Output = require('child_process').execSync(`"${rclonePath}" lsd b2:`, { stdio: 'pipe' });
  console.log(`✅ B2 access successful`);
  console.log(`   B2 buckets: ${b2Output.toString().trim()}`);
} catch (error) {
  console.log(`❌ B2 access failed: ${error.message}`);
  console.log('   Please check your B2 credentials in rclone.conf');
  process.exit(1);
}

// Step 7: Test actual migration command
console.log('\n🔍 STEP 7: Testing migration command (dry run)');
console.log('==============================================');
try {
  const fs = require('fs');
  const path = require('path');
  
  // Create a test manifest
  const testManifest = path.join(__dirname, 'test-manifest.txt');
  fs.writeFileSync(testManifest, 'Documents/test.txt\nPictures/sample.jpg');
  
  const source = buildOneDriveSource(testUserId);
  const bucketName = process.env.B2_BUCKET_NAME || 'your-bucket-name';
  const destination = `b2:${bucketName}/test-migration/`;
  
  const args = [
    'copy',
    '--files-from', testManifest,
    '--transfers', '4',
    '--checkers', '8',
    '--progress',
    '--stats', '5s',
    '--verbose',
    '--log-level', 'INFO',
    '--dry-run', // Don't actually copy
    source,
    destination
  ];
  
  console.log(`Executing: ${rclonePath} ${args.join(' ')}`);
  
  const output = require('child_process').execSync(`"${rclonePath}" ${args.join(' ')}`, { stdio: 'pipe' });
  console.log(`✅ Migration command test successful (dry run)`);
  console.log(`   Output: ${output.toString().trim()}`);
  
  // Clean up
  fs.unlinkSync(testManifest);
  
} catch (error) {
  console.log(`❌ Migration command test failed: ${error.message}`);
  console.log('   This is the main issue - the migration command itself is failing');
}

console.log('\n=== DEBUG SUMMARY ===');
console.log('✅ If all steps passed: Migration should work');
console.log('❌ If any step failed: That\'s the issue to fix');
console.log('\n💡 NEXT STEPS:');
console.log('1. If tokens are missing: Log in at http://localhost:5173');
console.log('2. If OneDrive access fails: Check OAuth tokens');
console.log('3. If B2 access fails: Check B2 credentials');
console.log('4. If migration command fails: Check rclone configuration');














