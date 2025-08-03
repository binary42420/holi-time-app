@echo off
echo.
echo ========================================
echo   HOLITIME DEPLOYMENT SCRIPT
echo ========================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available
    pause
    exit /b 1
)

echo Choose deployment method:
echo 1. Cloud Build (Recommended)
echo 2. Local Build
echo 3. Dry Run (Cloud Build)
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Starting Cloud Build deployment...
    powershell -ExecutionPolicy Bypass -File ".\deploy.ps1" -Method cloudbuild
) else if "%choice%"=="2" (
    echo.
    echo Starting Local deployment...
    powershell -ExecutionPolicy Bypass -File ".\deploy.ps1" -Method local
) else if "%choice%"=="3" (
    echo.
    echo Starting Dry Run...
    powershell -ExecutionPolicy Bypass -File ".\deploy.ps1" -Method cloudbuild -DryRun
) else (
    echo Invalid choice. Please run the script again.
)

echo.
pause