@echo off
echo.
echo ========================================
echo   HOLITIME DEPLOYMENT TO CLOUD RUN
echo ========================================
echo.

echo Checking prerequisites...
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: gcloud CLI not found. Please install Google Cloud SDK.
    pause
    exit /b 1
)

echo Setting up Google Cloud project...
gcloud config set project elated-fabric-460119-t3

echo.
echo Starting deployment with Cloud Build...
echo This will:
echo   1. Build Docker image with PDF generation support
echo   2. Run database migrations
echo   3. Deploy to Cloud Run
echo.

pause

echo.
echo Deploying...
powershell -ExecutionPolicy Bypass -File "deploy.ps1" -Method cloudbuild

echo.
echo Deployment completed!
pause