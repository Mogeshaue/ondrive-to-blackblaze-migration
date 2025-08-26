@echo off
echo 🚀 Setting up OneDrive to B2 Migration Application...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Check if Rclone is installed
rclone version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Rclone is not installed. Please install Rclone manually from https://rclone.org/downloads/
    echo After installation, make sure 'rclone' is available in your PATH
    echo.
    echo Press any key to continue with setup...
    pause >nul
)

echo ✅ Rclone check completed

REM Install backend dependencies
echo 📦 Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please update .env file with your credentials before running the application
)

REM Create rclone.conf if it doesn't exist
if not exist rclone.conf (
    echo 📝 Creating rclone.conf from template...
    copy rclone.conf.example rclone.conf
    echo ⚠️  Please update rclone.conf with your credentials before running the application
)

REM Build frontend
echo 🔨 Building frontend...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build frontend
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ Setup completed!
echo.
echo 📋 Next steps:
echo 1. Update .env file with your Microsoft OAuth and B2 credentials
echo 2. Update rclone.conf with your B2 credentials
echo 3. Run 'npm start' to start the application
echo 4. Open http://localhost:3000 in your browser
echo.
echo 🔧 Configuration files:
echo - .env: Application configuration and OAuth settings
echo - rclone.conf: Rclone configuration for B2 backend
echo.
echo 📚 Documentation:
echo - Microsoft OAuth setup: https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
echo - B2 Application Keys: https://www.backblaze.com/b2/docs/application_keys.html
echo - Rclone documentation: https://rclone.org/docs/
echo.
pause
