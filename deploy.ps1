<#
.SYNOPSIS
    Deploys the Holitime Next.js application to Google Cloud Run.

.DESCRIPTION
    This script provides multiple deployment options for the Holitime application:
    1. Cloud Build deployment (recommended) - Uses Google Cloud Build
    2. Local deployment - Builds and deploys directly from your machine

.PARAMETER Method
    Deployment method: "cloudbuild" (default) or "local"

.PARAMETER DryRun
    Perform a dry run without making actual changes

.PARAMETER WatchLogs
    Watch build logs in real-time (Cloud Build only)

.NOTES
    Requires gcloud CLI to be installed and authenticated.
    For Cloud Build: Ensure cloudbuild.yaml is correctly configured.
    For Local: Requires Docker to be installed and running.
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("cloudbuild", "local")]
    [string]$Method = "cloudbuild",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$WatchLogs
)

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

Write-Host ""
Write-Host "🚀 HOLITIME DEPLOYMENT SCRIPT 🚀" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host ""

Write-Host "Deployment Configuration:" -ForegroundColor Cyan
Write-Host "  • Method: $Method" -ForegroundColor White
Write-Host "  • Project: elated-fabric-460119-t3" -ForegroundColor White
Write-Host "  • Service: holitime" -ForegroundColor White
Write-Host "  • Region: us-west2" -ForegroundColor White
if ($DryRun) {
    Write-Host "  • Mode: DRY RUN" -ForegroundColor Yellow
}
Write-Host ""

switch ($Method) {
    "local" {
        Write-Step "Using LOCAL deployment method..."
        Write-Info "This will build and deploy directly from your machine."
        Write-Host ""
        
        if (Test-Path ".\deploy-holitime.ps1") {
            if ($DryRun) {
                & ".\deploy-holitime.ps1" -DryRun
            } else {
                & ".\deploy-holitime.ps1"
            }
        } else {
            Write-Error "Local deployment script not found: deploy-holitime.ps1"
            exit 1
        }
    }
    
    "cloudbuild" {
        Write-Step "Using CLOUD BUILD deployment method..."
        Write-Info "This will use Google Cloud Build for deployment."
        Write-Host ""
        
        if (Test-Path ".\deploy-with-cloudbuild.ps1") {
            $params = @()
            if ($DryRun) { $params += "-DryRun" }
            if ($WatchLogs) { $params += "-WatchLogs" }
            
            & ".\deploy-with-cloudbuild.ps1" @params
        } else {
            Write-Error "Cloud Build deployment script not found: deploy-with-cloudbuild.ps1"
            exit 1
        }
    }
}

Write-Host ""
Write-Success "Deployment script completed!"
Write-Host ""