@echo off
setlocal enabledelayedexpansion
title FoodQueue Shutdown

echo ========================================================
echo        FOODQUEUE - STOP DEVELOPMENT SERVER
echo ========================================================
echo.

cd /d "%~dp0"
set "STOPPED=0"

:: 1. Terminate processes listening on port 3000 via PowerShell
echo [*] Checking for active processes on port 3000...
powershell -Command "$pids = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($pids) { foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Output $p } }" > "%temp%\foodqueue_pids.txt" 2>nul

for /f "usebackq tokens=*" %%p in ("%temp%\foodqueue_pids.txt") do (
    if not "%%p"=="" (
        echo [*] Terminated process on port 3000 ^(PID: %%p^)
        set "STOPPED=1"
    )
)
if exist "%temp%\foodqueue_pids.txt" del "%temp%\foodqueue_pids.txt" >nul 2>&1

:: 2. Fallback check via netstat
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    echo [*] Force stopping PID %%a on port 3000...
    taskkill /F /T /PID %%a >nul 2>&1
    set "STOPPED=1"
)

:: 3. Terminate dedicated launcher window if open
taskkill /F /T /FI "WINDOWTITLE eq FoodQueue_Dev_Server*" >nul 2>&1

echo.
if "%STOPPED%"=="1" (
    echo [OK] FoodQueue server stopped successfully. Port 3000 is now free.
) else (
    echo [*] No active FoodQueue server was found running on port 3000.
)

echo ========================================================
echo Shutdown complete.
echo ========================================================
ping 127.0.0.1 -n 2 >nul
exit /b 0
