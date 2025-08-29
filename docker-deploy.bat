@echo off
REM Docker deployment script for OneDrive to Backblaze B2 Migration App (Windows)
REM Usage: docker-deploy.bat [dev|prod|standard|status|logs|cleanup|help]

setlocal enabledelayedexpansion

set COMPOSE_PROJECT_NAME=c2c-migration
set ENV_FILE=.env
set PROD_ENV_FILE=.env.production

if "%1"=="" (
    set COMMAND=standard
) else (
    set COMMAND=%1
)

REM Check Docker installation
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Create necessary directories
if not exist "logs" mkdir logs
if not exist "config" mkdir config
if not exist "data" mkdir data

if "%COMMAND%"=="dev" goto :deploy_dev
if "%COMMAND%"=="prod" goto :deploy_prod
if "%COMMAND%"=="standard" goto :deploy_standard
if "%COMMAND%"=="status" goto :show_status
if "%COMMAND%"=="logs" goto :show_logs
if "%COMMAND%"=="cleanup" goto :cleanup
if "%COMMAND%"=="help" goto :show_help
goto :unknown_command

:deploy_dev
echo [INFO] Deploying development environment...

REM Check if .env exists
if not exist "%ENV_FILE%" (
    if exist "env.template" (
        echo [INFO] Creating development environment file...
        copy env.template "%ENV_FILE%"
        echo [WARN] Please edit %ENV_FILE% with your values before running again.
        exit /b 1
    ) else (
        echo [ERROR] No environment template found. Please create %ENV_FILE% manually.
        exit /b 1
    )
)

REM Stop existing containers
docker-compose -p "%COMPOSE_PROJECT_NAME%-dev" -f docker-compose.dev.yml down

REM Build and start services
docker-compose -p "%COMPOSE_PROJECT_NAME%-dev" -f docker-compose.dev.yml up --build -d

echo [INFO] Development environment deployed successfully!
echo [INFO] Access the application at: http://localhost:3000
echo [INFO] Frontend dev server at: http://localhost:5173
echo [INFO] Redis at: localhost:6379
goto :end

:deploy_prod
echo [INFO] Deploying production environment...

REM Check if production .env exists
if not exist "%PROD_ENV_FILE%" (
    if exist "env.template" (
        echo [INFO] Creating production environment file...
        copy env.template "%PROD_ENV_FILE%"
        echo [WARN] Please edit %PROD_ENV_FILE% with your production values before running again.
        exit /b 1
    ) else (
        echo [ERROR] No environment template found. Please create %PROD_ENV_FILE% manually.
        exit /b 1
    )
)

REM Stop existing containers
docker-compose -p "%COMPOSE_PROJECT_NAME%-prod" -f docker-compose.prod.yml down

REM Build and start services
docker-compose -p "%COMPOSE_PROJECT_NAME%-prod" -f docker-compose.prod.yml up --build -d

echo [INFO] Production environment deployed successfully!
echo [INFO] Access the application at: http://localhost
echo [INFO] Redis at: localhost:6379
goto :end

:deploy_standard
echo [INFO] Deploying standard environment...

REM Check if .env exists
if not exist "%ENV_FILE%" (
    if exist "env.template" (
        echo [INFO] Creating environment file...
        copy env.template "%ENV_FILE%"
        echo [WARN] Please edit %ENV_FILE% with your values before running again.
        exit /b 1
    ) else (
        echo [ERROR] No environment template found. Please create %ENV_FILE% manually.
        exit /b 1
    )
)

REM Stop existing containers
docker-compose -p "%COMPOSE_PROJECT_NAME%" down

REM Build and start services
docker-compose -p "%COMPOSE_PROJECT_NAME%" up --build -d

echo [INFO] Standard environment deployed successfully!
echo [INFO] Access the application at: http://localhost:3000
echo [INFO] Redis at: localhost:6379
goto :end

:show_status
echo [INFO] Checking container status...
docker-compose -p "%COMPOSE_PROJECT_NAME%" ps

echo [INFO] Checking container health...
docker-compose -p "%COMPOSE_PROJECT_NAME%" exec app curl -f http://localhost:3000/health
if errorlevel 1 echo [WARN] Health check failed
goto :end

:show_logs
if "%2"=="" (
    set SERVICE=app
) else (
    set SERVICE=%2
)
echo [INFO] Showing logs for service: !SERVICE!
docker-compose -p "%COMPOSE_PROJECT_NAME%" logs -f !SERVICE!
goto :end

:cleanup
echo [INFO] Cleaning up containers and images...
docker-compose -p "%COMPOSE_PROJECT_NAME%" down -v
docker-compose -p "%COMPOSE_PROJECT_NAME%-dev" down -v
docker-compose -p "%COMPOSE_PROJECT_NAME%-prod" down -v
docker system prune -f
echo [INFO] Cleanup completed.
goto :end

:show_help
echo Docker deployment script for OneDrive to Backblaze B2 Migration App
echo.
echo Usage: %0 [COMMAND]
echo.
echo Commands:
echo   dev         Deploy development environment with hot reload
echo   prod        Deploy production environment
echo   standard    Deploy standard environment (default)
echo   status      Show container status and health
echo   logs [svc]  Show logs for service (default: app)
echo   cleanup     Stop containers and clean up
echo   help        Show this help message
echo.
echo Examples:
echo   %0 dev              # Deploy development environment
echo   %0 prod             # Deploy production environment
echo   %0 logs worker      # Show worker logs
echo   %0 status           # Check deployment status
goto :end

:unknown_command
echo [ERROR] Unknown command: %COMMAND%. Use 'help' to see available commands.
exit /b 1

:end
endlocal
