@echo off
title OneDrive Token Manager

echo.
echo ========================================
echo    OneDrive Token Manager
echo ========================================
echo.

:menu
echo Choose an option:
echo.
echo 1. Check token status
echo 2. Force refresh all tokens
echo 3. Start monitoring (1 hour)
echo 4. Start token manager service
echo 5. Stop token manager service
echo 6. Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto refresh
if "%choice%"=="3" goto monitor
if "%choice%"=="4" goto start
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto exit
goto menu

:status
echo.
echo Checking token status...
node token-manager-cli.js status
echo.
pause
goto menu

:refresh
echo.
echo Force refreshing tokens...
node token-manager-cli.js refresh
echo.
pause
goto menu

:monitor
echo.
echo Starting monitoring for 1 hour...
echo Press Ctrl+C to stop early
node token-manager-cli.js monitor
echo.
pause
goto menu

:start
echo.
echo Starting token manager service...
node token-manager-cli.js start
echo.
pause
goto menu

:stop
echo.
echo Stopping token manager service...
node token-manager-cli.js stop
echo.
pause
goto menu

:exit
echo.
echo Goodbye!
exit
