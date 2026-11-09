@echo off
title Zenora LMS - Backend Server (Port 5000)
cd /d "%~dp0backend"
echo ========================================================
echo   Zenora LMS - Backend Server (Port 5000)
echo ========================================================
node src/server.js
pause

