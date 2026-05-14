@echo off
title BookFinder Server
cd /d "%~dp0"
echo ==============================================
echo   Starting BookFinder Server...
echo   Please wait.
echo ==============================================
node server.js
echo.
echo Server stopped.
pause
