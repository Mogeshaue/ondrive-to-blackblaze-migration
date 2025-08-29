# Docker Deployment Guide

This guide explains how to deploy the OneDrive to Backblaze B2 Migration Application using Docker.

## Prerequisites

### Required Software
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (included with Docker Desktop)
- **Git** (for cloning the repository)

### System Requirements
- **Minimum**: 4GB RAM, 2 CPU cores, 10GB free disk space
- **Recommended**: 8GB RAM, 4 CPU cores, 20GB free disk space

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd c2c
```

### 2. Configure Environment
```bash
# Copy environment template
cp env.template .env

# Edit the .env file with your actual values
# Required variables:
# - MS_CLIENT_ID
# - MS_CLIENT_SECRET
# - MS_TENANT_ID
# - B2_APPLICATION_KEY_ID
# - B2_APPLICATION_KEY
# - B2_BUCKET_NAME
# - SESSION_SECRET
```

### 3. Deploy
```bash
# For development (with hot reload)
./docker-deploy.sh dev       # Linux/Mac
docker-deploy.bat dev        # Windows

# For production
./docker-deploy.sh prod      # Linux/Mac
docker-deploy.bat prod       # Windows

# For standard deployment
./docker-deploy.sh           # Linux/Mac
docker-deploy.bat            # Windows
```

## Deployment Modes

### Development Mode
- **File**: `docker-compose.dev.yml`
- **Features**: Hot reload, source code mounting, development tools
- **Ports**: 3000 (API), 5173 (Vite dev server)
- **Usage**: Local development and testing

```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production Mode
- **File**: `docker-compose.prod.yml`
- **Features**: Optimized builds, resource limits, production settings
- **Port**: 80 (mapped to container port 3000)
- **Usage**: Production deployment

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Standard Mode
- **File**: `docker-compose.yml`
- **Features**: Basic deployment with all services
- **Port**: 3000
- **Usage**: Testing and staging environments

```bash
docker-compose up --build -d
```

## Services Architecture

### Application Service (`app`)
- **Base Image**: Node.js 18 Alpine
- **Purpose**: Main web application server
- **Dependencies**: Redis, Rclone
- **Health Check**: HTTP GET `/health`

### Worker Service (`worker`)
- **Base Image**: Node.js 18 Alpine
- **Purpose**: Background migration processing
- **Dependencies**: Redis, Rclone
- **Health Check**: Process monitoring

### Redis Service (`redis`)
- **Base Image**: Redis 7 Alpine
- **Purpose**: Job queue and session storage
- **Persistence**: Volume-mounted data
- **Health Check**: Redis PING command

## Environment Variables

### Required Variables
```env
# Microsoft OAuth
MS_CLIENT_ID=your_client_id
MS_CLIENT_SECRET=your_client_secret
MS_TENANT_ID=your_tenant_id
MS_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Backblaze B2
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your_bucket_name

# Application
PORT=3000
NODE_ENV=production
SESSION_SECRET=your_session_secret_here

# Rclone (automatically configured in Docker)
RCLONE_PATH=/usr/local/bin/rclone
RCLONE_CONFIG_PATH=/app/config/rclone.conf
```

### Optional Variables
```env
# Redis
REDIS_URL=redis://redis:6379

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

## Volume Management

### Persistent Volumes
- **`redis_data`**: Redis database persistence
- **`rclone_config`**: Rclone configuration files
- **`./logs`**: Application logs (host-mounted)
- **`./config`**: Configuration files (host-mounted)
- **`./data`**: Migration data (host-mounted)

### Volume Commands
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect c2c_redis_data

# Remove volumes (WARNING: Data loss)
docker volume rm c2c_redis_data c2c_rclone_config
```

## Container Management

### Basic Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart app

# View logs
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f redis

# Execute commands in container
docker-compose exec app bash
docker-compose exec redis redis-cli
```

### Health Monitoring
```bash
# Check container health
docker-compose ps

# Test application health
curl http://localhost:3000/health

# Monitor container resources
docker stats
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
netstat -tulpn | grep :3000

# Kill process or change port in docker-compose.yml
```

#### 2. Environment Variables Not Loading
```bash
# Check .env file exists and has correct format
cat .env

# Verify environment in container
docker-compose exec app env | grep MS_CLIENT_ID
```

#### 3. Redis Connection Issues
```bash
# Check Redis container status
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

#### 4. Rclone Not Found
```bash
# Verify Rclone installation in container
docker-compose exec app which rclone
docker-compose exec app rclone version
```

#### 5. Permission Issues (Linux/Mac)
```bash
# Fix file permissions
sudo chown -R $USER:$USER logs config data
chmod -R 755 logs config data
```

### Debugging

#### View Container Logs
```bash
# All services
docker-compose logs

# Specific service with follow
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 worker
```

#### Enter Container Shell
```bash
# Main application
docker-compose exec app sh

# Worker process
docker-compose exec worker sh

# Redis
docker-compose exec redis sh
```

#### Check Container Resources
```bash
# Resource usage
docker stats

# Container processes
docker-compose exec app ps aux
```

## Security Considerations

### Production Deployment
1. **Use strong secrets**: Generate secure values for `SESSION_SECRET`
2. **Enable Redis authentication**: Uncomment `requirepass` in `redis.conf`
3. **Configure CORS properly**: Set specific origins in production
4. **Use HTTPS**: Configure reverse proxy (nginx, Traefik)
5. **Limit resources**: Set appropriate memory and CPU limits
6. **Regular updates**: Keep base images and dependencies updated

### Network Security
```yaml
# Add to docker-compose.prod.yml
networks:
  frontend:
    external: false
  backend:
    external: false
```

## Performance Optimization

### Resource Limits
```yaml
# Example resource configuration
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

### Redis Optimization
- Enable persistence: `appendonly yes`
- Set memory limit: `maxmemory 256mb`
- Configure eviction policy: `maxmemory-policy allkeys-lru`

## Backup and Recovery

### Database Backup
```bash
# Backup Redis data
docker-compose exec redis redis-cli BGSAVE

# Copy Redis dump
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./backup/
```

### Configuration Backup
```bash
# Backup configuration
tar -czf backup-$(date +%Y%m%d).tar.gz config/ logs/ .env
```

### Recovery
```bash
# Restore Redis data
docker cp ./backup/dump.rdb $(docker-compose ps -q redis):/data/
docker-compose restart redis

# Restore configuration
tar -xzf backup-20231201.tar.gz
```

## Monitoring and Logging

### Log Aggregation
- Logs are automatically rotated using Winston
- Container logs available via `docker-compose logs`
- Application logs stored in `./logs/` directory

### Health Monitoring
- Built-in health checks for all services
- Health endpoint: `GET /health`
- Prometheus metrics available (if configured)

### Alerting
Consider integrating with:
- **Grafana** for visualization
- **Prometheus** for metrics collection
- **AlertManager** for notifications

## Scaling

### Horizontal Scaling
```bash
# Scale worker instances
docker-compose up --scale worker=3

# Scale with specific compose file
docker-compose -f docker-compose.prod.yml up --scale worker=2 -d
```

### Load Balancing
For production, consider:
- **nginx** reverse proxy
- **HAProxy** load balancer
- **Traefik** automatic service discovery

## Support

### Getting Help
1. Check container logs: `docker-compose logs`
2. Verify environment configuration
3. Test individual services
4. Review this documentation
5. Check application health endpoint

### Useful Commands Reference
```bash
# Deployment
./docker-deploy.sh dev          # Development
./docker-deploy.sh prod         # Production
./docker-deploy.sh status       # Check status

# Management
docker-compose ps               # List containers
docker-compose logs -f app      # Follow logs
docker-compose exec app bash    # Enter container
docker-compose down -v          # Remove everything

# Debugging
docker-compose config           # Validate compose file
docker system df                # Check disk usage
docker system prune             # Clean up unused resources
```
