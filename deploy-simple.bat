@echo off
echo ========================================
echo HoliTime - Deploy to Google Cloud Run
echo ========================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is required but not found
    pause
    exit /b 1
)

echo Running deployment script...
echo.

powershell -ExecutionPolicy Bypass -File "install-and-deploy.ps1"

echo.
echo Deployment script completed.
pause