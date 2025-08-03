# HoliTime - Install Google Cloud CLI and Deploy to Cloud Run
# This script will install the necessary tools and deploy your app

param(
    [switch]$SkipInstall,
    [switch]$SkipAuth,
    [string]$ProjectId = "elated-fabric-460119-t3"
)

$ErrorActionPreference = "Stop"

# Color functions
function Write-Success { param([string]$msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info { param([string]$msg) Write-Host "ℹ $msg" -ForegroundColor Blue }
function Write-Warning { param([string]$msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Error { param([string]$msg) Write-Host "✗ $msg" -ForegroundColor Red }

function Install-GoogleCloudCLI {
    if ($SkipInstall) {
        Write-Info "Skipping installation (--SkipInstall specified)"
        return
    }

    Write-Info "Installing Google Cloud CLI..."
    
    # Check if already installed
    try {
        $version = gcloud --version 2>$null
        if ($version) {
            Write-Success "Google Cloud CLI already installed"
            return
        }
    } catch {
        # Not installed, continue with installation
    }

    # Download and install Google Cloud CLI
    $installerUrl = "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe"
    $installerPath = "$env:TEMP\GoogleCloudSDKInstaller.exe"
    
    Write-Info "Downloading Google Cloud CLI installer..."
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    
    Write-Info "Running installer... (This will open a GUI installer)"
    Start-Process -FilePath $installerPath -Wait
    
    # Refresh PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    
    Write-Success "Google Cloud CLI installation completed"
}

function Install-Docker {
    if ($SkipInstall) {
        return
    }

    Write-Info "Checking Docker installation..."
    
    try {
        $version = docker --version 2>$null
        if ($version) {
            Write-Success "Docker already installed: $version"
            return
        }
    } catch {
        # Not installed
    }

    Write-Warning "Docker not found. Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    Write-Info "After installing Docker Desktop:"
    Write-Info "1. Restart this script with -SkipInstall"
    Write-Info "2. Or continue with Cloud Build deployment (no local Docker needed)"
    
    $choice = Read-Host "Continue with Cloud Build deployment? (y/n)"
    if ($choice -ne 'y') {
        exit 1
    }
}

function Initialize-GCloudAuth {
    if ($SkipAuth) {
        Write-Info "Skipping authentication (--SkipAuth specified)"
        return
    }

    Write-Info "Initializing Google Cloud authentication..."
    
    # Check if already authenticated
    try {
        $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
        if ($account) {
            Write-Success "Already authenticated as: $account"
            gcloud config set project $ProjectId
            return
        }
    } catch {
        # Not authenticated
    }

    Write-Info "Opening browser for authentication..."
    gcloud auth login
    gcloud config set project $ProjectId
    
    Write-Success "Authentication completed"
}

function Enable-RequiredAPIs {
    Write-Info "Enabling required Google Cloud APIs..."
    
    $apis = @(
        "cloudbuild.googleapis.com",
        "run.googleapis.com", 
        "containerregistry.googleapis.com",
        "secretmanager.googleapis.com",
        "sql-component.googleapis.com"
    )
    
    foreach ($api in $apis) {
        Write-Info "Enabling $api..."
        gcloud services enable $api --project=$ProjectId
    }
    
    Write-Success "All required APIs enabled"
}

function Deploy-UsingCloudBuild {
    Write-Info "Deploying using Google Cloud Build..."
    
    # Check if cloudbuild.yaml exists
    if (-not (Test-Path "cloudbuild.yaml")) {
        Write-Error "cloudbuild.yaml not found. Please ensure it exists in the project root."
        exit 1
    }
    
    Write-Info "Submitting build to Google Cloud Build..."
    gcloud builds submit --config cloudbuild.yaml . --project=$ProjectId
    
    Write-Success "Build submitted successfully!"
}

function Deploy-UsingLocalDocker {
    Write-Info "Deploying using local Docker build..."
    
    $imageName = "gcr.io/$ProjectId/holitime:latest"
    
    Write-Info "Building Docker image..."
    docker build -t $imageName .
    
    Write-Info "Pushing image to Google Container Registry..."
    docker push $imageName
    
    Write-Info "Deploying to Cloud Run..."
    gcloud run deploy holitime `
        --image $imageName `
        --platform managed `
        --region us-west2 `
        --allow-unauthenticated `
        --port 3000 `
        --memory 2Gi `
        --cpu 1 `
        --max-instances 10 `
        --min-instances 0 `
        --set-env-vars "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" `
        --project=$ProjectId
    
    Write-Success "Deployment completed!"
}

function Show-DeploymentInfo {
    Write-Info "Getting deployment information..."
    
    try {
        $serviceUrl = gcloud run services describe holitime --platform managed --region us-west2 --format "value(status.url)" --project=$ProjectId 2>$null
        
        if ($serviceUrl) {
            Write-Success "🎉 Deployment successful!"
            Write-Info "Service URL: $serviceUrl"
            Write-Info ""
            Write-Info "Next steps:"
            Write-Info "1. Test your application: $serviceUrl"
            Write-Info "2. Check logs: gcloud logs tail --service=holitime --project=$ProjectId"
            Write-Info "3. Monitor in console: https://console.cloud.google.com/run/detail/us-west2/holitime"
        } else {
            Write-Warning "Could not retrieve service URL"
        }
    } catch {
        Write-Warning "Could not get deployment info: $_"
    }
}

# Main execution
try {
    Write-Info "🚀 HoliTime Cloud Run Deployment"
    Write-Info "Project: $ProjectId"
    Write-Info ""
    
    Install-GoogleCloudCLI
    Install-Docker
    Initialize-GCloudAuth
    Enable-RequiredAPIs
    
    # Choose deployment method
    try {
        docker --version | Out-Null
        $dockerAvailable = $true
    } catch {
        $dockerAvailable = $false
    }
    
    if ($dockerAvailable) {
        Write-Info "Docker is available. Choose deployment method:"
        Write-Info "1. Cloud Build (recommended - no local Docker build needed)"
        Write-Info "2. Local Docker build"
        $choice = Read-Host "Enter choice (1 or 2)"
        
        if ($choice -eq "2") {
            Deploy-UsingLocalDocker
        } else {
            Deploy-UsingCloudBuild
        }
    } else {
        Write-Info "Using Cloud Build deployment (Docker not available locally)"
        Deploy-UsingCloudBuild
    }
    
    Show-DeploymentInfo
    
} catch {
    Write-Error "Deployment failed: $_"
    Write-Info "Check the error above and try again"
    exit 1
}