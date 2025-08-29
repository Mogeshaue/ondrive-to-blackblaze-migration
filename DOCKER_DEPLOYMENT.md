# Docker Deployment Guide
## OneDrive to Blackblaze Migration Application

This guide covers deploying the application in both **Production** and **Local Development** environments using Docker.

## 🏗️ Architecture Overview

The application consists of:
- **Frontend**: React + TypeScript (Vite dev server)
- **Backend**: Node.js + Express
- **Database**: Redis for session and job queue management
- **File Transfer**: rclone for OneDrive to Backblaze migration

## 📋 Prerequisites

### For Local Development:
- Docker Desktop installed
- Git
- Basic knowledge of environment variables

### For Production Server (10.1.76.210):
- Docker and Docker Compose installed
- Port 3000 available
- SSL certificate (recommended for production)

## 🔧 Environment Configuration

### 1. Production Environment (.env.prod)

```bash
# Copy the template and configure for production
cp .env.prod .env.prod.example
```

**Required Configuration:**
```env
NODE_ENV=production
BASE_URL=http://10.1.76.210:3000
FRONTEND_URL=http://10.1.76.210:3000

# Microsoft OAuth (Register app in Azure Portal)
MS_CLIENT_ID=your_azure_app_client_id
MS_CLIENT_SECRET=your_azure_app_client_secret
MS_TENANT_ID=your_azure_tenant_id
MS_REDIRECT_URI=http://10.1.76.210:3000/auth/microsoft/callback

# Backblaze B2 Credentials
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_NAME=your_b2_bucket_name

# Security (Generate strong random strings)
SESSION_SECRET=your_super_secure_session_secret_here
CORS_ORIGIN=http://10.1.76.210:3000
```

### 2. Local Development Environment (.env.local)

```bash
# Copy the template and configure for development
cp env.template .env.local
```

**Required Configuration:**
```env
NODE_ENV=development
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Microsoft OAuth (Use same Azure app or create dev app)
MS_CLIENT_ID=your_azure_app_client_id
MS_CLIENT_SECRET=your_azure_app_client_secret
MS_TENANT_ID=your_azure_tenant_id
MS_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Backblaze B2 Credentials (Use test bucket)
B2_APPLICATION_KEY_ID=your_dev_b2_key_id
B2_APPLICATION_KEY=your_dev_b2_application_key
B2_BUCKET_NAME=your_dev_b2_bucket_name

# Security
SESSION_SECRET=development_session_secret
CORS_ORIGIN=http://localhost:5173
```

## 🚀 Deployment Instructions

### Production Deployment (Server: 10.1.76.210)

#### Option 1: Using Deployment Script (Recommended)

**Windows:**
```cmd
deploy-prod.bat
```

**Linux/Mac:**
```bash
chmod +x deploy-prod.sh
./deploy-prod.sh
```

#### Option 2: Manual Deployment

```bash
# 1. Build and start production containers
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 2. Check container status
docker-compose -f docker-compose.prod.yml ps

# 3. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Local Development Setup

#### Option 1: Using Setup Script (Recommended)

**Windows:**
```cmd
dev-setup.bat
```

**Linux/Mac:**
```bash
chmod +x dev-setup.sh
./dev-setup.sh
```

#### Option 2: Manual Setup

```bash
# 1. Ensure .env.local exists
cp env.template .env.local
# Edit .env.local with your development configuration

# 2. Build and start development containers
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d

# 3. Check container status
docker-compose -f docker-compose.dev.yml ps
```

## 🌐 Application URLs

### Production (10.1.76.210):
- **Application**: http://10.1.76.210:3000
- **Health Check**: http://10.1.76.210:3000/api/health

### Development (localhost):
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Redis**: localhost:6379

## 🔍 Monitoring & Troubleshooting

### Health Checks
```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-08-29T...",
  "environment": "production",
  "version": "1.0.0"
}
```

### Container Management

```bash
# View all container logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f redis

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Get shell access to app container
docker-compose -f docker-compose.prod.yml exec app sh
```

### Common Issues & Solutions

1. **Port Already in Use**
   ```bash
   # Find and kill process using port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

3. **Container Build Issues**
   ```bash
   # Clean rebuild
   docker-compose -f docker-compose.prod.yml build --no-cache
   docker system prune -f
   ```

## 🔐 Security Considerations

### Production Security Checklist:
- [ ] Use strong, unique `SESSION_SECRET`
- [ ] Configure HTTPS/SSL (not covered in this setup)
- [ ] Restrict Redis access
- [ ] Monitor application logs
- [ ] Regular security updates
- [ ] Firewall configuration

### Microsoft Azure App Registration:
1. **Redirect URIs**:
   - Production: `http://10.1.76.210:3000/auth/microsoft/callback`
   - Development: `http://localhost:3000/auth/microsoft/callback`

2. **API Permissions**:
   - Microsoft Graph: `Files.Read.All`
   - Microsoft Graph: `offline_access`

## 📊 Performance & Scaling

### Resource Requirements:
- **Minimum**: 2 CPU cores, 4GB RAM
- **Recommended**: 4 CPU cores, 8GB RAM
- **Storage**: 50GB+ for temporary migration files

### Scaling Options:
- Horizontal scaling with load balancer
- Redis clustering for high availability
- Separate worker containers for migrations

## 🔄 Updates & Maintenance

### Update Application:
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Backup Important Data:
```bash
# Backup Redis data
docker exec onedrive-redis redis-cli BGSAVE

# Backup application logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## 📞 Support

For issues or questions:
1. Check container logs first
2. Verify environment configuration
3. Test health endpoints
4. Review Azure app registration settings

---

**Happy Migrating! 🚀**
