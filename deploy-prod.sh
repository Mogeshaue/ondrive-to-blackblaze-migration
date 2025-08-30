#!/bin/bash

# Production Deployment Script
# This script sets up and deploys the OneDrive to Backblaze migration application

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please copy .env.prod.template to .env.prod and fill in your configuration."
    exit 1
fi

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed!"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p ssl/certs ssl/private logs data server/logs server/data

# Setup SSL certificates if they don't exist
if [ ! -f ssl/certs/nginx-selfsigned.crt ] || [ ! -f ssl/private/nginx-selfsigned.key ]; then
    echo "🔒 Setting up SSL certificates..."
    ./setup-ssl.sh
fi

# Load environment variables
export $(grep -v '^#' .env.prod | xargs)

# Validate required environment variables
echo "✅ Validating environment variables..."
required_vars=(
    "MS_CLIENT_ID"
    "MS_CLIENT_SECRET" 
    "MS_TENANT_ID"
    "B2_APPLICATION_KEY_ID"
    "B2_APPLICATION_KEY"
    "B2_BUCKET_NAME"
    "SESSION_SECRET"
    "REDIS_PASSWORD"
    "BASE_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set!"
        exit 1
    fi
done

echo "✅ Environment validation passed!"

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout=300  # 5 minutes
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up (healthy)"; then
        echo "✅ Services are healthy!"
        break
    fi
    echo "Waiting for services... ($elapsed/$timeout seconds)"
    sleep 10
    elapsed=$((elapsed + 10))
done

if [ $elapsed -ge $timeout ]; then
    echo "❌ Services failed to become healthy within $timeout seconds"
    echo "Checking service logs..."
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

# Show running services
echo "📊 Service status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "🌐 Your application is now running at:"
echo "   Primary URL: $BASE_URL"
echo "   HTTP (redirects to HTTPS): http://files.iqubekct.ac.in"
echo "   HTTPS: https://files.iqubekct.ac.in"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs -f [service_name]"
echo "   Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "   Update: git pull && ./deploy-prod.sh"
echo ""
echo "🔍 Monitor your application:"
echo "   Frontend logs: docker-compose -f docker-compose.prod.yml logs -f frontend"
echo "   Backend logs: docker-compose -f docker-compose.prod.yml logs -f backend"
echo "   Worker logs: docker-compose -f docker-compose.prod.yml logs -f migration-worker"
