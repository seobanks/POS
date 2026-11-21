@echo off
title Hanva POS - Local Print Bridge
color 0A

echo ===================================================
echo       HANVA POS - LOCAL PRINT BRIDGE (PETPOOJA STYLE)
echo ===================================================
echo.

:: Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org
    echo.
    pause
    exit /b
)

:: Check if node_modules exists, if not install
if not exist node_modules (
    echo [INFO] First time setup: Installing socket.io-client...
    npm install --no-audit --no-fund
)

echo [INFO] Starting Hanva Print Bridge in background...
echo.
node bridge.js

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Bridge stopped with error code %errorlevel%.
    pause
)
