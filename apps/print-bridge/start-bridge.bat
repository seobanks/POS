@echo off
title Hanva POS - Local Print Bridge
color 0A

echo ========================================================
echo       HANVA POS - LOCAL PRINT BRIDGE (PETPOOJA STYLE)
echo ========================================================
echo.

set NODE_CMD=node
where node >nul 2>nul
if %errorlevel% neq 0 (
    if not exist "%~dp0node.exe" (
        echo [INFO] Node.js not detected on this PC.
        echo [INFO] Downloading lightweight portable engine (approx 30MB, one-time)...
        powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/win-x64/node.exe' -OutFile '%~dp0node.exe'"
        if not exist "%~dp0node.exe" (
            echo [ERROR] Failed to download node.exe. Please install Node.js from https://nodejs.org
            pause
            exit /b 1
        )
    )
    set NODE_CMD="%~dp0node.exe"
)

echo [INFO] Starting Hanva Print Bridge in background...
echo.
%NODE_CMD% "%~dp0bridge.js"

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Bridge stopped with error code %errorlevel%.
    pause
)
