@echo off
setlocal enabledelayedexpansion
title FoodQueue Launcher

echo ========================================================
echo        FOODQUEUE - START DEVELOPMENT SERVER
echo ========================================================
echo.

:: Switch to repository directory
cd /d "%~dp0"

:: 1. Check if port 3000 is already active and responding
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] FoodQueue is already running on http://localhost:3000!
    echo [*] Opening browser...
    start http://localhost:3000
    goto :done
)

:: 2. Launch Next.js dev server in a new dedicated window
echo [*] Launching Next.js dev server in background window...
start "FoodQueue_Dev_Server" cmd /k "title FoodQueue_Dev_Server && cd /d ""%~dp0"" && npm run dev"

:: 3. Wait for the server to become ready
echo [*] Waiting for server to initialize on http://localhost:3000...
set /a attempts=0
set /a max_attempts=30

:wait_loop
ping 127.0.0.1 -n 2 >nul
set /a attempts+=1

powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [OK] FoodQueue server is ready!
    echo [*] Opening http://localhost:3000 in your default browser...
    start http://localhost:3000
    goto :done
)

if %attempts% geq %max_attempts% (
    echo.
    echo [!] Server took longer than 30 seconds to respond.
    echo [*] Opening http://localhost:3000 anyway...
    start http://localhost:3000
    goto :done
)

<nul set /p=.
goto :wait_loop

:done
echo.
echo ========================================================
echo FoodQueue is running!
echo - Web App:  http://localhost:3000
echo - To Stop:  Run close.bat or close the FoodQueue server window.
echo ========================================================
ping 127.0.0.1 -n 3 >nul
exit /b 0
