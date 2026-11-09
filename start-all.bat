@echo off
title Launching Zenora LMS...
echo ========================================================
echo   Zenora LMS - Starting Backend and Frontend Servers
echo ========================================================

echo 1. Starting Backend Server on http://localhost:5000...
start "Zenora LMS Backend (Port 5000)" cmd /k "cd /d %~dp0backend && node src/server.js"

echo Waiting 3 seconds for Backend initialization...
ping 127.0.0.1 -n 4 >nul

echo 2. Starting Frontend Web on http://localhost:8081...
start "Zenora LMS Frontend (Port 8081)" cmd /k "cd /d %~dp0frontend && set EXPO_NO_TELEMETRY=1 && set __UNSAFE_EXPO_HOME_DIRECTORY=%~dp0frontend\.expo && npx expo start --web --port 8081"

echo.
echo ========================================================
echo   Both servers launched in dedicated terminal windows!
echo   Frontend Web:  http://localhost:8081
echo   Backend API:   http://localhost:5000/api/health
echo ========================================================
echo.
ping 127.0.0.1 -n 3 >nul
