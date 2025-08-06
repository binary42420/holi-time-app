#!/usr/bin/env pwsh

# Local Docker Build and Deploy Script for Holitime
# This script builds the Docker image locally and deploys to Google Cloud Run

param(
    [string]$Tag = "latest",
    [switch]$SkipBuild = $false,
    [switch]$SkipPush = $false,
    [switch]$SkipDeploy = $false,
    [switch]$Verbose = $false
)

# Configuration
$PROJECT_ID = "elated-fabric-460119-t3"
$REGION = "us-west2"
$REPOSITORY = "holi-repo"
$IMAGE_NAME = "holi"
$SERVICE_NAME = "holitime"
$ARTIFACT_REGISTRY = "us-west2-docker.pkg.dev"
$FULL_IMAGE_NAME = "$ARTIFACT_REGISTRY/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME"

Write-Host "Starting local Docker build and deploy process..." -ForegroundColor Green
Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Image: ${FULL_IMAGE_NAME}:${Tag}" -ForegroundColor Cyan
Write-Host "Service: $SERVICE_NAME" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker version | Out-Null
} catch {
    Write-Error "Docker is not running or not installed. Please start Docker Desktop."
    exit 1
}

# Check if gcloud is authenticated
Write-Host "Checking Google Cloud authentication..." -ForegroundColor Yellow
try {
    $currentProject = gcloud config get-value project 2>$null
    if ($currentProject -ne $PROJECT_ID) {
        Write-Host "Setting project to $PROJECT_ID..." -ForegroundColor Yellow
        gcloud config set project $PROJECT_ID
    }
    
    # Configure Docker for Artifact Registry
    Write-Host "Configuring Docker for Artifact Registry..." -ForegroundColor Yellow
    gcloud auth configure-docker $ARTIFACT_REGISTRY --quiet
} catch {
    Write-Error "Please authenticate with Google Cloud: gcloud auth login"
    exit 1
}

# Step 1: Build Docker image locally
if (-not $SkipBuild) {
    Write-Host "Building Docker image locally..." -ForegroundColor Blue
    Write-Host "This may take 5-10 minutes depending on your machine..." -ForegroundColor Gray
    
    $buildArgs = @(
        "build"
        "--platform", "linux/amd64"
        "--build-arg", "DATABASE_URL=postgresql://user:pass@host:port/db"
        "-t", "${FULL_IMAGE_NAME}:${Tag}"
        "-t", "${FULL_IMAGE_NAME}:latest"
        "."
    )
    
    if ($Verbose) {
        $buildArgs += "--progress=plain"
    }
    
    $buildStart = Get-Date
    docker @buildArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed!"
        exit 1
    }
    
    $buildEnd = Get-Date
    $buildTime = $buildEnd - $buildStart
    Write-Host "Docker build completed in $($buildTime.Minutes)m $($buildTime.Seconds)s" -ForegroundColor Green
} else {
    Write-Host "Skipping Docker build..." -ForegroundColor Yellow
}

# Step 2: Push to Artifact Registry
if (-not $SkipPush) {
    Write-Host "Pushing image to Artifact Registry..." -ForegroundColor Blue
    
    $pushStart = Get-Date
    docker push "${FULL_IMAGE_NAME}:${Tag}"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker push failed!"
        exit 1
    }
    
    if ($Tag -ne "latest") {
        docker push "${FULL_IMAGE_NAME}:latest"
    }
    
    $pushEnd = Get-Date
    $pushTime = $pushEnd - $pushStart
    Write-Host "Image pushed in $($pushTime.Minutes)m $($pushTime.Seconds)s" -ForegroundColor Green
} else {
    Write-Host "Skipping Docker push..." -ForegroundColor Yellow
}

# Step 3: Deploy to Cloud Run
if (-not $SkipDeploy) {
    Write-Host "Deploying to Cloud Run..." -ForegroundColor Blue
    
    $deployStart = Get-Date
    
    $deployArgs = @(
        "run", "deploy", $SERVICE_NAME
        "--image=${FULL_IMAGE_NAME}:${Tag}"
        "--region=$REGION"
        "--platform=managed"
        "--allow-unauthenticated"
        "--port=8080"
        "--memory=2Gi"
        "--cpu=2"
        "--timeout=3600s"
        "--min-instances=0"
        "--max-instances=2"
        "--set-cloudsql-instances=elated-fabric-460119-t3:us-west2:holitime-db"
        "--set-secrets=DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest"
        "--set-env-vars=GCS_BUCKET_NAME=timesheethandsonlaboravar,DB_HOST=/cloudsql/elated-fabric-460119-t3:us-west2:holitime-db,DB_PORT=5432,NEXTAUTH_URL=https://holitime-438323004618.us-west2.run.app,NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1"
        "--no-cpu-throttling"
        "--quiet"
    )
    
    gcloud @deployArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Cloud Run deployment failed!"
        exit 1
    }
    
    $deployEnd = Get-Date
    $deployTime = $deployEnd - $deployStart
    Write-Host "Deployment completed in $($deployTime.Minutes)m $($deployTime.Seconds)s" -ForegroundColor Green
    
    # Get service URL
    Write-Host "Getting service URL..." -ForegroundColor Blue
    $serviceUrl = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>$null
    if ($serviceUrl) {
        Write-Host "Application deployed successfully!" -ForegroundColor Green
        Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
    }
} else {
    Write-Host "Skipping Cloud Run deployment..." -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Green
Write-Host "  - Image: ${FULL_IMAGE_NAME}:${Tag}" -ForegroundColor White
Write-Host "  - Service: $SERVICE_NAME" -ForegroundColor White
Write-Host "  - Region: $REGION" -ForegroundColor White

if (-not $SkipDeploy) {
    Write-Host "  - URL: https://holitime-438323004618.us-west2.run.app" -ForegroundColor White
}

Write-Host ""
Write-Host "All done! Your application should be live." -ForegroundColor Green

# Optional: Show recent logs
$showLogs = Read-Host "Would you like to view recent logs? (y/N)"
if ($showLogs -eq 'y' -or $showLogs -eq 'Y') {
    Write-Host "Showing recent logs..." -ForegroundColor Blue
    gcloud logs tail /gcp/run/holitime --region=$REGION --limit=50
}