#!/bin/bash

# Quick setup script for Docker production deployment

echo "🔧 Setting up OneDrive to Blackblaze Migration App for Production"
echo "=================================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data logs config ssl

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo "📝 Creating .env.prod from template..."
    cp .env.prod .env.prod.bak 2>/dev/null || true
    
    echo "⚠️  Please edit .env.prod and configure the following:"
    echo "   - SESSION_SECRET (generate with: openssl rand -base64 32)"
    echo "   - MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET"
    echo "   - MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID"
    echo "   - B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME"
    echo ""
else
    echo "✅ .env.prod already exists"
fi

# Check for SSL certificates
if [ ! -f "ssl/certificate.crt" ] || [ ! -f "ssl/private.key" ]; then
    echo "🔐 SSL certificates not found in ssl/ directory"
    echo "   Please add your SSL certificates:"
    echo "   - ssl/certificate.crt"
    echo "   - ssl/private.key"
    echo ""
    echo "   For testing, you can generate self-signed certificates:"
    echo "   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
    echo "     -keyout ssl/private.key \\"
    echo "     -out ssl/certificate.crt \\"
    echo "     -subj '/CN=files.iqubekct.ac.in'"
    echo ""
else
    echo "✅ SSL certificates found"
fi

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    echo "⚠️  rclone is not installed on the host system"
    echo "   Please install rclone: https://rclone.org/downloads/"
    echo "   The backend container needs access to rclone for migrations"
    echo ""
else
    echo "✅ rclone is installed"
fi

echo "🏗️  Setup checklist:"
echo "   □ Configure .env.prod with your actual values"
echo "   □ Add SSL certificates to ssl/ directory"
echo "   □ Ensure rclone is installed on host"
echo "   □ Configure Microsoft OAuth app with redirect URI:"
echo "     https://files.iqubekct.ac.in/auth/microsoft/callback"
echo ""
echo "🚀 When ready, run: ./deploy.sh (Linux/Mac) or deploy.bat (Windows)"
echo ""
echo "📖 For detailed instructions, see: DOCKER_PRODUCTION.md"
