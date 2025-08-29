#!/bin/bash

# Local Development Setup Script for OneDrive to Blackblaze Migration

set -e

echo "🔧 Starting Local Development Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

COMPOSE_FILE="docker-compose.dev.yml"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local file not found, creating from template..."
    cp env.template .env.local
    print_warning "Please edit .env.local with your development configuration"
fi

print_status "Environment configuration found ✓"

# Build and start development environment
print_status "Building Docker images for development..."
docker-compose -f $COMPOSE_FILE build

print_status "Starting development containers..."
docker-compose -f $COMPOSE_FILE up -d

print_status "Waiting for services to start..."
sleep 15

# Health check
print_status "Performing health check..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "Backend health check passed ✓"
else
    print_warning "Backend health check failed, checking logs..."
    docker-compose -f $COMPOSE_FILE logs app
fi

# Show container status
print_status "Container status:"
docker-compose -f $COMPOSE_FILE ps

print_status "Development environment started successfully! 🎉"
echo ""
echo "📋 Development URLs:"
echo "   🌐 Frontend (Development): http://localhost:5173"
echo "   🔧 Backend API: http://localhost:3000"
echo "   📊 Health Check: http://localhost:3000/api/health"
echo "   🗄️  Redis: localhost:6379"
echo ""
echo "📝 Useful commands:"
echo "   📋 View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   📋 View app logs: docker-compose -f $COMPOSE_FILE logs -f app"
echo "   🔄 Restart: docker-compose -f $COMPOSE_FILE restart"
echo "   🛑 Stop: docker-compose -f $COMPOSE_FILE down"
echo "   📊 Status: docker-compose -f $COMPOSE_FILE ps"
echo "   🐚 Shell into app: docker-compose -f $COMPOSE_FILE exec app sh"
echo ""
print_warning "Make sure to configure your .env.local file with proper credentials!"
