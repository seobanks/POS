@echo off
title Hanva POS - Printer Setup Wizard
color 0B

echo ===================================================
echo     HANVA POS - PRINTER SETUP WIZARD (PETPOOJA STYLE)
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org
    echo.
    pause
    exit /b
)

if not exist node_modules (
    echo [INFO] Installing required driver components...
    call npm install --no-audit --no-fund
)

node bridge.js --setup

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Setup encountered an issue.
    pause
)
