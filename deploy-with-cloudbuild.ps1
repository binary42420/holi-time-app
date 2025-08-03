#!/usr/bin/env pwsh
# Holitime App - Deploy using Google Cloud Build
# This script triggers a Cloud Build deployment for the Holitime application

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "elated-fabric-460119-t3",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "holitime",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west2",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$WatchLogs
)

# Configuration
$Config = @{
    ProjectId = $ProjectId
    ServiceName = $ServiceName
    Region = $Region
    BuildConfigFile = "cloudbuild.yaml"
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

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check gcloud
    try {
        Get-Command "gcloud" -ErrorAction Stop | Out-Null
        Write-Success "gcloud CLI is available"
    } catch {
        throw "gcloud CLI is not installed or not in PATH"
    }
    
    # Check authentication
    Write-Info "Checking Google Cloud authentication..."
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $account) {
        throw "Not authenticated with Google Cloud. Run 'gcloud auth login' first."
    }
    Write-Success "Authenticated as: $account"
    
    # Set project
    Write-Info "Setting Google Cloud project..."
    gcloud config set project $Config.ProjectId
    Write-Success "Project set to: $($Config.ProjectId)"
    
    # Check Cloud Build API
    Write-Info "Checking Cloud Build API..."
    $buildEnabled = gcloud services list --enabled --filter="name:cloudbuild.googleapis.com" --format="value(name)" 2>$null
    if (-not $buildEnabled) {
        Write-Warning "Cloud Build API is not enabled. Enabling it now..."
        gcloud services enable cloudbuild.googleapis.com
        Write-Success "Cloud Build API enabled"
    } else {
        Write-Success "Cloud Build API is enabled"
    }
    
    # Check build config file
    if (-not (Test-Path $Config.BuildConfigFile)) {
        throw "Build configuration file not found: $($Config.BuildConfigFile)"
    }
    Write-Success "Build configuration file found: $($Config.BuildConfigFile)"
}

function Start-CloudBuild {
    Write-Step "Starting Cloud Build deployment..."
    
    if ($DryRun) {
        Write-Warning "DRY RUN MODE - Would submit build with:"
        Write-Info "  gcloud builds submit --config=$($Config.BuildConfigFile) --project=$($Config.ProjectId) ."
        return
    }
    
    Write-Info "Submitting build to Google Cloud Build..."
    
    if ($WatchLogs) {
        # Submit build and stream logs
        $buildCommand = "gcloud builds submit --config=`"$($Config.BuildConfigFile)`" --project=`"$($Config.ProjectId)`" ."
        Write-Info "Executing: $buildCommand"
        Invoke-Expression $buildCommand
    } else {
        # Submit build and get build ID for tracking
        $buildOutput = gcloud builds submit --config="$($Config.BuildConfigFile)" --project="$($Config.ProjectId)" --format="value(id)" . 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $buildId = $buildOutput | Select-Object -Last 1
            Write-Success "Build submitted successfully!"
            Write-Info "Build ID: $buildId"
            Write-Info "You can monitor the build at:"
            Write-Info "https://console.cloud.google.com/cloud-build/builds/$buildId?project=$($Config.ProjectId)"
            
            # Optionally wait for build completion
            Write-Info "Waiting for build to complete..."
            $buildResult = gcloud builds describe $buildId --project="$($Config.ProjectId)" --format="value(status)"
            
            while ($buildResult -eq "WORKING" -or $buildResult -eq "QUEUED") {
                Write-Info "Build status: $buildResult - waiting..."
                Start-Sleep -Seconds 10
                $buildResult = gcloud builds describe $buildId --project="$($Config.ProjectId)" --format="value(status)"
            }
            
            if ($buildResult -eq "SUCCESS") {
                Write-Success "Build completed successfully!"
                Get-ServiceInfo
            } else {
                Write-Error "Build failed with status: $buildResult"
                Write-Info "Check build logs at: https://console.cloud.google.com/cloud-build/builds/$buildId?project=$($Config.ProjectId)"
                exit 1
            }
        } else {
            Write-Error "Failed to submit build"
            Write-Info "Error output: $buildOutput"
            exit 1
        }
    }
}

function Get-ServiceInfo {
    Write-Step "Getting service information..."
    
    try {
        $serviceUrl = gcloud run services describe $Config.ServiceName --platform managed --region $Config.Region --format "value(status.url)" 2>$null
        $serviceStatus = gcloud run services describe $Config.ServiceName --platform managed --region $Config.Region --format "value(status.conditions[0].status)" 2>$null
        
        if ($serviceUrl) {
            Write-Success "Service URL: $serviceUrl"
            Write-Success "Service Status: $serviceStatus"
            
            # Test the service
            Write-Info "Testing service health..."
            try {
                $response = Invoke-WebRequest -Uri "$serviceUrl/api/health" -Method GET -TimeoutSec 300 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-Success "Service is healthy and responding"
                } else {
                    Write-Warning "Service responded with status code: $($response.StatusCode)"
                }
            } catch {
                Write-Warning "Health check failed: $_"
                Write-Info "Service might still be starting up"
            }
            
            Show-DeploymentSummary -ServiceUrl $serviceUrl
        } else {
            Write-Warning "Could not retrieve service URL"
        }
    } catch {
        Write-Warning "Could not retrieve service information: $_"
    }
}

function Show-DeploymentSummary {
    param([string]$ServiceUrl)
    
    Write-Host ""
    Write-Host "🎉 CLOUD BUILD DEPLOYMENT COMPLETED! 🎉" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Details:" -ForegroundColor Cyan
    Write-Host "  • Name: $($Config.ServiceName)" -ForegroundColor White
    Write-Host "  • Project: $($Config.ProjectId)" -ForegroundColor White
    Write-Host "  • Region: $($Config.Region)" -ForegroundColor White
    Write-Host ""
    if ($ServiceUrl) {
        Write-Host "🌐 Service URL: $ServiceUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "Quick Links:" -ForegroundColor Cyan
        Write-Host "  • Application: $ServiceUrl" -ForegroundColor White
        Write-Host "  • Health Check: $ServiceUrl/api/health" -ForegroundColor White
        Write-Host "  • Cloud Console: https://console.cloud.google.com/run/detail/$($Config.Region)/$($Config.ServiceName)/metrics?project=$($Config.ProjectId)" -ForegroundColor White
        Write-Host "  • Build History: https://console.cloud.google.com/cloud-build/builds?project=$($Config.ProjectId)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  • View logs: gcloud run services logs read $($Config.ServiceName) --region=$($Config.Region)" -ForegroundColor White
    Write-Host "  • View builds: gcloud builds list --project=$($Config.ProjectId)" -ForegroundColor White
    Write-Host "  • Redeploy: .\deploy-with-cloudbuild.ps1" -ForegroundColor White
    Write-Host ""
}

# Main execution
function Start-Deployment {
    Write-Host ""
    Write-Host "🚀 HOLITIME CLOUD BUILD DEPLOYMENT 🚀" -ForegroundColor Magenta
    Write-Host "=====================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  • Project ID: $($Config.ProjectId)" -ForegroundColor White
    Write-Host "  • Service Name: $($Config.ServiceName)" -ForegroundColor White
    Write-Host "  • Region: $($Config.Region)" -ForegroundColor White
    Write-Host "  • Build Config: $($Config.BuildConfigFile)" -ForegroundColor White
    Write-Host ""
    
    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No actual changes will be made"
        Write-Host ""
    }
    
    $startTime = Get-Date
    
    try {
        # Step 1: Prerequisites
        Test-Prerequisites
        
        # Step 2: Start Cloud Build
        Start-CloudBuild
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        Write-Host "⏱️  Total deployment time: $($duration.ToString('mm\:ss'))" -ForegroundColor Green
        Write-Host ""
        
    } catch {
        Write-Error "Deployment failed: $_"
        exit 1
    }
}

# Start the deployment
Start-Deployment