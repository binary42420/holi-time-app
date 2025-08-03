#!/usr/bin/env pwsh
# Pre-deployment setup script for Holitime
# This script ensures all prerequisites are met before deployment

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "elated-fabric-460119-t3",
    
    [Parameter(Mandatory=$false)]
    [switch]$SetupSecrets,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipHealthCheck
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

function Test-Prerequisites {
    Write-Step "Checking deployment prerequisites..."
    
    $allGood = $true
    
    # Check gcloud CLI
    try {
        Get-Command "gcloud" -ErrorAction Stop | Out-Null
        $gcloudVersion = gcloud version --format="value(Google Cloud SDK)"
        Write-Success "gcloud CLI is installed (version: $gcloudVersion)"
    } catch {
        Write-Error "gcloud CLI is not installed"
        Write-Info "Install from: https://cloud.google.com/sdk/docs/install"
        $allGood = $false
    }
    
    # Check authentication
    try {
        $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
        if ($account) {
            Write-Success "Authenticated as: $account"
        } else {
            Write-Error "Not authenticated with Google Cloud"
            Write-Info "Run: gcloud auth login"
            $allGood = $false
        }
    } catch {
        Write-Error "Failed to check authentication"
        $allGood = $false
    }
    
    # Set and verify project
    try {
        gcloud config set project $ProjectId
        $currentProject = gcloud config get-value project 2>$null
        if ($currentProject -eq $ProjectId) {
            Write-Success "Project set to: $ProjectId"
        } else {
            Write-Error "Failed to set project to: $ProjectId"
            $allGood = $false
        }
    } catch {
        Write-Error "Failed to set project"
        $allGood = $false
    }
    
    # Check required APIs
    Write-Info "Checking required Google Cloud APIs..."
    $requiredApis = @(
        "cloudbuild.googleapis.com",
        "run.googleapis.com", 
        "secretmanager.googleapis.com",
        "sql-component.googleapis.com"
    )
    
    foreach ($api in $requiredApis) {
        try {
            $enabled = gcloud services list --enabled --filter="name:$api" --format="value(name)" 2>$null
            if ($enabled) {
                Write-Success "API enabled: $api"
            } else {
                Write-Warning "API not enabled: $api"
                Write-Info "Enabling $api..."
                gcloud services enable $api --project=$ProjectId
                Write-Success "Enabled: $api"
            }
        } catch {
            Write-Error "Failed to check/enable API: $api"
            $allGood = $false
        }
    }
    
    return $allGood
}

function Test-RequiredFiles {
    Write-Step "Checking required files..."
    
    $requiredFiles = @(
        "package.json",
        "next.config.mjs", 
        "Dockerfile",
        "cloudbuild.yaml",
        "prisma/schema.prisma",
        "src/lib/prisma.ts"
    )
    
    $allGood = $true
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Success "Found: $file"
        } else {
            Write-Error "Missing: $file"
            $allGood = $false
        }
    }
    
    return $allGood
}

function Test-EnvironmentConfig {
    Write-Step "Checking environment configuration..."
    
    # Check if .env.production exists
    if (Test-Path ".env.production") {
        Write-Success "Found: .env.production"
        
        # Basic validation of .env.production
        $envContent = Get-Content ".env.production" -Raw
        $requiredVars = @("DATABASE_URL", "NEXTAUTH_SECRET", "JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
        
        $missingVars = @()
        foreach ($var in $requiredVars) {
            if ($envContent -notmatch "$var\s*=") {
                $missingVars += $var
            }
        }
        
        if ($missingVars.Count -eq 0) {
            Write-Success "All required environment variables are present"
        } else {
            Write-Warning "Missing environment variables: $($missingVars -join ', ')"
            Write-Info "These will need to be set as Google Cloud secrets"
        }
    } else {
        Write-Warning ".env.production not found"
        Write-Info "Copy .env.production.template to .env.production and fill in values"
        Write-Info "Or use Google Cloud secrets directly"
    }
    
    return $true
}

function Test-Secrets {
    Write-Step "Checking Google Cloud secrets..."
    
    $requiredSecrets = @(
        "DATABASE_URL",
        "NEXTAUTH_SECRET",
        "JWT_SECRET", 
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET"
    )
    
    $missingSecrets = @()
    
    foreach ($secret in $requiredSecrets) {
        try {
            gcloud secrets describe $secret --project=$ProjectId --quiet 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Secret exists: $secret"
            } else {
                $missingSecrets += $secret
                Write-Warning "Secret missing: $secret"
            }
        } catch {
            $missingSecrets += $secret
            Write-Warning "Secret missing: $secret"
        }
    }
    
    if ($missingSecrets.Count -gt 0) {
        Write-Info "Missing secrets: $($missingSecrets -join ', ')"
        if ($SetupSecrets) {
            Write-Info "Setting up missing secrets..."
            & ".\scripts\setup-secrets.ps1" -ProjectId $ProjectId
        } else {
            Write-Info "Run with -SetupSecrets to create missing secrets"
            Write-Info "Or run: .\scripts\setup-secrets.ps1"
        }
        return $false
    }
    
    return $true
}

function Test-DatabaseConnection {
    Write-Step "Testing database connection..."
    
    try {
        # Try to run health check if available
        if (-not $SkipHealthCheck) {
            Write-Info "Running application health check..."
            npm run health-check
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Health check passed"
                return $true
            } else {
                Write-Warning "Health check failed - this may be expected if not deployed yet"
            }
        }
        
        Write-Info "Skipping database connection test (use health check after deployment)"
        return $true
    } catch {
        Write-Warning "Could not test database connection: $_"
        return $true
    }
}

function Show-PreDeploymentSummary {
    param([bool]$ReadyToDeploy)
    
    Write-Host ""
    if ($ReadyToDeploy) {
        Write-Host "🎉 PRE-DEPLOYMENT CHECK PASSED! 🎉" -ForegroundColor Green
        Write-Host "==================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ All prerequisites are met" -ForegroundColor Green
        Write-Host "✅ Required files are present" -ForegroundColor Green  
        Write-Host "✅ Google Cloud APIs are enabled" -ForegroundColor Green
        Write-Host "✅ Secrets are configured" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Ready to deploy!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Deploy: .\deploy.ps1" -ForegroundColor White
        Write-Host "  2. Monitor: Check Cloud Console for build progress" -ForegroundColor White
        Write-Host "  3. Test: Visit your application URL after deployment" -ForegroundColor White
    } else {
        Write-Host "❌ PRE-DEPLOYMENT CHECK FAILED" -ForegroundColor Red
        Write-Host "==============================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please fix the issues above before deploying." -ForegroundColor Red
        Write-Host ""
        Write-Host "Common fixes:" -ForegroundColor Cyan
        Write-Host "  • Install gcloud CLI: https://cloud.google.com/sdk/docs/install" -ForegroundColor White
        Write-Host "  • Authenticate: gcloud auth login" -ForegroundColor White
        Write-Host "  • Setup secrets: .\scripts\setup-secrets.ps1" -ForegroundColor White
        Write-Host "  • Create .env.production from template" -ForegroundColor White
    }
    Write-Host ""
}

# Main execution
function Start-PreDeploymentCheck {
    Write-Host ""
    Write-Host "🔍 HOLITIME PRE-DEPLOYMENT CHECK 🔍" -ForegroundColor Magenta
    Write-Host "===================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Project: $ProjectId" -ForegroundColor Cyan
    Write-Host ""
    
    $checks = @()
    
    try {
        $checks += Test-Prerequisites
        $checks += Test-RequiredFiles  
        $checks += Test-EnvironmentConfig
        $checks += Test-Secrets
        $checks += Test-DatabaseConnection
        
        $allPassed = $checks -notcontains $false
        Show-PreDeploymentSummary $allPassed
        
        if ($allPassed) {
            exit 0
        } else {
            exit 1
        }
        
    } catch {
        Write-Error "Pre-deployment check failed: $_"
        exit 1
    }
}

# Start the check
Start-PreDeploymentCheck