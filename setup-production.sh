#!/bin/bash

# Quick Production Setup and Deployment Script
# This script performs the complete setup for production deployment

echo "🚀 OneDrive to Backblaze Migration - Production Setup"
echo "====================================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Check if .env.prod exists and guide user
if [ ! -f .env.prod ]; then
    echo ""
    echo "⚙️  Environment Configuration Required"
    echo "======================================="
    echo "Before proceeding, you need to configure your environment variables."
    echo ""
    echo "1. Copy the template:"
    echo "   cp .env.prod.template .env.prod"
    echo ""
    echo "2. Edit .env.prod with your actual values:"
    echo "   - MS_CLIENT_ID (from Azure App Registration)"
    echo "   - MS_CLIENT_SECRET (from Azure App Registration)" 
    echo "   - MS_TENANT_ID (from Azure App Registration)"
    echo "   - B2_APPLICATION_KEY_ID (from Backblaze B2)"
    echo "   - B2_APPLICATION_KEY (from Backblaze B2)"
    echo "   - B2_BUCKET_NAME (your B2 bucket name)"
    echo "   - SESSION_SECRET (generate a strong 32+ character secret)"
    echo "   - REDIS_PASSWORD (generate a strong password)"
    echo ""
    echo "3. Update your Azure App Registration redirect URI to:"
    echo "   https://files.iqubekct.ac.in/auth/microsoft/callback"
    echo ""
    
    # Create .env.prod from template
    cp .env.prod.template .env.prod
    echo "✅ Created .env.prod from template"
    echo ""
    echo "Please edit .env.prod with your actual values, then run this script again."
    exit 0
fi

echo "✅ Environment configuration found"

# Setup SSL certificates
echo ""
echo "🔒 Setting up SSL certificates..."
if [ ! -f ssl/certs/nginx-selfsigned.crt ] || [ ! -f ssl/private/nginx-selfsigned.key ]; then
    ./setup-ssl.sh
else
    echo "✅ SSL certificates already exist"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs data server/logs server/data

# Load and validate environment
echo "🔍 Validating environment configuration..."
if ! grep -q "your_actual" .env.prod; then
    echo "✅ Environment variables appear to be configured"
else
    echo "⚠️  Warning: Some environment variables still contain placeholder values"
    echo "   Please update .env.prod with your actual values before deployment"
fi

# Show deployment options
echo ""
echo "🎯 Deployment Options"
echo "==================="
echo "1. Quick Deploy (recommended):"
echo "   ./deploy-prod.sh"
echo ""
echo "2. Manual Deploy:"
echo "   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
echo ""
echo "3. Deploy with logs:"
echo "   docker-compose -f docker-compose.prod.yml --env-file .env.prod up --build"
echo ""

# Ask user if they want to deploy now
read -p "🚀 Deploy now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting deployment..."
    ./deploy-prod.sh
else
    echo ""
    echo "📋 Next Steps:"
    echo "1. Review your .env.prod configuration"
    echo "2. Ensure DNS points files.iqubekct.ac.in to this server"
    echo "3. Run ./deploy-prod.sh when ready"
    echo ""
    echo "📚 Documentation: Read PRODUCTION_DEPLOYMENT.md for detailed instructions"
fi
