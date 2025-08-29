#!/bin/bash

# Production Deployment Script for OneDrive to Blackblaze Migration
# Server IP: 10.1.76.210

set -e

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="10.1.76.210"
APP_NAME="onedrive-migration"
COMPOSE_FILE="docker-compose.prod.yml"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    print_error ".env.prod file not found!"
    print_warning "Please create .env.prod file with production configuration"
    exit 1
fi

# Check if required environment variables are set in .env.prod
print_status "Checking production environment configuration..."
if ! grep -q "MS_CLIENT_ID=" .env.prod || grep -q "your_production_client_id_here" .env.prod; then
    print_error "MS_CLIENT_ID not properly configured in .env.prod"
    exit 1
fi

if ! grep -q "MS_CLIENT_SECRET=" .env.prod || grep -q "your_production_client_secret_here" .env.prod; then
    print_error "MS_CLIENT_SECRET not properly configured in .env.prod"
    exit 1
fi

print_status "Environment configuration validated ✓"

# Build and deploy
print_status "Building Docker images..."
docker-compose -f $COMPOSE_FILE build --no-cache

print_status "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

print_status "Starting production containers..."
docker-compose -f $COMPOSE_FILE up -d

print_status "Waiting for services to start..."
sleep 10

# Health check
print_status "Performing health check..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "Health check passed ✓"
else
    print_error "Health check failed!"
    print_warning "Check container logs with: docker-compose -f $COMPOSE_FILE logs"
    exit 1
fi

# Show container status
print_status "Container status:"
docker-compose -f $COMPOSE_FILE ps

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📋 Application URLs:"
echo "   🌐 Application: http://$SERVER_IP:3000"
echo "   📊 Health Check: http://$SERVER_IP:3000/api/health"
echo ""
echo "📝 Useful commands:"
echo "   📋 View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   🔄 Restart: docker-compose -f $COMPOSE_FILE restart"
echo "   🛑 Stop: docker-compose -f $COMPOSE_FILE down"
echo "   📊 Status: docker-compose -f $COMPOSE_FILE ps"
echo ""
print_warning "Make sure to:"
print_warning "1. Configure your firewall to allow port 3000"
print_warning "2. Update your Microsoft App registration redirect URI to: http://$SERVER_IP:3000/auth/microsoft/callback"
print_warning "3. Monitor the application logs for any issues"
