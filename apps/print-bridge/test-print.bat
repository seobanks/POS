@echo off
setlocal EnableDelayedExpansion
title Hanva POS - Print Bridge Test Slip
color 0E

echo ========================================================
echo       HANVA POS - TEST CONFIGURED PRINTERS
echo ========================================================
echo.

:: Check if user opened the script directly inside a temporary zip folder
echo %~dp0 | findstr /i "Temp" >nul
if %errorlevel% equ 0 (
    echo [ERROR] You must EXTRACT the ZIP folder before running test-print!
    pause
    exit /b 1
)

set "NODE_CMD=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%~dp0node.exe" (
        set "NODE_CMD=%~dp0node.exe"
    ) else (
        echo [ERROR] Portable node.exe not found. Please run setup.bat first!
        pause
        exit /b 1
    )
)

%NODE_CMD% "%~dp0bridge.js" --test

echo.
echo ========================================================
echo  Test print finished. Press any key to close.
echo ========================================================
pause
