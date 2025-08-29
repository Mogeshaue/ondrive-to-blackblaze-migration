const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { loadTokens, saveTokens } = require('./tokenStorage');

class TokenManager {
  constructor() {
    this.refreshInterval = null;
    this.monitoringInterval = null;
    this.isRunning = false;
    this.lastRefreshTime = null;
    this.refreshAttempts = 0;
    this.maxRefreshAttempts = 3;
  }

  // Start the token manager service
  start() {
    if (this.isRunning) {
      console.log('🔄 Token manager is already running');
      return;
    }

    console.log('🚀 Starting Token Manager Service...');
    this.isRunning = true;

    // Start monitoring tokens every 30 minutes
    this.monitoringInterval = setInterval(() => {
      this.monitorAndRefreshTokens();
    }, 30 * 60 * 1000); // 30 minutes

    // Initial check
    this.monitorAndRefreshTokens();

    console.log('✅ Token Manager Service started successfully');
    console.log('   - Monitoring interval: 30 minutes');
    console.log('   - Auto-refresh enabled');
    console.log('   - Rclone config auto-update enabled');
  }

  // Stop the token manager service
  stop() {
    if (!this.isRunning) {
      console.log('🔄 Token manager is not running');
      return;
    }

    console.log('🛑 Stopping Token Manager Service...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    console.log('✅ Token Manager Service stopped');
  }

  // Monitor all tokens and refresh if needed
  async monitorAndRefreshTokens() {
    try {
      console.log('🔍 Monitoring tokens...');
      const tokens = loadTokens();
      const users = Object.keys(tokens);

      if (users.length === 0) {
        console.log('ℹ️  No users found, skipping token monitoring');
        return;
      }

      let refreshedCount = 0;
      for (const userId of users) {
        const tokenData = tokens[userId];
        if (!tokenData) continue;

        const expiresAt = new Date(tokenData.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

        console.log(`   User ${userId}: ${minutesUntilExpiry} minutes until expiry`);

        // Refresh if token expires within 2 hours
        if (minutesUntilExpiry <= 120) {
          console.log(`🔄 Refreshing token for user ${userId} (expires in ${minutesUntilExpiry} minutes)`);
          try {
            await this.refreshUserToken(userId);
            refreshedCount++;
            console.log(`✅ Token refreshed for user ${userId}`);
          } catch (error) {
            console.error(`❌ Failed to refresh token for user ${userId}:`, error.message);
          }
        }
      }

      if (refreshedCount > 0) {
        console.log(`✅ Refreshed ${refreshedCount} tokens`);
        this.lastRefreshTime = new Date();
        this.refreshAttempts = 0;
      } else {
        console.log('ℹ️  All tokens are still valid');
      }

    } catch (error) {
      console.error('❌ Error monitoring tokens:', error.message);
    }
  }

  // Refresh token for a specific user
  async refreshUserToken(userId) {
    console.log(`🔄 Refreshing token for user: ${userId}`);
    
    const tokens = loadTokens();
    const tokenData = tokens[userId];
    
    if (!tokenData) {
      throw new Error(`No token data found for user ${userId}`);
    }

    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.MS_CLIENT_ID,
          client_secret: process.env.MS_CLIENT_SECRET,
          refresh_token: tokenData.refreshToken,
          grant_type: 'refresh_token',
          redirect_uri: process.env.MS_REDIRECT_URI
        }).toString(),
        { 
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000 // 10 second timeout
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      // Update token data
      const expiresAt = new Date(Date.now() + (expires_in - 300) * 1000); // 5 minute buffer
      
      tokens[userId] = {
        accessToken: access_token,
        refreshToken: refresh_token || tokenData.refreshToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: tokenData.createdAt,
        updatedAt: new Date().toISOString()
      };

      saveTokens(tokens);
      
      // Update rclone configuration
      await this.updateRcloneConfig(userId, access_token, refresh_token || tokenData.refreshToken, expiresAt);
      
      console.log(`✅ Token refreshed successfully for user: ${userId}`);
      console.log(`   New expiry: ${expiresAt.toISOString()}`);
      
      return access_token;
      
    } catch (error) {
      this.refreshAttempts++;
      console.error(`❌ Token refresh failed for user ${userId}:`, error.message);
      
      if (this.refreshAttempts >= this.maxRefreshAttempts) {
        console.error(`🚨 Maximum refresh attempts (${this.maxRefreshAttempts}) reached`);
        console.error('   Please check your internet connection and Microsoft API status');
      }
      
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Update rclone configuration with new token
  async updateRcloneConfig(userId, accessToken, refreshToken, expiresAt) {
    try {
      const configPath = path.join(__dirname, '..', 'data', 'rclone.conf');
      
      if (!fs.existsSync(configPath)) {
        console.log('⚠️  Rclone config not found, skipping update');
        return;
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      const lines = configContent.split('\n');
      
      // Create new token object
      const tokenObject = {
        access_token: accessToken,
        token_type: 'Bearer',
        refresh_token: refreshToken,
        expiry: expiresAt.toISOString()
      };
      
      const tokenString = `token = ${JSON.stringify(tokenObject)}`;
      
      // Update the [onedrive] section
      let updatedConfig = '';
      let inOnedriveSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '[onedrive]') {
          inOnedriveSection = true;
          updatedConfig += lines[i] + '\n';
          continue;
        }
        
        if (inOnedriveSection) {
          if (line.startsWith('[') && line.endsWith(']')) {
            // Next section reached
            inOnedriveSection = false;
            updatedConfig += lines[i] + '\n';
            continue;
          }
          
          if (line.startsWith('token = ')) {
            // Replace the token
            updatedConfig += tokenString + '\n';
            continue;
          }
          
          // Keep other lines as they are
          updatedConfig += lines[i] + '\n';
        } else {
          updatedConfig += lines[i] + '\n';
        }
      }
      
      // Write the updated config back
      fs.writeFileSync(configPath, updatedConfig);
      
      // Also update the global rclone config
      const globalConfigPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'rclone', 'rclone.conf');
      if (fs.existsSync(globalConfigPath)) {
        fs.writeFileSync(globalConfigPath, updatedConfig);
      }
      
      console.log('✅ Rclone configuration updated successfully');
      
    } catch (error) {
      console.error('❌ Failed to update rclone config:', error.message);
    }
  }

  // Get token status for all users
  getTokenStatus() {
    try {
      const tokens = loadTokens();
      const users = Object.keys(tokens);
      const status = {};

      for (const userId of users) {
        const tokenData = tokens[userId];
        if (!tokenData) continue;

        const expiresAt = new Date(tokenData.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
        const hoursUntilExpiry = Math.floor(minutesUntilExpiry / 60);

        status[userId] = {
          expiresAt: tokenData.expiresAt,
          minutesUntilExpiry,
          hoursUntilExpiry,
          isExpired: minutesUntilExpiry <= 0,
          needsRefresh: minutesUntilExpiry <= 120, // 2 hours
          lastUpdated: tokenData.updatedAt
        };
      }

      return status;
    } catch (error) {
      console.error('❌ Error getting token status:', error.message);
      return {};
    }
  }

  // Force refresh all tokens
  async forceRefreshAllTokens() {
    console.log('🔄 Force refreshing all tokens...');
    
    try {
      const tokens = loadTokens();
      const users = Object.keys(tokens);
      
      if (users.length === 0) {
        console.log('ℹ️  No users found');
        return;
      }

      let successCount = 0;
      for (const userId of users) {
        try {
          await this.refreshUserToken(userId);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to refresh token for user ${userId}:`, error.message);
        }
      }

      console.log(`✅ Successfully refreshed ${successCount}/${users.length} tokens`);
      
    } catch (error) {
      console.error('❌ Error force refreshing tokens:', error.message);
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      lastRefreshTime: this.lastRefreshTime,
      refreshAttempts: this.refreshAttempts,
      maxRefreshAttempts: this.maxRefreshAttempts,
      tokenStatus: this.getTokenStatus()
    };
  }
}

// Create singleton instance
const tokenManager = new TokenManager();

module.exports = tokenManager;
