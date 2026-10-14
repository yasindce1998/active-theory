@echo off
cd /d "%~dp0"
if "%PORT%"=="" set PORT=7890
start "" http://localhost:%PORT%
node server.js
pause
