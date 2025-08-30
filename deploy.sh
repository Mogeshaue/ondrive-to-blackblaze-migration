#!/bin/bash

# Production deployment script for OneDrive to Blackblaze Migration App

set -e

echo "🚀 Starting production deployment..."

# Check if required files exist
if [ ! -f ".env.prod" ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please copy .env.prod.example to .env.prod and configure your environment variables."
    exit 1
fi

if [ ! -d "ssl" ]; then
    echo "⚠️  Warning: ssl directory not found!"
    echo "Please create ssl directory and add your SSL certificates:"
    echo "  - ssl/certificate.crt"
    echo "  - ssl/private.key"
    echo ""
    read -p "Continue without SSL? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load environment variables
export $(grep -v '^#' .env.prod | xargs)

echo "📦 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo "🗂️  Creating necessary directories..."
mkdir -p data logs config ssl

echo "🐳 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to be healthy..."
timeout 120 bash -c 'until docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; do sleep 2; done'

echo "📊 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "📋 Logs from services:"
docker-compose -f docker-compose.prod.yml logs --tail=10

echo "✅ Deployment completed!"
echo ""
echo "🌐 Your application should be available at:"
if [ -d "ssl" ]; then
    echo "   https://files.iqubekct.ac.in"
else
    echo "   http://localhost"
fi
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "   Check status: docker-compose -f docker-compose.prod.yml ps"
