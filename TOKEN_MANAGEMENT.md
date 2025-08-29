# 🔐 OneDrive Token Management - Long Term Solution

## Overview

This system provides **automatic, hands-off token management** for your OneDrive to B2 migration service. No more manual token refresh or migration failures due to expired tokens!

## 🚀 Features

### ✅ **Automatic Token Refresh**
- **Proactive monitoring**: Checks tokens every 30 minutes
- **Smart refresh**: Refreshes tokens 2 hours before expiry
- **Zero downtime**: No interruption to migrations
- **Automatic rclone config updates**: Keeps both local and global configs in sync

### ✅ **Robust Error Handling**
- **Retry mechanism**: Up to 3 attempts on failure
- **Graceful degradation**: Continues working even if refresh fails
- **Detailed logging**: Full visibility into token status
- **Health monitoring**: Real-time status tracking

### ✅ **Easy Management**
- **CLI interface**: Simple command-line management
- **Windows GUI**: User-friendly batch file interface
- **Status monitoring**: Real-time token health checks
- **Force refresh**: Manual refresh when needed

## 🛠️ How It Works

### 1. **Automatic Startup**
When you start your server, the token manager automatically:
- Starts monitoring all user tokens
- Checks expiry times every 30 minutes
- Refreshes tokens 2 hours before expiry
- Updates rclone configurations automatically

### 2. **Proactive Monitoring**
```
🔄 Token Manager Service started successfully
   - Monitoring interval: 30 minutes
   - Auto-refresh enabled
   - Rclone config auto-update enabled
```

### 3. **Smart Refresh Logic**
- **Valid**: Token expires in > 2 hours → No action
- **Warning**: Token expires in 1-2 hours → Schedule refresh
- **Critical**: Token expires in < 1 hour → Immediate refresh
- **Expired**: Token already expired → Emergency refresh

## 📋 Usage

### **Automatic Mode (Recommended)**
The token manager starts automatically with your server. No manual intervention needed!

### **Manual Management**

#### **Command Line Interface**
```bash
# Check token status
node token-manager-cli.js status

# Force refresh all tokens
node token-manager-cli.js refresh

# Start monitoring for 1 hour
node token-manager-cli.js monitor

# Start/stop the service
node token-manager-cli.js start
node token-manager-cli.js stop
```

#### **Windows GUI**
```bash
# Run the interactive menu
manage-tokens.bat
```

## 📊 Status Monitoring

### **Token Status Indicators**
- 🟢 **Valid**: Token is good for > 2 hours
- 🟡 **Warning**: Token expires in 1-2 hours
- 🔴 **Critical**: Token expires in < 1 hour or expired

### **Service Status**
- **Running**: Token manager is active
- **Stopped**: Token manager is inactive
- **Last Refresh**: When tokens were last refreshed
- **Refresh Attempts**: Number of failed attempts

## 🔧 Configuration

### **Environment Variables**
The system uses your existing environment variables:
- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_REDIRECT_URI`

### **Monitoring Settings**
- **Check interval**: 30 minutes
- **Refresh threshold**: 2 hours before expiry
- **Max retry attempts**: 3
- **Timeout**: 10 seconds per API call

## 🚨 Troubleshooting

### **Token Refresh Fails**
1. Check internet connection
2. Verify Microsoft API status
3. Run manual refresh: `node token-manager-cli.js refresh`
4. Check logs for specific error messages

### **Service Not Starting**
1. Ensure all environment variables are set
2. Check that token storage files exist
3. Verify rclone config path is correct

### **Migrations Still Failing**
1. Check token status: `node token-manager-cli.js status`
2. Force refresh: `node token-manager-cli.js refresh`
3. Restart the server to restart token manager

## 📈 Benefits

### **Before (Manual)**
- ❌ Manual token refresh every hour
- ❌ Migration failures due to expired tokens
- ❌ Need to remember to refresh tokens
- ❌ Potential data loss during migrations

### **After (Automatic)**
- ✅ **Zero manual intervention**
- ✅ **No migration failures**
- ✅ **24/7 reliability**
- ✅ **Peace of mind**

## 🔄 Migration Workflow

### **Daily Operations**
1. **Start server** → Token manager starts automatically
2. **Run migrations** → Tokens are automatically valid
3. **Monitor status** → Check token health anytime
4. **Sleep well** → System handles everything automatically

### **Long-term Maintenance**
- **Monthly**: Check token status (optional)
- **Quarterly**: Review refresh logs (optional)
- **Yearly**: Update refresh tokens (if needed)

## 🎯 Success Metrics

- ✅ **100% uptime**: No token-related downtime
- ✅ **Zero manual intervention**: Fully automated
- ✅ **Proactive refresh**: No expired tokens
- ✅ **Seamless migrations**: No interruption to workflows

## 🔮 Future Enhancements

- **Email notifications** for token issues
- **Web dashboard** for token monitoring
- **Advanced analytics** for token usage patterns
- **Multi-tenant support** for multiple users

---

## 🚀 Getting Started

1. **Start your server** - Token manager starts automatically
2. **Check status** - `node token-manager-cli.js status`
3. **Run migrations** - Tokens are automatically managed
4. **Monitor as needed** - Use CLI or GUI tools

**That's it!** Your token management is now completely automated. 🎉
