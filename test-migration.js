const { spawn } = require('child_process');
const path = require('path');

console.log('Testing Rclone Migration...');

// Test 1: Check if rclone exists
const rclonePath = 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\\rclone-v1.71.0-windows-amd64\\rclone.exe';

console.log('1. Testing Rclone availability...');
try {
  const versionOutput = require('child_process').execSync(`"${rclonePath}" version`, { stdio: 'pipe' });
  console.log('✅ Rclone found:', versionOutput.toString().split('\n')[0]);
} catch (error) {
  console.log('❌ Rclone not found:', error.message);
  process.exit(1);
}

// Test 2: Check rclone remotes
console.log('\n2. Testing Rclone remotes...');
try {
  const remotesOutput = require('child_process').execSync(`"${rclonePath}" listremotes`, { stdio: 'pipe' });
  console.log('✅ Rclone remotes:', remotesOutput.toString().trim());
} catch (error) {
  console.log('❌ Rclone remotes failed:', error.message);
}

// Test 3: Test OneDrive access
console.log('\n3. Testing OneDrive access...');
try {
  const onedriveOutput = require('child_process').execSync(`"${rclonePath}" lsd onedrive:/`, { stdio: 'pipe' });
  console.log('✅ OneDrive access OK');
  console.log('OneDrive contents:', onedriveOutput.toString().trim());
} catch (error) {
  console.log('❌ OneDrive access failed:', error.message);
}

// Test 4: Test B2 access
console.log('\n4. Testing B2 access...');
try {
  const b2Output = require('child_process').execSync(`"${rclonePath}" lsd b2:`, { stdio: 'pipe' });
  console.log('✅ B2 access OK');
  console.log('B2 contents:', b2Output.toString().trim());
} catch (error) {
  console.log('❌ B2 access failed:', error.message);
}

console.log('\nTest completed!');
