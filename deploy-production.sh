#!/bin/bash

# Production Deployment Script for files.iqube.kct.ac.in
# Run this script to deploy the application to production

echo "🚀 Starting Production Deployment for files.iqube.kct.ac.in..."

# Check if .env.production exists and has been configured
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create and configure .env.production file first."
    exit 1
fi

# Check if Microsoft OAuth credentials are configured
if grep -q "your-microsoft-client-id-here" .env.production; then
    echo "❌ Warning: Microsoft OAuth credentials still contain placeholder values!"
    echo "Please update .env.production with your actual Microsoft Azure App Registration credentials."
    echo "Required values:"
    echo "- MS_CLIENT_ID: Your Azure App Client ID"
    echo "- MS_CLIENT_SECRET: Your Azure App Client Secret"
    echo "- MS_TENANT_ID: Your Azure Tenant ID"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start production containers
echo "🔨 Building and starting production containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 30

# Check container status
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

# Check application health
echo "🏥 Checking application health..."
if curl -f http://localhost:5173/health > /dev/null 2>&1; then
    echo "✅ Application is healthy!"
else
    echo "❌ Application health check failed!"
    echo "📋 Application logs:"
    docker logs c2c-app-prod --tail 20
fi

echo "🎉 Deployment complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Configure your reverse proxy/nginx to point files.iqube.kct.ac.in to 10.1.76.125:5173"
echo "2. Set up SSL certificate for HTTPS"
echo "3. Update Microsoft Azure App Registration redirect URI to: https://files.iqube.kct.ac.in/auth/microsoft/callback"
echo "4. Test the application at: https://files.iqube.kct.ac.in"
echo ""
echo "🔧 Useful Commands:"
echo "- View logs: docker logs c2c-app-prod"
echo "- Stop application: docker-compose -f docker-compose.prod.yml down"
echo "- Restart application: docker-compose -f docker-compose.prod.yml restart"
