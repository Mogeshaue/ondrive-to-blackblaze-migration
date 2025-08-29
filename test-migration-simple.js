const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Simple Migration Test ===');

// Test 1: Check if user is logged in and has tokens
console.log('\n1. Testing OAuth tokens...');
try {
  // Check if there are any stored tokens
  const { userTokens } = require('./server/services/onedriveToken');
  console.log('Stored tokens:', userTokens.size);
  
  if (userTokens.size === 0) {
    console.log('❌ No OAuth tokens found. Please log in first at http://localhost:5173');
    console.log('After login, run this test again.');
    process.exit(1);
  }
  
  // Get the first user's tokens
  const [userId, tokenData] = userTokens.entries().next().value;
  console.log('✅ Found tokens for user:', userId);
  
} catch (error) {
  console.log('❌ Token check failed:', error.message);
  process.exit(1);
}

// Test 2: Create a simple manifest file (like your PowerShell script)
console.log('\n2. Creating test manifest...');
const testFiles = [
  'Documents/test.txt',
  'Pictures/sample.jpg'
];

const manifestPath = path.join(__dirname, 'test-manifest.txt');
fs.writeFileSync(manifestPath, testFiles.join('\n'));
console.log('✅ Created manifest with test files');

// Test 3: Test OneDrive access with configless approach
console.log('\n3. Testing OneDrive access...');
try {
  const { buildOneDriveSource } = require('./server/services/onedriveToken');
  const [userId] = userTokens.entries().next().value;
  
  const source = buildOneDriveSource(userId);
  console.log('✅ OneDrive source built:', source.substring(0, 50) + '...');
  
} catch (error) {
  console.log('❌ OneDrive source failed:', error.message);
  process.exit(1);
}

// Test 4: Test B2 access
console.log('\n4. Testing B2 access...');
const rclonePath = 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\\rclone-v1.71.0-windows-amd64\\rclone.exe';

try {
  // Test B2 bucket listing
  const b2Output = require('child_process').execSync(`"${rclonePath}" lsd b2:`, { stdio: 'pipe' });
  console.log('✅ B2 access OK');
  console.log('B2 buckets:', b2Output.toString().trim());
} catch (error) {
  console.log('❌ B2 access failed:', error.message);
  console.log('Please check your B2 credentials in rclone.conf');
  process.exit(1);
}

// Test 5: Try a simple copy operation
console.log('\n5. Testing simple copy operation...');
try {
  const bucketName = process.env.B2_BUCKET_NAME || 'your-bucket-name';
  const testDestination = `b2:${bucketName}/test-migration/`;
  
  console.log('Testing copy to:', testDestination);
  
  // Create a simple test file
  const testFilePath = path.join(__dirname, 'test-file.txt');
  fs.writeFileSync(testFilePath, 'This is a test file for migration');
  
  // Try to copy it
  const copyArgs = [
    'copy',
    testFilePath,
    testDestination,
    '--dry-run', // Don't actually copy, just test
    '--verbose'
  ];
  
  const copyOutput = require('child_process').execSync(`"${rclonePath}" ${copyArgs.join(' ')}`, { stdio: 'pipe' });
  console.log('✅ Copy test passed (dry run)');
  console.log('Output:', copyOutput.toString().trim());
  
  // Clean up test file
  fs.unlinkSync(testFilePath);
  
} catch (error) {
  console.log('❌ Copy test failed:', error.message);
}

// Test 6: Test OneDrive to B2 copy (like your PowerShell)
console.log('\n6. Testing OneDrive to B2 copy...');
try {
  const { buildOneDriveSource } = require('./server/services/onedriveToken');
  const [userId] = userTokens.entries().next().value;
  const bucketName = process.env.B2_BUCKET_NAME || 'your-bucket-name';
  
  const source = buildOneDriveSource(userId);
  const destination = `b2:${bucketName}/test-migration/`;
  
  console.log('Source:', source.substring(0, 50) + '...');
  console.log('Destination:', destination);
  
  // Use the same args as your working PowerShell script
  const args = [
    'copy',
    '--files-from', manifestPath,
    '--transfers', '4',
    '--checkers', '8',
    '--progress',
    '--stats', '5s',
    '--verbose',
    '--log-level', 'INFO',
    '--dry-run', // Don't actually copy for testing
    source,
    destination
  ];
  
  console.log('Executing:', `${rclonePath} ${args.join(' ')}`);
  
  const output = require('child_process').execSync(`"${rclonePath}" ${args.join(' ')}`, { stdio: 'pipe' });
  console.log('✅ OneDrive to B2 test passed (dry run)');
  console.log('Output:', output.toString().trim());
  
} catch (error) {
  console.log('❌ OneDrive to B2 test failed:', error.message);
  console.log('This is the main issue - the migration command is failing');
}

// Clean up
try {
  fs.unlinkSync(manifestPath);
  console.log('\n✅ Cleaned up test files');
} catch (e) {
  console.log('\n⚠️ Could not clean up test files:', e.message);
}

console.log('\n=== Test Complete ===');
console.log('\nNext steps:');
console.log('1. If all tests pass, remove --dry-run from the copy command');
console.log('2. Test with real files from your OneDrive');
console.log('3. Check the web app at http://localhost:5173');














