#!/usr/bin/env pwsh
# Setup Google Cloud Secrets for Holitime App
# This script creates and manages secrets required for production deployment

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "elated-fabric-460119-t3",
    
    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env.production",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$UpdateExisting
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
function Write-Step { param([string]$Message) Write-ColorOutput "🔐 $Message" "Magenta" }

# Required secrets for the application
$RequiredSecrets = @(
    "DATABASE_URL",
    "NEXTAUTH_SECRET", 
    "NEXTAUTH_URL",
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET"
)

# Optional secrets
$OptionalSecrets = @(
    "GOOGLE_API_KEY",
    "GOOGLE_AI_API_KEY",
    "SMTP_HOST",
    "SMTP_PORT", 
    "SMTP_USER",
    "SMTP_PASS",
    "GOOGLE_CLOUD_PROJECT_ID",
    "GOOGLE_CLOUD_STORAGE_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "SENTRY_DSN",
    "NEXT_PUBLIC_GA_ID"
)

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
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $account) {
        throw "Not authenticated with Google Cloud. Run 'gcloud auth login' first."
    }
    Write-Success "Authenticated as: $account"
    
    # Set project
    gcloud config set project $ProjectId
    Write-Success "Project set to: $ProjectId"
    
    # Enable Secret Manager API
    Write-Info "Ensuring Secret Manager API is enabled..."
    gcloud services enable secretmanager.googleapis.com --project=$ProjectId
    Write-Success "Secret Manager API is enabled"
}

function Read-EnvFile {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Warning "Environment file not found: $FilePath"
        return @{}
    }
    
    Write-Info "Reading environment variables from: $FilePath"
    $envVars = @{}
    
    Get-Content $FilePath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            if ($line -match "^([^=]+)=(.*)$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                
                # Remove quotes if present
                if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                
                $envVars[$key] = $value
            }
        }
    }
    
    Write-Success "Read $($envVars.Count) environment variables"
    return $envVars
}

function Test-SecretExists {
    param([string]$SecretName)
    
    try {
        gcloud secrets describe $SecretName --project=$ProjectId --quiet 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function New-Secret {
    param(
        [string]$SecretName,
        [string]$SecretValue
    )
    
    if ($DryRun) {
        Write-Info "DRY RUN: Would create secret '$SecretName'"
        return
    }
    
    try {
        # Create the secret
        gcloud secrets create $SecretName --replication-policy="automatic" --project=$ProjectId
        
        # Add the value
        if ($SecretValue) {
            $SecretValue | gcloud secrets versions add $SecretName --data-file=- --project=$ProjectId
            Write-Success "Created secret '$SecretName' with value"
        } else {
            # Add placeholder for empty values
            "PLACEHOLDER_VALUE_UPDATE_IN_CONSOLE" | gcloud secrets versions add $SecretName --data-file=- --project=$ProjectId
            Write-Warning "Created secret '$SecretName' with placeholder - UPDATE IN CONSOLE"
        }
    } catch {
        Write-Error "Failed to create secret '$SecretName': $_"
    }
}

function Update-Secret {
    param(
        [string]$SecretName,
        [string]$SecretValue
    )
    
    if ($DryRun) {
        Write-Info "DRY RUN: Would update secret '$SecretName'"
        return
    }
    
    try {
        if ($SecretValue) {
            $SecretValue | gcloud secrets versions add $SecretName --data-file=- --project=$ProjectId
            Write-Success "Updated secret '$SecretName'"
        } else {
            Write-Warning "Skipping update for '$SecretName' - no value provided"
        }
    } catch {
        Write-Error "Failed to update secret '$SecretName': $_"
    }
}

function Set-NextAuthUrl {
    Write-Step "Setting up NEXTAUTH_URL..."
    
    # Get the current service URL if it exists
    try {
        $serviceUrl = gcloud run services describe holitime --platform managed --region us-west2 --format "value(status.url)" --project=$ProjectId 2>$null
        
        if ($serviceUrl) {
            Write-Info "Found existing service URL: $serviceUrl"
            
            if (Test-SecretExists "NEXTAUTH_URL") {
                if ($UpdateExisting) {
                    Update-Secret "NEXTAUTH_URL" $serviceUrl
                } else {
                    Write-Info "NEXTAUTH_URL secret already exists (use -UpdateExisting to update)"
                }
            } else {
                New-Secret "NEXTAUTH_URL" $serviceUrl
            }
        } else {
            Write-Warning "Service not deployed yet - creating NEXTAUTH_URL with placeholder"
            if (-not (Test-SecretExists "NEXTAUTH_URL")) {
                New-Secret "NEXTAUTH_URL" "https://holitime-438323004618.us-west2.run.app"
            }
        }
    } catch {
        Write-Warning "Could not determine service URL: $_"
        if (-not (Test-SecretExists "NEXTAUTH_URL")) {
            New-Secret "NEXTAUTH_URL" "https://holitime-438323004618.us-west2.run.app"
        }
    }
}

function Setup-Secrets {
    Write-Step "Setting up Google Cloud Secrets..."
    
    # Read environment file if it exists
    $envVars = @{}
    if (Test-Path $EnvFile) {
        $envVars = Read-EnvFile $EnvFile
    } else {
        Write-Warning "Environment file not found: $EnvFile"
        Write-Info "Will create secrets with placeholder values"
    }
    
    # Process required secrets
    Write-Info "Processing required secrets..."
    foreach ($secretName in $RequiredSecrets) {
        $secretExists = Test-SecretExists $secretName
        $secretValue = $envVars[$secretName]
        
        if ($secretExists) {
            if ($UpdateExisting -and $secretValue) {
                Write-Info "Updating existing secret: $secretName"
                Update-Secret $secretName $secretValue
            } else {
                Write-Success "Secret already exists: $secretName"
            }
        } else {
            Write-Info "Creating new secret: $secretName"
            New-Secret $secretName $secretValue
        }
    }
    
    # Process optional secrets
    Write-Info "Processing optional secrets..."
    foreach ($secretName in $OptionalSecrets) {
        $secretValue = $envVars[$secretName]
        
        if ($secretValue) {
            $secretExists = Test-SecretExists $secretName
            
            if ($secretExists) {
                if ($UpdateExisting) {
                    Write-Info "Updating existing optional secret: $secretName"
                    Update-Secret $secretName $secretValue
                } else {
                    Write-Success "Optional secret already exists: $secretName"
                }
            } else {
                Write-Info "Creating new optional secret: $secretName"
                New-Secret $secretName $secretValue
            }
        } else {
            Write-Info "Skipping optional secret (no value): $secretName"
        }
    }
    
    # Handle NEXTAUTH_URL specially
    Set-NextAuthUrl
}

function Show-Summary {
    Write-Host ""
    Write-Host "🔐 SECRET SETUP COMPLETED! 🔐" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Project: $ProjectId" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Verify secrets in Google Cloud Console:" -ForegroundColor White
    Write-Host "   https://console.cloud.google.com/security/secret-manager?project=$ProjectId" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Update any placeholder values with real secrets" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Deploy your application:" -ForegroundColor White
    Write-Host "   .\deploy.ps1 -Method cloudbuild" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  List secrets:    gcloud secrets list --project=$ProjectId" -ForegroundColor White
    Write-Host "  Update secret:   echo 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$ProjectId" -ForegroundColor White
    Write-Host "  View secret:     gcloud secrets versions access latest --secret=SECRET_NAME --project=$ProjectId" -ForegroundColor White
    Write-Host ""
}

# Main execution
function Start-SecretSetup {
    Write-Host ""
    Write-Host "🔐 HOLITIME SECRET SETUP 🔐" -ForegroundColor Magenta
    Write-Host "===========================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  • Project ID: $ProjectId" -ForegroundColor White
    Write-Host "  • Environment File: $EnvFile" -ForegroundColor White
    Write-Host "  • Update Existing: $UpdateExisting" -ForegroundColor White
    Write-Host ""
    
    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No actual changes will be made"
        Write-Host ""
    }
    
    try {
        Test-Prerequisites
        Setup-Secrets
        Show-Summary
        
    } catch {
        Write-Error "Secret setup failed: $_"
        exit 1
    }
}

# Start the setup
Start-SecretSetup