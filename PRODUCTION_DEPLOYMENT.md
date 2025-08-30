# Production Deployment Guide

This guide covers deploying the OneDrive to Backblaze migration application in production with Docker.

## Architecture

```
                    Internet
                       |
                   [Nginx]  (Port 80/443)
                       |
                ┌──────────────┐
                │  Docker      │
                │  Network     │
                └──────────────┘
                       |
            ┌──────────┼──────────┐
            │          │          │
       [Frontend]  [Backend]  [Redis]
       (Nginx)     (Node.js)  (Cache/Jobs)
            │          │          │
            └──────────┼──────────┘
                       │
               [Migration Worker]
                   (Background)
```

## Features

- **Frontend**: React app served via Nginx (publicly accessible)
- **Backend**: Node.js API (internal Docker network only)
- **Security**: SSL/HTTPS, environment variables, Docker network isolation
- **Scalability**: Separate migration worker, Redis for job queues
- **Monitoring**: Health checks, logging, graceful shutdowns

## Prerequisites

1. **Docker & Docker Compose**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Domain Setup**
   - Point `files.iqubekct.ac.in` to your server's IP address
   - Update DNS A record: `files.iqubekct.ac.in -> YOUR_SERVER_IP`

3. **Firewall Configuration**
   ```bash
   # Allow HTTP and HTTPS traffic
   sudo ufw allow 80
   sudo ufw allow 443
   ```

## Quick Deployment

1. **Clone and Navigate**
   ```bash
   git clone <your-repo>
   cd <project-directory>
   ```

2. **Configure Environment**
   ```bash
   # Copy template and edit
   cp .env.prod.template .env.prod
   nano .env.prod  # Fill in your actual values
   ```

3. **Deploy**
   ```bash
   # Linux/macOS
   chmod +x deploy-prod.sh
   ./deploy-prod.sh
   
   # Windows
   deploy-prod.bat
   ```

## Manual Setup

### Step 1: Environment Configuration

Create `.env.prod` from template:

```bash
cp .env.prod.template .env.prod
```

Edit `.env.prod` with your values:

```env
# Project Configuration
COMPOSE_PROJECT_NAME=c2c_prod
BASE_URL=https://files.iqubekct.ac.in

# Microsoft OAuth (from Azure App Registration)
MS_CLIENT_ID=your_actual_client_id
MS_CLIENT_SECRET=your_actual_client_secret  
MS_TENANT_ID=your_actual_tenant_id

# Backblaze B2 (from B2 account)
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your_bucket_name

# Security (generate strong passwords)
SESSION_SECRET=your_32_char_session_secret
REDIS_PASSWORD=your_redis_password
```

### Step 2: SSL Certificates

#### Option A: Self-Signed (Development/Testing)
```bash
./setup-ssl.sh
```

#### Option B: Let's Encrypt (Production)
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d files.iqubekct.ac.in

# Copy to project
sudo cp /etc/letsencrypt/live/files.iqubekct.ac.in/fullchain.pem ssl/certs/
sudo cp /etc/letsencrypt/live/files.iqubekct.ac.in/privkey.pem ssl/private/nginx-selfsigned.key
sudo chown $USER:$USER ssl/certs/* ssl/private/*
```

### Step 3: Deploy

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Service Management

### Start Services
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f migration-worker
```

### Update Application
```bash
git pull
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Monitoring

### Health Checks
```bash
# Check if all services are healthy
docker-compose -f docker-compose.prod.yml ps

# Check frontend health
curl https://files.iqubekct.ac.in/health

# Check backend health (internal)
docker exec c2c_prod_backend curl http://localhost:3000/api/health
```

### Performance Monitoring
```bash
# Resource usage
docker stats

# Service-specific stats
docker stats c2c_prod_frontend c2c_prod_backend c2c_prod_redis
```

## Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Check environment variables
   docker-compose -f docker-compose.prod.yml config
   ```

2. **SSL certificate issues**
   ```bash
   # Regenerate self-signed certificates
   rm -rf ssl/
   ./setup-ssl.sh
   ```

3. **Permission issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod 600 ssl/private/*
   chmod 644 ssl/certs/*
   ```

4. **OAuth redirect issues**
   - Ensure `MS_REDIRECT_URI` in Azure matches `BASE_URL/auth/microsoft/callback`
   - Check that `BASE_URL` is correctly set in `.env.prod`

### Service-Specific Debugging

#### Frontend Issues
```bash
# Check nginx configuration
docker exec c2c_prod_frontend nginx -t

# View nginx logs
docker-compose -f docker-compose.prod.yml logs frontend

# Access container
docker exec -it c2c_prod_frontend /bin/sh
```

#### Backend Issues
```bash
# Check backend health
docker exec c2c_prod_backend curl http://localhost:3000/api/health

# View backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Access container
docker exec -it c2c_prod_backend /bin/sh
```

#### Database/Redis Issues
```bash
# Check Redis connection
docker exec c2c_prod_redis redis-cli ping

# View Redis logs
docker-compose -f docker-compose.prod.yml logs redis
```

## Security Considerations

1. **Environment Variables**: Never commit `.env.prod` to version control
2. **SSL Certificates**: Use proper certificates in production
3. **Network Security**: Backend is isolated in Docker network
4. **Session Security**: Strong session secrets and HTTPS-only cookies
5. **Rate Limiting**: Built-in rate limiting on API endpoints

## Backup & Recovery

### Backup
```bash
# Backup Redis data
docker exec c2c_prod_redis redis-cli BGSAVE

# Backup volumes
docker run --rm -v c2c_prod_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup-$(date +%Y%m%d).tar.gz /data

# Backup application data
tar czf app-backup-$(date +%Y%m%d).tar.gz server/data server/logs
```

### Recovery
```bash
# Restore Redis data
docker-compose -f docker-compose.prod.yml down
docker run --rm -v c2c_prod_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup-YYYYMMDD.tar.gz -C /
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Performance Optimization

1. **Resource Limits**: Configure memory and CPU limits in docker-compose.yml
2. **Caching**: Nginx caches static assets for 1 year
3. **Compression**: Gzip compression enabled for text resources
4. **Health Checks**: Automatic service restart on failure
5. **Log Rotation**: Consider setting up log rotation for production

## Support

For issues or questions:
1. Check the logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify environment configuration
3. Check service health endpoints
4. Review this documentation

## Architecture Benefits

✅ **Security**: Only frontend exposed publicly  
✅ **Scalability**: Separate worker for background jobs  
✅ **Reliability**: Health checks and automatic restarts  
✅ **Maintainability**: Environment-based configuration  
✅ **Performance**: Nginx serving static files, Redis caching  
✅ **Monitoring**: Comprehensive logging and health checks
