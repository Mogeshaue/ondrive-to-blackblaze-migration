#!/usr/bin/env node

// Production Configuration Validator
// Validates that all required environment variables are properly set

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Required environment variables for production
const requiredEnvVars = {
  'NODE_ENV': {
    description: 'Environment type',
    expectedValue: 'production',
    required: true
  },
  'BASE_URL': {
    description: 'Base URL for the application',
    pattern: /^https?:\/\/.+/,
    required: true
  },
  'MS_CLIENT_ID': {
    description: 'Microsoft OAuth Client ID',
    pattern: /^[a-f0-9-]{36}$/,
    required: true
  },
  'MS_CLIENT_SECRET': {
    description: 'Microsoft OAuth Client Secret',
    minLength: 10,
    required: true
  },
  'MS_TENANT_ID': {
    description: 'Microsoft Tenant ID',
    pattern: /^[a-f0-9-]{36}$/,
    required: true
  },
  'MS_REDIRECT_URI': {
    description: 'Microsoft OAuth Redirect URI',
    pattern: /^https?:\/\/.+\/auth\/microsoft\/callback$/,
    required: true
  },
  'B2_APPLICATION_KEY_ID': {
    description: 'Backblaze B2 Application Key ID',
    minLength: 10,
    required: true
  },
  'B2_APPLICATION_KEY': {
    description: 'Backblaze B2 Application Key',
    minLength: 20,
    required: true
  },
  'B2_BUCKET_NAME': {
    description: 'Backblaze B2 Bucket Name',
    minLength: 3,
    required: true
  },
  'SESSION_SECRET': {
    description: 'Session Secret for encryption',
    minLength: 32,
    required: true
  }
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnvFile(envFilePath) {
  log(`\n🔍 Validating ${envFilePath}...`, 'blue');
  
  if (!fs.existsSync(envFilePath)) {
    log(`❌ Environment file ${envFilePath} not found!`, 'red');
    return false;
  }

  // Read and parse environment file
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  let allValid = true;
  const issues = [];

  // Validate each required environment variable
  Object.entries(requiredEnvVars).forEach(([varName, config]) => {
    const value = envVars[varName];
    
    if (!value) {
      issues.push(`❌ ${varName}: Missing (${config.description})`);
      allValid = false;
      return;
    }

    // Check for placeholder values
    if (value.includes('your_') || value.includes('_here')) {
      issues.push(`⚠️  ${varName}: Contains placeholder value "${value}"`);
      allValid = false;
      return;
    }

    // Validate expected value
    if (config.expectedValue && value !== config.expectedValue) {
      issues.push(`⚠️  ${varName}: Expected "${config.expectedValue}", got "${value}"`);
    }

    // Validate pattern
    if (config.pattern && !config.pattern.test(value)) {
      issues.push(`❌ ${varName}: Invalid format (${config.description})`);
      allValid = false;
      return;
    }

    // Validate minimum length
    if (config.minLength && value.length < config.minLength) {
      issues.push(`❌ ${varName}: Too short (minimum ${config.minLength} characters)`);
      allValid = false;
      return;
    }

    log(`✅ ${varName}: Valid`, 'green');
  });

  // Additional validation for URLs
  if (envVars.BASE_URL && envVars.MS_REDIRECT_URI) {
    const baseUrlHost = new URL(envVars.BASE_URL).host;
    const redirectUriHost = new URL(envVars.MS_REDIRECT_URI).host;
    
    if (baseUrlHost !== redirectUriHost) {
      issues.push(`⚠️  URL mismatch: BASE_URL host (${baseUrlHost}) differs from MS_REDIRECT_URI host (${redirectUriHost})`);
    }
  }

  // Print issues
  if (issues.length > 0) {
    log('\n📋 Configuration Issues:', 'yellow');
    issues.forEach(issue => log(`   ${issue}`, 'yellow'));
  }

  if (allValid) {
    log('\n🎉 All required environment variables are properly configured!', 'green');
  } else {
    log('\n❌ Configuration validation failed!', 'red');
    log('Please fix the issues above before deploying to production.', 'red');
  }

  return allValid;
}

function validateDockerSetup() {
  log('\n🐳 Checking Docker setup...', 'blue');
  
  const requiredFiles = [
    'Dockerfile',
    'docker-compose.prod.yml',
    'docker-compose.dev.yml',
    '.dockerignore'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file}: Found`, 'green');
    } else {
      log(`❌ ${file}: Missing`, 'red');
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

function main() {
  log('🔧 OneDrive to Blackblaze Migration - Configuration Validator', 'blue');
  log('============================================================', 'blue');
  
  const args = process.argv.slice(2);
  const envFile = args[0] || '.env.prod';
  
  // Validate environment configuration
  const envValid = validateEnvFile(envFile);
  
  // Validate Docker setup
  const dockerValid = validateDockerSetup();
  
  // Final summary
  log('\n📊 Validation Summary:', 'blue');
  log('===================', 'blue');
  
  if (envValid && dockerValid) {
    log('✅ Ready for deployment!', 'green');
    process.exit(0);
  } else {
    log('❌ Please fix the issues above before proceeding.', 'red');
    process.exit(1);
  }
}

// Run the validator
if (require.main === module) {
  main();
}

module.exports = { validateEnvFile, validateDockerSetup };
