@echo off
title Zenora LMS - Frontend Web (Port 8081)
cd /d "%~dp0frontend"
set EXPO_NO_TELEMETRY=1
set __UNSAFE_EXPO_HOME_DIRECTORY=%~dp0frontend\.expo
echo ========================================================
echo   Zenora LMS - Frontend Expo Web (Port 8081)
echo ========================================================
echo Starting Expo Web on http://localhost:8081...
npx expo start --web --port 8081
pause
