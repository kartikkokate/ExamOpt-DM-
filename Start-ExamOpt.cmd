@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules\ai (
  echo Run npm ci in this folder once, then run this file again.
  pause
  exit /b 1
)
node --env-file-if-exists=.env server.mjs
pause
