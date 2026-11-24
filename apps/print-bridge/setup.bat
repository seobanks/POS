@echo off
setlocal EnableDelayedExpansion
title Hanva POS - Printer Setup Wizard
color 0B

echo ========================================================
echo     HANVA POS - MULTI-PRINTER SETUP WIZARD (PETPOOJA STYLE)
echo ========================================================
echo.

:: Check if user opened the script directly inside a temporary zip folder
echo %~dp0 | findstr /i "Temp" >nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [ATTENTION] YOU OPENED THIS FILE DIRECTLY INSIDE A ZIP!
    echo ========================================================
    echo  You must EXTRACT the ZIP folder before running setup!
    echo.
    echo  Step 1: Close this window.
    echo  Step 2: Right-click "hanva-print-bridge.zip" in Downloads.
    echo  Step 3: Click "Extract All..." and click "Extract".
    echo  Step 4: Open the extracted folder and double-click setup.bat.
    echo ========================================================
    echo.
    pause
    exit /b 1
)

:: Check if bridge.js exists
if not exist "%~dp0bridge.js" (
    echo.
    echo [ERROR] bridge.js was not found in:
    echo %~dp0
    echo Please make sure you extracted all files from the ZIP folder!
    echo.
    pause
    exit /b 1
)

:: Check if node is installed, or download portable node.exe
set "NODE_CMD=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
    if not exist "%~dp0node.exe" (
        echo [INFO] Node.js runtime not found on this computer.
        echo [INFO] Downloading lightweight portable engine (one-time download)...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/win-x64/node.exe', '%~dp0node.exe')"
        if not exist "%~dp0node.exe" (
            echo.
            echo [ERROR] Could not download portable node.exe automatically.
            echo Please install Node.js from https://nodejs.org and run setup.bat again.
            echo.
            pause
            exit /b 1
        )
        echo [INFO] Portable engine downloaded successfully!
        echo.
    )
    set "NODE_CMD=%~dp0node.exe"
)

echo [INFO] Launching Hanva Printer Setup Wizard...
echo.
%NODE_CMD% "%~dp0bridge.js" --setup

echo.
echo ========================================================
echo  Setup process finished. Press any key to close this window.
echo ========================================================
pause
