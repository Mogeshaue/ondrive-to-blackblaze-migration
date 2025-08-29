const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Long-term Token Management Solution\n');

async function setupLongTermSolution() {
  try {
    // 1. Extract current working token from rclone config
    console.log('📋 Step 1: Extracting current working token...');
    const configPath = path.join(__dirname, 'server', 'data', 'rclone.conf');
    
    if (!fs.existsSync(configPath)) {
      throw new Error('Rclone config not found');
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const lines = configContent.split('\n');
    
    let currentToken = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '[onedrive]') {
        // Found the main onedrive section, look for token
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith('[') && lines[j].trim().endsWith(']')) {
            break; // Next section
          }
          if (lines[j].trim().startsWith('token = ')) {
            const tokenLine = lines[j].trim();
            const tokenMatch = tokenLine.match(/token = (.+)/);
            if (tokenMatch) {
              try {
                currentToken = JSON.parse(tokenMatch[1]);
                break;
              } catch (e) {
                console.error('Error parsing token JSON:', e);
              }
            }
          }
        }
        break;
      }
    }
    
    if (!currentToken) {
      throw new Error('No valid token found in rclone config');
    }
    
    console.log('✅ Current token extracted successfully');
    console.log(`   Expires: ${currentToken.expiry}`);
    
    // 2. Update token storage with current working token
    console.log('\n📋 Step 2: Updating token storage...');
    const tokensPath = path.join(__dirname, 'server', 'data', 'tokens.json');
    
    let tokens = {};
    if (fs.existsSync(tokensPath)) {
      tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    }
    
    // Use the first user ID or create a default one
    const userId = Object.keys(tokens)[0] || 'default-user';
    
    tokens[userId] = {
      accessToken: currentToken.access_token,
      refreshToken: currentToken.refresh_token,
      expiresAt: currentToken.expiry,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
    console.log('✅ Token storage updated successfully');
    
    // 3. Test the token manager
    console.log('\n📋 Step 3: Testing token manager...');
    const tokenManager = require('./server/services/tokenManager');
    
    // Test status
    const status = tokenManager.getServiceStatus();
    console.log('✅ Token manager status:');
    console.log(`   Service running: ${status.isRunning ? 'Yes' : 'No'}`);
    console.log(`   Users found: ${Object.keys(status.tokenStatus).length}`);
    
    for (const [userId, tokenStatus] of Object.entries(status.tokenStatus)) {
      console.log(`   User ${userId}:`);
      console.log(`     Status: ${tokenStatus.isExpired ? '🔴 Expired' : tokenStatus.needsRefresh ? '🟡 Needs Refresh' : '🟢 Valid'}`);
      console.log(`     Expires: ${new Date(tokenStatus.expiresAt).toLocaleString()}`);
      console.log(`     Time Left: ${tokenStatus.hoursUntilExpiry}h ${tokenStatus.minutesUntilExpiry % 60}m`);
    }
    
    // 4. Create a test script for verification
    console.log('\n📋 Step 4: Creating verification script...');
    const testScript = `#!/usr/bin/env node

const tokenManager = require('./server/services/tokenManager');

console.log('🧪 Testing Long-term Token Management Solution\\n');

// Test 1: Check status
console.log('1. Checking token status...');
const status = tokenManager.getServiceStatus();
console.log(\`   Service running: \${status.isRunning ? 'Yes' : 'No'}\`);
console.log(\`   Users found: \${Object.keys(status.tokenStatus).length}\`);

// Test 2: Show token details
for (const [userId, tokenStatus] of Object.entries(status.tokenStatus)) {
  console.log(\`\\n   User \${userId}:\`);
  console.log(\`     Status: \${tokenStatus.isExpired ? '🔴 Expired' : tokenStatus.needsRefresh ? '🟡 Needs Refresh' : '🟢 Valid'}\`);
  console.log(\`     Expires: \${new Date(tokenStatus.expiresAt).toLocaleString()}\`);
  console.log(\`     Time Left: \${tokenStatus.hoursUntilExpiry}h \${tokenStatus.minutesUntilExpiry % 60}m\`);
}

// Test 3: Test OneDrive connection
console.log('\\n2. Testing OneDrive connection...');
const { execSync } = require('child_process');
try {
  const output = execSync('rclone ls onedrive: --config "server/data/rclone.conf"', { 
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 // 1MB
  });
  console.log('✅ OneDrive connection successful');
  console.log(\`   Files found: \${output.split('\\n').filter(line => line.trim()).length}\`);
} catch (error) {
  console.log('❌ OneDrive connection failed:', error.message);
}

console.log('\\n✅ Long-term solution setup complete!');
console.log('\\n📋 Next steps:');
console.log('   1. Start your server: npm start');
console.log('   2. Token manager will start automatically');
console.log('   3. Run migrations without worrying about tokens');
console.log('   4. Monitor status: node token-manager-cli.js status');
`;

    fs.writeFileSync('test-long-term-solution.js', testScript);
    console.log('✅ Verification script created: test-long-term-solution.js');
    
    // 5. Summary
    console.log('\n🎉 Long-term Token Management Solution Setup Complete!\n');
    console.log('📋 What was set up:');
    console.log('   ✅ Token Manager Service (automatic refresh)');
    console.log('   ✅ CLI Management Tools');
    console.log('   ✅ Windows GUI Interface');
    console.log('   ✅ Token Storage System');
    console.log('   ✅ Rclone Config Auto-update');
    console.log('   ✅ Verification Script');
    
    console.log('\n🚀 How to use:');
    console.log('   1. Start server: npm start (token manager starts automatically)');
    console.log('   2. Check status: node token-manager-cli.js status');
    console.log('   3. Run migrations: Tokens are automatically managed');
    console.log('   4. Monitor: manage-tokens.bat (Windows GUI)');
    
    console.log('\n📊 Benefits:');
    console.log('   ✅ No more manual token refresh');
    console.log('   ✅ No more migration failures due to expired tokens');
    console.log('   ✅ 24/7 automatic operation');
    console.log('   ✅ Proactive token management');
    
    console.log('\n🔧 Test the setup:');
    console.log('   node test-long-term-solution.js');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupLongTermSolution();
