// Configuration Manager for Environment-based URLs and Settings
class ConfigManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.redirectUri = process.env.MS_REDIRECT_URI || `${this.baseUrl}/auth/microsoft/callback`;
  }

  // Get the base URL for the current environment
  getBaseUrl() {
    return this.baseUrl;
  }

  // Get the frontend URL for the current environment
  getFrontendUrl() {
    return this.frontendUrl;
  }

  // Get the Microsoft OAuth redirect URI
  getRedirectUri() {
    return this.redirectUri;
  }

  // Get the logout redirect URI
  getLogoutRedirectUri() {
    const timestamp = Date.now();
    return `${this.frontendUrl}/login?logout=success&t=${timestamp}`;
  }

  // Get CORS origin
  getCorsOrigin() {
    return process.env.CORS_ORIGIN || this.frontendUrl;
  }

  // Get Microsoft OAuth authorization URL
  getMicrosoftAuthUrl() {
    const params = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID,
      response_type: 'code',
      redirect_uri: this.getRedirectUri(),
      scope: 'offline_access Files.Read.All',
      response_mode: 'query',
      prompt: 'select_account'
    });

    return `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Get Microsoft logout URL
  getMicrosoftLogoutUrl() {
    const postLogoutRedirectUri = encodeURIComponent(this.getLogoutRedirectUri());
    return `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;
  }

  // Check if running in production
  isProduction() {
    return this.environment === 'production';
  }

  // Check if running in development
  isDevelopment() {
    return this.environment === 'development';
  }

  // Get all configuration for debugging
  getConfig() {
    return {
      environment: this.environment,
      baseUrl: this.baseUrl,
      frontendUrl: this.frontendUrl,
      redirectUri: this.getRedirectUri(),
      corsOrigin: this.getCorsOrigin(),
      isProduction: this.isProduction(),
      isDevelopment: this.isDevelopment()
    };
  }
}

// Export singleton instance
module.exports = new ConfigManager();
