@echo off
REM Redis Setup Script for Windows

echo =========================================
echo Redis Setup for Research Assistance System
echo =========================================
echo.

echo Redis installation on Windows requires manual setup.
echo.
echo Please follow these steps:
echo.
echo 1. Download Redis for Windows from:
echo    https://github.com/microsoftarchive/redis/releases
echo.
echo 2. Extract the ZIP file to C:\Redis
echo.
echo 3. Run Redis server:
echo    C:\Redis\redis-server.exe
echo.
echo 4. Or install as Windows Service:
echo    C:\Redis\redis-server.exe --service-install
echo    C:\Redis\redis-server.exe --service-start
echo.
echo Alternative: Use Docker
echo    docker run -d -p 6379:6379 --name redis redis:7-alpine
echo.
echo =========================================
echo Configuration
echo =========================================
echo.
echo Add these to your .env file:
echo.
echo REDIS_HOST=localhost
echo REDIS_PORT=6379
echo REDIS_PASSWORD=
echo REDIS_TLS=false
echo REDIS_ENABLED=true
echo.
echo =========================================
echo Testing Redis Connection
echo =========================================
echo.

REM Try to ping Redis
redis-cli ping 2>nul
if %errorlevel% equ 0 (
    echo Redis is running and responding!
) else (
    echo Redis is not running. Please start Redis server first.
)

echo.
pause
