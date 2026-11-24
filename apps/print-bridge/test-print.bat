@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Hanva POS - Print Bridge Test Slip
color 0E

echo ========================================================
echo       HANVA POS - TEST CONFIGURED PRINTERS
echo ========================================================
echo.

:: 1. Check if user opened directly inside WinRAR or Windows Zip preview
echo %CD% | findstr /i "Temp" >nul
if %errorlevel% equ 0 (
    echo [ERROR] You must EXTRACT the ZIP folder before running test-print!
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

echo [INFO] Sending test prints to Cashier and Kitchen printers...
echo.
"%NODE_CMD%" "%~dp0bridge.js" --test

echo.
echo ========================================================
echo  Test print finished. Press any key to close.
echo ========================================================
pause
