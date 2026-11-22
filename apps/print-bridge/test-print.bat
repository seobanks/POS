@echo off
title Hanva POS - Print Bridge Test Slip
color 0E

set NODE_CMD=node
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%~dp0node.exe" (
        set NODE_CMD="%~dp0node.exe"
    )
)

echo ========================================================
echo       HANVA POS - TEST CONFIGURED PRINTERS
echo ========================================================
echo.
%NODE_CMD% "%~dp0bridge.js" --test
echo.
pause
