#!/usr/bin/env pwsh
# Holitime App - Complete Rebuild and Deploy to Google Cloud Run
# This script handles the complete deployment pipeline for the Holitime application

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "elated-fabric-460119-t3",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "holitime",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west2",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipMigrations,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [int]$MaxInstances = 1,
    
    [Parameter(Mandatory=$false)]
    [int]$MinInstances = 1,
    
    [Parameter(Mandatory=$false)]
    [string]$Memory = "2Gi",
    
    [Parameter(Mandatory=$false)]
    [string]$CPU = "1",
    
    [Parameter(Mandatory=$false)]
    [int]$Timeout = 300,

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

# Configuration
$Config = @{
    ProjectId = $ProjectId
    ServiceName = $ServiceName
    Region = $Region
    Environment = $Environment
    CloudSqlInstance = "$ProjectId`:$Region`:holitime-db"
    ContainerRegistry = "gcr.io/$ProjectId/$ServiceName"
    LogFile = "deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    BackupDir = "deployment-backups"
}

# Color output functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Write-Success { param([string]$Message) Write-ColorOutput "✓ $Message" "Green" }
function Write-Error { param([string]$Message) Write-ColorOutput "✗ $Message" "Red" }
function Write-Warning { param([string]$Message) Write-ColorOutput "⚠ $Message" "Yellow" }
function Write-Info { param([string]$Message) Write-ColorOutput "ℹ $Message" "Cyan" }
function Write-Step { param([string]$Message) Write-ColorOutput "🚀 $Message" "Magenta" }

# Error handling
$ErrorActionPreference = "Stop"
trap {
    Write-Error "Deployment failed with error: $_"
    Write-Info "Check the log file: $($Config.LogFile)"
    exit 1
}

# Utility functions
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$IgnoreErrors
    )
    
    Write-Host "Executing: $Command" -ForegroundColor DarkGray
    if ($DryRun) {
        Write-Info "[DRY RUN] Would execute: $Command"
        return $true
    }
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0 -and -not $IgnoreErrors) {
            throw "Command failed with exit code: $LASTEXITCODE"
        }
        Write-Host "$Description completed successfully" -ForegroundColor DarkGray
        return $true
    } catch {
        if ($IgnoreErrors) {
            Write-Warning "$Description failed: $_"
            return $false
        } else {
            throw "$Description failed: $_"
        }
    }
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check required commands
    $requiredCommands = @("gcloud", "docker", "npm")
    foreach ($cmd in $requiredCommands) {
        if (-not (Test-Command $cmd)) {
            throw "$cmd is not installed or not in PATH"
        }
        Write-Success "$cmd is available"
    }
    
    # Check Google Cloud authentication
    Write-Info "Checking Google Cloud authentication..."
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $account) {
        throw "Not authenticated with Google Cloud. Run 'gcloud auth login' first."
    }
    Write-Success "Authenticated as: $account"
    
    # Set project
    Write-Info "Setting Google Cloud project..."
    Invoke-SafeCommand "gcloud config set project $($Config.ProjectId)" "Set project"
    
    # Check Docker daemon
    Write-Info "Checking Docker daemon..."
    try {
        docker info | Out-Null
        Write-Success "Docker daemon is running"
    } catch {
        throw "Docker daemon is not running. Please start Docker Desktop."
    }
}

function Initialize-Secrets {
    Write-Step "Initializing Google Cloud secrets..."
    
    if (-not (Test-Path ".env.production")) {
        Write-Warning ".env.production file not found, skipping automatic secret initialization"
        return
    }
    
    $envVars = @{}
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim('"')
            $envVars[$key] = $value
        }
    }
    
    $requiredSecrets = @(
        "DATABASE_URL",
        "DATABASE_URL_DIRECT",
        "NEXTAUTH_SECRET", 
        "NEXTAUTH_URL",
        "JWT_SECRET",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_API_KEY",
        "GOOGLE_AI_API_KEY",
        "SMTP_HOST",
        "SMTP_PORT", 
        "SMTP_USER",
        "SMTP_PASS",
        "PROJECT_ID",
        "ENV",
        "GCS_AVATAR_BUCKET"
    )
    
    foreach ($secretName in $requiredSecrets) {
        Write-Info "Processing secret: $secretName"
        
        # Check if secret exists
        $secretExists = $false
        try {
            gcloud secrets describe $secretName --project $Config.ProjectId --quiet 2>$null | Out-Null
            $secretExists = $LASTEXITCODE -eq 0
        } catch {
            $secretExists = $false
        }
        
        if (-not $secretExists) {
            Write-Info "Creating secret: $secretName"
            if (-not $DryRun) {
                Invoke-SafeCommand "gcloud secrets create $secretName --replication-policy=`"automatic`" --project $($Config.ProjectId)" "Create secret $secretName"
            }
        } else {
            Write-Success "Secret $secretName already exists"
        }
        
        # Update secret value if we have it in env
        if ($envVars.ContainsKey($secretName)) {
            $envValue = $envVars[$secretName]
            Write-Info "Updating secret $secretName with value from .env.production"
            if (-not $DryRun) {
                $envValue | gcloud secrets versions add $secretName --data-file=- --project $Config.ProjectId
            }
            Write-Success "Updated secret: $secretName"
        } else {
            Write-Warning "No value found for $secretName in .env.production"
        }
    }
}

function Build-Application {
    if ($SkipBuild) {
        Write-Info "Skipping build (--SkipBuild specified)"
        return
    }
    
    Write-Step "Building Holitime application..."
    
    # Clean previous builds
    Write-Info "Cleaning previous builds..."
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
        Write-Success "Cleaned .next directory"
    }
    
    # Install dependencies
    Write-Info "Installing dependencies..."
    Invoke-SafeCommand "npm install" "Install dependencies"
    
    # Generate Prisma client
    Write-Info "Generating Prisma client..."
    Invoke-SafeCommand "npx prisma generate" "Generate Prisma client"
    
    # Build Next.js application
    Write-Info "Building Next.js application..."
    Invoke-SafeCommand "npm run build" "Build application"
    
    Write-Success "Application built successfully"
}

function Build-DockerImage {
    Write-Step "Building Docker image..."
    
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $latestTag = "$($Config.ContainerRegistry):latest"
    $timestampTag = "$($Config.ContainerRegistry):$timestamp"
    
    # Create backup directory
    if (-not (Test-Path $Config.BackupDir)) {
        New-Item -ItemType Directory -Path $Config.BackupDir -Force | Out-Null
    }
    
    # Build Docker image
    Write-Info "Building Docker image with tags: latest, $timestamp"
    $buildCommand = "docker build -t `"$latestTag`" -t `"$timestampTag`" --build-arg DATABASE_URL=`"postgresql://dummy:dummy@dummy/dummy`" ."
    Invoke-SafeCommand $buildCommand "Docker build"
    
    Write-Success "Docker image built successfully: $latestTag"
    return $latestTag
}

function Push-DockerImage {
    param([string]$ImageTag)
    
    Write-Step "Pushing Docker image to Google Container Registry..."
    
    # Configure Docker to use gcloud as credential helper
    Write-Info "Configuring Docker authentication..."
    Invoke-SafeCommand "gcloud auth configure-docker --quiet" "Configure Docker auth"
    
    # Push image
    Write-Info "Pushing image: $ImageTag"
    Invoke-SafeCommand "docker push `"$ImageTag`"" "Push Docker image"
    
    Write-Success "Image pushed successfully"
}

function Run-DatabaseMigrations {
    if ($SkipMigrations) {
        Write-Info "Skipping database migrations (--SkipMigrations specified)"
        return
    }
    
    Write-Step "Running database migrations..."
    
    # Check if we have migrations to run
    if (-not (Test-Path "prisma/migrations")) {
        Write-Warning "No migrations directory found, skipping migrations"
        return
    }
    
    Write-Info "Running Prisma migrations..."
    try {
        # Set environment variables for migration
        $env:DATABASE_URL = (Get-Content ".env.production" | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "DATABASE_URL=", "" -replace '"', ''
        
        Invoke-SafeCommand "npx prisma migrate deploy" "Run database migrations"
        Write-Success "Database migrations completed successfully"
    } catch {
        Write-Warning "Migration failed: $_"
        Write-Info "This might be expected if migrations are already applied"
    }
}

function Deploy-CloudRunService {
    param([string]$ImageTag)
    
    Write-Step "Deploying to Google Cloud Run..."
    
    # Prepare secret mappings
    $requiredSecrets = @(
        "DATABASE_URL", "DATABASE_URL_DIRECT", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "JWT_SECRET", 
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", 
        "GOOGLE_API_KEY", "GOOGLE_AI_API_KEY",
        "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS",
        "PROJECT_ID", "ENV", "GCS_AVATAR_BUCKET"
    )
    
    $secretMappings = @()
    foreach ($secret in $requiredSecrets) {
        $secretMappings += "$secret=$secret`:latest"
    }
    $secretsString = $secretMappings -join ","
    
    # Deploy to Cloud Run
    $deployArgs = @(
        "run", "deploy", $Config.ServiceName,
        "--image", $ImageTag,
        "--platform", "managed",
        "--region", $Config.Region,
        "--allow-unauthenticated",
        "--port", "3000",
        "--memory", $Memory,
        "--cpu", $CPU,
        "--timeout", $Timeout,
        "--max-instances", $MaxInstances,
        "--min-instances", $MinInstances,
        "--concurrency", "100",
        "--set-env-vars", "NODE_ENV=$Environment,NEXT_TELEMETRY_DISABLED=1",
        "--add-cloudsql-instances", $Config.CloudSqlInstance,
        "--set-secrets", $secretsString
    )
    
    $deployCommand = "gcloud " + ($deployArgs -join " ")
    Write-Info "Deploying service..."
    Invoke-SafeCommand $deployCommand "Cloud Run deployment"
    
    Write-Success "Service deployed successfully"
}

function Get-ServiceInfo {
    Write-Step "Getting service information..."
    
    try {
        $serviceUrl = gcloud run services describe $Config.ServiceName --platform managed --region $Config.Region --format "value(status.url)" 2>$null
        $serviceStatus = gcloud run services describe $Config.ServiceName --platform managed --region $Config.Region --format "value(status.conditions[0].status)" 2>$null
        
        Write-Success "Service URL: $serviceUrl"
        Write-Success "Service Status: $serviceStatus"
        
        # Test the service
        Write-Info "Testing service health..."
        try {
            $response = Invoke-WebRequest -Uri "$serviceUrl/api/health" -Method GET -TimeoutSec 30 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "Service is healthy and responding"
            } else {
                Write-Warning "Service responded with status code: $($response.StatusCode)"
            }
        } catch {
            Write-Warning "Health check failed: $_"
            Write-Info "Service might still be starting up"
        }
        
        return $serviceUrl
    } catch {
        Write-Warning "Could not retrieve service information: $_"
        return $null
    }
}

function Show-DeploymentSummary {
    param([string]$ServiceUrl)
    
    Write-Host ""
    Write-Host "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Details:" -ForegroundColor Cyan
    Write-Host "  • Name: $($Config.ServiceName)" -ForegroundColor White
    Write-Host "  • Project: $($Config.ProjectId)" -ForegroundColor White
    Write-Host "  • Region: $($Config.Region)" -ForegroundColor White
    Write-Host "  • Environment: $($Config.Environment)" -ForegroundColor White
    Write-Host ""
    if ($ServiceUrl) {
        Write-Host "🌐 Service URL: $ServiceUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "Quick Links:" -ForegroundColor Cyan
        Write-Host "  • Application: $ServiceUrl" -ForegroundColor White
        Write-Host "  • Health Check: $ServiceUrl/api/health" -ForegroundColor White
        Write-Host "  • Cloud Console: https://console.cloud.google.com/run/detail/$($Config.Region)/$($Config.ServiceName)/metrics?project=$($Config.ProjectId)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  • View logs: gcloud run services logs read $($Config.ServiceName) --region=$($Config.Region)" -ForegroundColor White
    Write-Host "  • View service: gcloud run services describe $($Config.ServiceName) --region=$($Config.Region)" -ForegroundColor White
    Write-Host "  • Update service: gcloud run services update $($Config.ServiceName) --region=$($Config.Region)" -ForegroundColor White
    Write-Host ""
}

# Main deployment process
function Start-Deployment {
    Write-Host ""
    Write-Host "🚀 HOLITIME DEPLOYMENT STARTING 🚀" -ForegroundColor Magenta
    Write-Host "===================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  • Project ID: $($Config.ProjectId)" -ForegroundColor White
    Write-Host "  • Service Name: $($Config.ServiceName)" -ForegroundColor White
    Write-Host "  • Region: $($Config.Region)" -ForegroundColor White
    Write-Host "  • Environment: $($Config.Environment)" -ForegroundColor White
    Write-Host "  • Memory: $Memory" -ForegroundColor White
    Write-Host "  • CPU: $CPU" -ForegroundColor White
    Write-Host "  • Min Instances: $MinInstances" -ForegroundColor White
    Write-Host "  • Max Instances: $MaxInstances" -ForegroundColor White
    Write-Host ""
    
    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No actual changes will be made"
        Write-Host ""
    }
    
    $startTime = Get-Date
    
    try {
        # Step 1: Prerequisites
        Test-Prerequisites
        
        # Step 2: Initialize secrets
        Initialize-Secrets
        
        # Step 3: Build application
        Build-Application
        
        # Step 4: Build Docker image
        $imageTag = Build-DockerImage
        
        # Step 5: Push Docker image
        Push-DockerImage -ImageTag $imageTag
        
        # Step 6: Run database migrations
        Run-DatabaseMigrations
        
        # Step 7: Deploy to Cloud Run
        Deploy-CloudRunService -ImageTag $imageTag
        
        # Step 8: Get service information
        $serviceUrl = Get-ServiceInfo
        
        # Step 9: Show summary
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        Show-DeploymentSummary -ServiceUrl $serviceUrl
        
        Write-Host "⏱️  Total deployment time: $($duration.ToString('mm\:ss'))" -ForegroundColor Green
        Write-Host ""
        
    } catch {
        Write-Error "Deployment failed: $_"
        Write-Info "Check the logs above for more details"
        exit 1
    }
}

# Start the deployment
Start-Deployment