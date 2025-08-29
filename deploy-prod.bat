@echo off
REM Production Deployment Script for OneDrive to Blackblaze Migration
REM Server IP: 10.1.76.210

echo 🚀 Starting Production Deployment...

set SERVER_IP=10.1.76.210
set APP_NAME=onedrive-migration
set COMPOSE_FILE=docker-compose.prod.yml

REM Check if .env.prod exists
if not exist ".env.prod" (
    echo [ERROR] .env.prod file not found!
    echo [WARNING] Please create .env.prod file with production configuration
    exit /b 1
)

echo [INFO] Environment configuration found ✓

REM Build and deploy
echo [INFO] Building Docker images...
docker-compose -f %COMPOSE_FILE% build --no-cache

echo [INFO] Stopping existing containers...
docker-compose -f %COMPOSE_FILE% down

echo [INFO] Starting production containers...
docker-compose -f %COMPOSE_FILE% up -d

echo [INFO] Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Health check
echo [INFO] Performing health check...
curl -f http://localhost:3000/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Health check passed ✓
) else (
    echo [ERROR] Health check failed!
    echo [WARNING] Check container logs with: docker-compose -f %COMPOSE_FILE% logs
    exit /b 1
)

REM Show container status
echo [INFO] Container status:
docker-compose -f %COMPOSE_FILE% ps

echo [INFO] Deployment completed successfully! 🎉
echo.
echo 📋 Application URLs:
echo    🌐 Application: http://%SERVER_IP%:3000
echo    📊 Health Check: http://%SERVER_IP%:3000/api/health
echo.
echo 📝 Useful commands:
echo    📋 View logs: docker-compose -f %COMPOSE_FILE% logs -f
echo    🔄 Restart: docker-compose -f %COMPOSE_FILE% restart
echo    🛑 Stop: docker-compose -f %COMPOSE_FILE% down
echo    📊 Status: docker-compose -f %COMPOSE_FILE% ps
echo.
echo [WARNING] Make sure to:
echo [WARNING] 1. Configure your firewall to allow port 3000
echo [WARNING] 2. Update your Microsoft App registration redirect URI to: http://%SERVER_IP%:3000/auth/microsoft/callback
echo [WARNING] 3. Monitor the application logs for any issues

pause
