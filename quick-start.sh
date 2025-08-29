#!/bin/bash

# Quick Start Script - OneDrive to Blackblaze Migration
# This script helps you choose between production and development setup

clear
echo "🚀 OneDrive to Blackblaze Migration - Quick Start"
echo "================================================="
echo ""
echo "Please select your deployment type:"
echo ""
echo "1) 🏠 Local Development Environment"
echo "2) 🌐 Production Deployment (Server: 10.1.76.210)"
echo "3) 📋 Environment Configuration Help"
echo "4) 🔍 Check Current Status"
echo "5) 🛑 Stop All Containers"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Setting up Local Development Environment..."
        echo "============================================="
        
        # Check if .env.local exists
        if [ ! -f ".env.local" ]; then
            echo "⚠️  Creating .env.local from template..."
            cp env.template .env.local
            echo "✅ .env.local created!"
            echo ""
            echo "⚠️  IMPORTANT: Please edit .env.local with your actual credentials:"
            echo "   - Microsoft OAuth credentials (MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID)"
            echo "   - Backblaze B2 credentials (B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME)"
            echo ""
            read -p "Press Enter after configuring .env.local to continue..."
        fi
        
        echo "🐳 Starting development containers..."
        docker-compose -f docker-compose.dev.yml build
        docker-compose -f docker-compose.dev.yml up -d
        
        echo ""
        echo "⏳ Waiting for services to start..."
        sleep 15
        
        echo ""
        echo "🎉 Development environment is ready!"
        echo ""
        echo "📋 Your application URLs:"
        echo "   🌐 Frontend: http://localhost:5173"
        echo "   🔧 Backend: http://localhost:3000"
        echo "   📊 Health: http://localhost:3000/api/health"
        echo ""
        ;;
        
    2)
        echo ""
        echo "🌐 Setting up Production Environment..."
        echo "======================================"
        
        # Check if .env.prod exists
        if [ ! -f ".env.prod" ]; then
            echo "❌ .env.prod file not found!"
            echo ""
            echo "Creating .env.prod template..."
            cp .env.prod .env.prod
            echo ""
            echo "⚠️  CRITICAL: You must configure .env.prod with your production credentials:"
            echo "   - Update BASE_URL and FRONTEND_URL to use server IP (10.1.76.210)"
            echo "   - Set strong SESSION_SECRET"
            echo "   - Configure Microsoft OAuth for production"
            echo "   - Configure Backblaze B2 for production"
            echo ""
            echo "Edit .env.prod now and then run this script again."
            exit 1
        fi
        
        echo "🐳 Deploying to production..."
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
        
        echo ""
        echo "⏳ Waiting for services to start..."
        sleep 15
        
        echo ""
        echo "🎉 Production deployment completed!"
        echo ""
        echo "📋 Your application URLs:"
        echo "   🌐 Application: http://10.1.76.210:3000"
        echo "   📊 Health: http://10.1.76.210:3000/api/health"
        echo ""
        echo "⚠️  Don't forget to:"
        echo "   - Update Microsoft App redirect URI to: http://10.1.76.210:3000/auth/microsoft/callback"
        echo "   - Configure firewall to allow port 3000"
        echo ""
        ;;
        
    3)
        echo ""
        echo "📋 Environment Configuration Help"
        echo "================================"
        echo ""
        echo "You need to configure the following:"
        echo ""
        echo "🔑 Microsoft Azure App Registration:"
        echo "   1. Go to Azure Portal > App Registrations"
        echo "   2. Create new registration or use existing"
        echo "   3. Set redirect URI:"
        echo "      - Dev: http://localhost:3000/auth/microsoft/callback"
        echo "      - Prod: http://10.1.76.210:3000/auth/microsoft/callback"
        echo "   4. Add API permissions: Files.Read.All, offline_access"
        echo "   5. Copy Client ID, Client Secret, and Tenant ID"
        echo ""
        echo "☁️  Backblaze B2 Configuration:"
        echo "   1. Create B2 bucket for your files"
        echo "   2. Create application key with read/write access"
        echo "   3. Copy Key ID, Application Key, and Bucket Name"
        echo ""
        echo "🔐 Security:"
        echo "   - Generate strong SESSION_SECRET (random 32+ character string)"
        echo "   - Use different credentials for dev/prod environments"
        echo ""
        ;;
        
    4)
        echo ""
        echo "🔍 Checking Current Status..."
        echo "============================"
        echo ""
        
        echo "Development containers:"
        docker-compose -f docker-compose.dev.yml ps 2>/dev/null || echo "No development containers running"
        echo ""
        
        echo "Production containers:"
        docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "No production containers running"
        echo ""
        
        echo "Testing health endpoints:"
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            echo "✅ Backend is healthy"
        else
            echo "❌ Backend is not responding"
        fi
        
        if curl -f http://localhost:5173 >/dev/null 2>&1; then
            echo "✅ Frontend dev server is running"
        else
            echo "ℹ️  Frontend dev server is not running (normal for production)"
        fi
        ;;
        
    5)
        echo ""
        echo "🛑 Stopping All Containers..."
        echo "============================="
        
        echo "Stopping development containers..."
        docker-compose -f docker-compose.dev.yml down 2>/dev/null || echo "No development containers to stop"
        
        echo "Stopping production containers..."
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || echo "No production containers to stop"
        
        echo "✅ All containers stopped"
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again and select 1-5."
        exit 1
        ;;
esac

echo ""
echo "📝 Useful commands for later:"
echo "   📋 View logs: docker-compose -f docker-compose.[dev|prod].yml logs -f"
echo "   🔄 Restart: docker-compose -f docker-compose.[dev|prod].yml restart"
echo "   🛑 Stop: docker-compose -f docker-compose.[dev|prod].yml down"
echo ""
