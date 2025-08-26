#!/bin/bash

# OneDrive to B2 Migration Setup Script

echo "🚀 Setting up OneDrive to B2 Migration Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if Rclone is installed
if ! command -v rclone &> /dev/null; then
    echo "⚠️  Rclone is not installed. Installing Rclone..."
    
    # Detect OS and install Rclone
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl https://rclone.org/install.sh | sudo bash
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install rclone
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        echo "Please install Rclone manually from https://rclone.org/downloads/"
        echo "After installation, make sure 'rclone' is available in your PATH"
    else
        echo "❌ Unsupported OS. Please install Rclone manually from https://rclone.org/downloads/"
        exit 1
    fi
fi

echo "✅ Rclone is installed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update .env file with your credentials before running the application"
fi

# Create rclone.conf if it doesn't exist
if [ ! -f rclone.conf ]; then
    echo "📝 Creating rclone.conf from template..."
    cp rclone.conf.example rclone.conf
    echo "⚠️  Please update rclone.conf with your credentials before running the application"
fi

# Build frontend
echo "🔨 Building frontend..."
cd client
npm run build
cd ..

echo "✅ Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your Microsoft OAuth and B2 credentials"
echo "2. Update rclone.conf with your B2 credentials"
echo "3. Run 'npm start' to start the application"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "🔧 Configuration files:"
echo "- .env: Application configuration and OAuth settings"
echo "- rclone.conf: Rclone configuration for B2 backend"
echo ""
echo "📚 Documentation:"
echo "- Microsoft OAuth setup: https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app"
echo "- B2 Application Keys: https://www.backblaze.com/b2/docs/application_keys.html"
echo "- Rclone documentation: https://rclone.org/docs/"
