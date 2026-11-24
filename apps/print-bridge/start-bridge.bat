@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Hanva POS - Thermal Print Bridge
color 0A

echo ========================================================
echo       HANVA POS - THERMAL PRINT BRIDGE (PETPOOJA STYLE)
echo ========================================================
echo.

:: 1. Check if user opened directly inside WinRAR or Windows Zip preview
echo %CD% | findstr /i "Temp" >nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [ATTENTION] YOU ARE RUNNING DIRECTLY INSIDE A ZIP PREVIEW!
    echo ========================================================
    echo  You must EXTRACT the ZIP folder first!
    echo.
    echo  Step 1: Close this window.
    echo  Step 2: Right-click "hanva-print-bridge.zip" in Downloads.
    echo  Step 3: Click "Extract All..." (or WinRAR Extract Here).
    echo  Step 4: Open the extracted folder and run start-bridge.bat.
    echo ========================================================
    echo.
    pause
    exit /b 1
)

:: 2. Determine node.exe path
if exist "%~dp0node.exe" (
    set "NODE_CMD=%~dp0node.exe"
) else (
    where node >nul 2>nul
    if %errorlevel% equ 0 (
        set "NODE_CMD=node"
    ) else (
        echo [ERROR] node.exe was not found in:
        echo %~dp0
        echo Please ensure you extracted the complete ZIP folder.
        pause
        exit /b 1
    )
)

:: 3. Check if bridge.js exists
if not exist "%~dp0bridge.js" (
    echo [ERROR] bridge.js was not found in:
    echo %~dp0
    echo Please ensure all files were extracted properly.
    pause
    exit /b 1
)

echo [INFO] Starting Hanva Print Bridge...
echo.
"%NODE_CMD%" "%~dp0bridge.js"

echo.
echo ========================================================
echo  Hanva Print Bridge has stopped. Press any key to close.
echo ========================================================
pause
