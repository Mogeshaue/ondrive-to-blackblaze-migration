@echo off
REM Local Development Setup Script for OneDrive to Blackblaze Migration

echo 🔧 Starting Local Development Setup...

set COMPOSE_FILE=docker-compose.dev.yml

REM Check if .env.local exists
if not exist ".env.local" (
    echo [WARNING] .env.local file not found, creating from template...
    copy env.template .env.local
    echo [WARNING] Please edit .env.local with your development configuration
)

echo [INFO] Environment configuration found ✓

REM Build and start development environment
echo [INFO] Building Docker images for development...
docker-compose -f %COMPOSE_FILE% build

echo [INFO] Starting development containers...
docker-compose -f %COMPOSE_FILE% up -d

echo [INFO] Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Health check
echo [INFO] Performing health check...
curl -f http://localhost:3000/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Backend health check passed ✓
) else (
    echo [WARNING] Backend health check failed, checking logs...
    docker-compose -f %COMPOSE_FILE% logs app
)

REM Show container status
echo [INFO] Container status:
docker-compose -f %COMPOSE_FILE% ps

echo [INFO] Development environment started successfully! 🎉
echo.
echo 📋 Development URLs:
echo    🌐 Frontend (Development): http://localhost:5173
echo    🔧 Backend API: http://localhost:3000
echo    📊 Health Check: http://localhost:3000/api/health
echo    🗄️  Redis: localhost:6379
echo.
echo 📝 Useful commands:
echo    📋 View logs: docker-compose -f %COMPOSE_FILE% logs -f
echo    📋 View app logs: docker-compose -f %COMPOSE_FILE% logs -f app
echo    🔄 Restart: docker-compose -f %COMPOSE_FILE% restart
echo    🛑 Stop: docker-compose -f %COMPOSE_FILE% down
echo    📊 Status: docker-compose -f %COMPOSE_FILE% ps
echo    🐚 Shell into app: docker-compose -f %COMPOSE_FILE% exec app sh
echo.
echo [WARNING] Make sure to configure your .env.local file with proper credentials!

pause
