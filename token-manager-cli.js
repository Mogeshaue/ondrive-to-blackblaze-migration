#!/usr/bin/env node

const tokenManager = require('./server/services/tokenManager');
const { loadTokens } = require('./server/services/tokenStorage');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
🔐 OneDrive Token Manager CLI

Usage: node token-manager-cli.js <command>

Commands:
  start           Start the token manager service
  stop            Stop the token manager service
  status          Show current token status
  refresh         Force refresh all tokens
  monitor         Start monitoring (runs for 1 hour)
  help            Show this help message

Examples:
  node token-manager-cli.js status
  node token-manager-cli.js refresh
  node token-manager-cli.js monitor
`);
}

function showStatus() {
  console.log('🔍 Token Manager Status\n');
  
  const serviceStatus = tokenManager.getServiceStatus();
  
  console.log(`Service Status: ${serviceStatus.isRunning ? '🟢 Running' : '🔴 Stopped'}`);
  
  if (serviceStatus.lastRefreshTime) {
    console.log(`Last Refresh: ${serviceStatus.lastRefreshTime.toLocaleString()}`);
  }
  
  console.log(`Refresh Attempts: ${serviceStatus.refreshAttempts}/${serviceStatus.maxRefreshAttempts}`);
  
  console.log('\n📊 Token Status:');
  
  const tokenStatus = serviceStatus.tokenStatus;
  const users = Object.keys(tokenStatus);
  
  if (users.length === 0) {
    console.log('   No users found');
    return;
  }
  
  for (const userId of users) {
    const status = tokenStatus[userId];
    const statusIcon = status.isExpired ? '🔴' : status.needsRefresh ? '🟡' : '🟢';
    
    console.log(`\n   User: ${userId}`);
    console.log(`   Status: ${statusIcon} ${status.isExpired ? 'Expired' : status.needsRefresh ? 'Needs Refresh' : 'Valid'}`);
    console.log(`   Expires: ${new Date(status.expiresAt).toLocaleString()}`);
    console.log(`   Time Left: ${status.hoursUntilExpiry}h ${status.minutesUntilExpiry % 60}m`);
    console.log(`   Last Updated: ${new Date(status.lastUpdated).toLocaleString()}`);
  }
}

async function forceRefresh() {
  console.log('🔄 Force refreshing all tokens...\n');
  
  try {
    await tokenManager.forceRefreshAllTokens();
    console.log('\n✅ Force refresh completed');
  } catch (error) {
    console.error('\n❌ Force refresh failed:', error.message);
  }
}

function startMonitoring() {
  console.log('🔍 Starting token monitoring for 1 hour...\n');
  
  // Start the token manager
  tokenManager.start();
  
  // Show initial status
  showStatus();
  
  // Set up periodic status updates
  const statusInterval = setInterval(() => {
    console.log('\n' + '='.repeat(50));
    console.log(`Status Update: ${new Date().toLocaleString()}`);
    showStatus();
  }, 10 * 60 * 1000); // Every 10 minutes
  
  // Stop after 1 hour
  setTimeout(() => {
    console.log('\n⏰ Monitoring period completed');
    clearInterval(statusInterval);
    tokenManager.stop();
    process.exit(0);
  }, 60 * 60 * 1000); // 1 hour
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping monitoring...');
    clearInterval(statusInterval);
    tokenManager.stop();
    process.exit(0);
  });
}

// Main command handler
async function main() {
  try {
    switch (command) {
      case 'start':
        tokenManager.start();
        console.log('✅ Token manager started');
        break;
        
      case 'stop':
        tokenManager.stop();
        console.log('✅ Token manager stopped');
        break;
        
      case 'status':
        showStatus();
        break;
        
      case 'refresh':
        await forceRefresh();
        break;
        
      case 'monitor':
        startMonitoring();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        console.log('❌ Unknown command:', command);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main();
}

module.exports = { showStatus, forceRefresh };
