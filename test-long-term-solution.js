#!/usr/bin/env node

const tokenManager = require('./server/services/tokenManager');

console.log('🧪 Testing Long-term Token Management Solution\n');

// Test 1: Check status
console.log('1. Checking token status...');
const status = tokenManager.getServiceStatus();
console.log(`   Service running: ${status.isRunning ? 'Yes' : 'No'}`);
console.log(`   Users found: ${Object.keys(status.tokenStatus).length}`);

// Test 2: Show token details
for (const [userId, tokenStatus] of Object.entries(status.tokenStatus)) {
  console.log(`\n   User ${userId}:`);
  console.log(`     Status: ${tokenStatus.isExpired ? '🔴 Expired' : tokenStatus.needsRefresh ? '🟡 Needs Refresh' : '🟢 Valid'}`);
  console.log(`     Expires: ${new Date(tokenStatus.expiresAt).toLocaleString()}`);
  console.log(`     Time Left: ${tokenStatus.hoursUntilExpiry}h ${tokenStatus.minutesUntilExpiry % 60}m`);
}

// Test 3: Test OneDrive connection
console.log('\n2. Testing OneDrive connection...');
const { execSync } = require('child_process');
try {
  const output = execSync('rclone ls onedrive: --config "server/data/rclone.conf"', { 
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 // 1MB
  });
  console.log('✅ OneDrive connection successful');
  console.log(`   Files found: ${output.split('\n').filter(line => line.trim()).length}`);
} catch (error) {
  console.log('❌ OneDrive connection failed:', error.message);
}

console.log('\n✅ Long-term solution setup complete!');
console.log('\n📋 Next steps:');
console.log('   1. Start your server: npm start');
console.log('   2. Token manager will start automatically');
console.log('   3. Run migrations without worrying about tokens');
console.log('   4. Monitor status: node token-manager-cli.js status');
