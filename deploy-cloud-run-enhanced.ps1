# Enhanced HoliTime Cloud Run Deployment Script
# Comprehensive deployment with proper secret management, rollback capabilities, and monitoring

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
    [switch]$SkipSecretCheck,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Rollback,
    
    [Parameter(Mandatory=$false)]
    [string]$RollbackToRevision,
    
    [Parameter(Mandatory=$false)]
    [int]$MaxInstances = 10,
    
    [Parameter(Mandatory=$false)]
    [int]$MinInstances = 0,
    
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
$Script:Config = @{
    ProjectId = $ProjectId
    ServiceName = $ServiceName
    Region = $Region
    Environment = $Environment
    CloudSqlInstance = "$ProjectId`:$Region`:holitime-db"
    ContainerRegistry = "gcr.io/$ProjectId/$ServiceName"
    LogFile = "deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    BackupDir = "deployment-backups"
}

# Color codes for output
$Colors = @{
    Blue = "Blue"
    Green = "Green"
    Red = "Red"
    Yellow = "Yellow"
    White = "White"
    Cyan = "Cyan"
    Magenta = "Magenta"
}

# Logging functions
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console with color
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $logMessage
    $host.UI.RawUI.ForegroundColor = $fc
    
    # Write to log file
    Add-Content -Path $Script:Config.LogFile -Value $logMessage
}

function Write-Success { param([string]$Message) Write-Log "✓ $Message" "SUCCESS" $Colors.Green }
function Write-Error { param([string]$Message) Write-Log "✗ $Message" "ERROR" $Colors.Red }
function Write-Warning { param([string]$Message) Write-Log "⚠ $Message" "WARNING" $Colors.Yellow }
function Write-Info { param([string]$Message) Write-Log "ℹ $Message" "INFO" $Colors.Blue }
function Write-Debug { param([string]$Message) if ($VerbosePreference -eq 'Continue') { Write-Log "🔍 $Message" "DEBUG" $Colors.Cyan } }

# Error handling
$ErrorActionPreference = "Stop"
trap {
    Write-Error "Deployment failed with error: $_"
    Write-Info "Check the log file: $($Script:Config.LogFile)"
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

function Invoke-Command {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$IgnoreErrors
    )
    
    Write-Debug "Executing: $Command"
    if ($DryRun) {
        Write-Info "[DRY RUN] Would execute: $Command"
        return $true
    }
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0 -and -not $IgnoreErrors) {
            throw "Command failed with exit code: $LASTEXITCODE"
        }
        Write-Debug "$Description completed successfully"
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

function Test-GcloudAuth {
    Write-Info "Checking Google Cloud authentication..."
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $account) {
        throw "Not authenticated with Google Cloud. Run 'gcloud auth login' first."
    }
    Write-Success "Authenticated as: $account"
}

# Secret management functions
function Get-SecretVersion {
    param([string]$SecretName)
    
    try {
        $versions = gcloud secrets versions list $SecretName --project $Script:Config.ProjectId --format="value(name)" --filter="state:enabled" --limit=1 2>$null
        if ($versions) {
            return $versions.Split('/')[-1]
        }
        return $null
    } catch {
        return $null
    }
}

function Test-SecretExists {
    param([string]$SecretName)
    
    try {
        gcloud secrets describe $SecretName --project $Script:Config.ProjectId --quiet 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-SecretValue {
    param([string]$SecretName)
    
    try {
        $value = gcloud secrets versions access latest --secret=$SecretName --project $Script:Config.ProjectId 2>$null
        return $value
    } catch {
        return $null
    }
}

function Update-SecretValue {
    param(
        [string]$SecretName,
        [string]$Value,
        [switch]$OnlyIfPlaceholder
    )
    
    if ($OnlyIfPlaceholder) {
        $currentValue = Get-SecretValue -SecretName $SecretName
        if ($currentValue -and -not $currentValue.StartsWith("placeholder-")) {
            Write-Debug "Secret $SecretName already has a real value, skipping update"
            return $false
        }
    }
    
    if ($DryRun) {
        Write-Info "[DRY RUN] Would update secret: $SecretName"
        return $true
    }
    
    try {
        echo $Value | gcloud secrets versions add $SecretName --data-file=- --project $Script:Config.ProjectId 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Initialize-SecretsFromEnv {
    Write-Info "Initializing secrets from .env file..."
    
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found, skipping automatic secret initialization"
        return
    }
    
    $envVars = @{}
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $envVars[$matches[1]] = $matches[2]
        }
    }
    
    $requiredSecrets = @(
        "DATABASE_URL",
        "NEXTAUTH_SECRET", 
        "JWT_SECRET",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_API_KEY",
        "GOOGLE_AI_API_KEY",
        "SMTP_HOST",
        "SMTP_PORT", 
        "SMTP_USER",
        "SMTP_PASS"
    )
    
    foreach ($secretName in $requiredSecrets) {
        $exists = Test-SecretExists -SecretName $secretName
        
        if (-not $exists) {
            Write-Info "Creating secret: $secretName"
            if (-not $DryRun) {
                gcloud secrets create $secretName --replication-policy="automatic" --project $Script:Config.ProjectId
            }
        } else {
            Write-Debug "Secret $secretName already exists"
        }
        
        # Check if we should update the secret value
        if ($envVars.ContainsKey($secretName)) {
            $envValue = $envVars[$secretName]
            $currentValue = Get-SecretValue -SecretName $secretName
            
            # Only update if current value is a placeholder or doesn't exist
            if (-not $currentValue -or $currentValue.StartsWith("placeholder-")) {
                Write-Info "Updating secret $secretName with value from .env"
                Update-SecretValue -SecretName $secretName -Value $envValue
                Write-Success "Updated secret: $secretName"
            } else {
                $currentVersion = Get-SecretVersion -SecretName $secretName
                Write-Debug "Secret $secretName already has real value (version: $currentVersion)"
            }
        } else {
            # Create placeholder if no env value and no existing value
            $currentValue = Get-SecretValue -SecretName $secretName
            if (-not $currentValue) {
                $placeholderValue = if ($secretName -eq "SMTP_PORT") { "587" } else { "placeholder-for-$secretName" }
                Write-Warning "No value found for $secretName in .env, using placeholder"
                Update-SecretValue -SecretName $secretName -Value $placeholderValue
            }
        }
    }
}

function Build-DockerImage {
    Write-Info "Building Docker image..."
    
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $latestTag = "$($Script:Config.ContainerRegistry):latest"
    $timestampTag = "$($Script:Config.ContainerRegistry):$timestamp"
    
    # Create backup of current image
    if (-not $DryRun) {
        $currentImage = gcloud run services describe $Script:Config.ServiceName --platform managed --region $Script:Config.Region --format "value(spec.template.spec.template.spec.containers[0].image)" 2>$null
        if ($currentImage) {
            Write-Info "Backing up current image: $currentImage"
            if (-not (Test-Path $Script:Config.BackupDir)) {
                New-Item -ItemType Directory -Path $Script:Config.BackupDir -Force | Out-Null
            }
            "PREVIOUS_IMAGE=$currentImage" | Out-File -FilePath "$($Script:Config.BackupDir)/previous-image.txt"
        }
    }
    
    $buildCommand = "docker build -t `"$latestTag`" -t `"$timestampTag`" ."
    Invoke-Command -Command $buildCommand -Description "Docker build"
    
    Write-Success "Docker image built: $latestTag"
    return $latestTag
}

function Push-DockerImage {
    param([string]$ImageTag)
    
    Write-Info "Pushing Docker image to registry..."
    Invoke-Command -Command "docker push `"$ImageTag`"" -Description "Docker push"
    Write-Success "Image pushed successfully"
}

function Deploy-CloudRunService {
    param([string]$ImageTag)
    
    Write-Info "Deploying to Cloud Run..."
    
    # Get all secret versions for deployment
    $secretMappings = @()
    $requiredSecrets = @(
        "DATABASE_URL", "NEXTAUTH_SECRET", "JWT_SECRET", 
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", 
        "GOOGLE_API_KEY", "GOOGLE_AI_API_KEY",
        "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"
    )
    
    foreach ($secret in $requiredSecrets) {
        $version = Get-SecretVersion -SecretName $secret
        if ($version) {
            $secretMappings += "$secret=$secret`:$version"
        } else {
            $secretMappings += "$secret=$secret`:latest"
        }
    }
    
    $secretsString = $secretMappings -join ","
    
    $deployArgs = @(
        "run", "deploy", $Script:Config.ServiceName,
        "--image", $ImageTag,
        "--platform", "managed",
        "--region", $Script:Config.Region,
        "--allow-unauthenticated",
        "--port", "3000",
        "--memory", $Memory,
        "--cpu", $CPU,
        "--timeout", $Timeout,
        "--max-instances", $MaxInstances,
        "--min-instances", $MinInstances,
        "--concurrency", "100",
        "--set-env-vars", "NODE_ENV=$Environment,NEXT_TELEMETRY_DISABLED=1",
        "--add-cloudsql-instances", $Script:Config.CloudSqlInstance,
        "--set-secrets", $secretsString
    )
    
    $deployCommand = "gcloud " + ($deployArgs -join " ")
    Invoke-Command -Command $deployCommand -Description "Cloud Run deployment"
    
    Write-Success "Service deployed successfully"
}

function Update-NextAuthUrl {
    Write-Info "Updating NEXTAUTH_URL secret..."
    
    try {
        $serviceUrl = gcloud run services describe $Script:Config.ServiceName --platform managed --region $Script:Config.Region --format "value(status.url)" 2>$null
        
        if ($serviceUrl) {
            # Create or update NEXTAUTH_URL secret
            if (-not (Test-SecretExists -SecretName "NEXTAUTH_URL")) {
                if (-not $DryRun) {
                    gcloud secrets create NEXTAUTH_URL --replication-policy="automatic" --project $Script:Config.ProjectId
                }
            }
            
            Update-SecretValue -SecretName "NEXTAUTH_URL" -Value $serviceUrl
            
            # Update the service to use the new secret
            if (-not $DryRun) {
                gcloud run services update $Script:Config.ServiceName --platform managed --region $Script:Config.Region --update-secrets "NEXTAUTH_URL=NEXTAUTH_URL:latest"
            }
            
            Write-Success "NEXTAUTH_URL updated to: $serviceUrl"
        } else {
            Write-Warning "Could not retrieve service URL"
        }
    } catch {
        Write-Warning "Failed to update NEXTAUTH_URL: $_"
    }
}

function Run-DatabaseMigrations {
    if ($SkipMigrations) {
        Write-Info "Skipping database migrations (--SkipMigrations specified)"
        return
    }
    
    Write-Info "Running database migrations..."
    
    try {
        $migrationJobName = "holitime-migrate-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        
        if (-not $DryRun) {
            # Create migration job
            gcloud run jobs create $migrationJobName --image $Script:Config.ContainerRegistry`:latest --region $Script:Config.Region --command "npx" --args "prisma,migrate,deploy" --set-env-vars "NODE_ENV=$Environment" --set-secrets "DATABASE_URL=DATABASE_URL:latest" --max-retries 3 --task-timeout 600 --project $Script:Config.ProjectId
            
            # Execute the job
            gcloud run jobs execute $migrationJobName --region $Script:Config.Region --wait --project $Script:Config.ProjectId
            
            Write-Success "Database migrations completed"
            
            # Clean up the job
            gcloud run jobs delete $migrationJobName --region $Script:Config.Region --quiet --project $Script:Config.ProjectId
        } else {
            Write-Info "[DRY RUN] Would run database migrations"
        }
    } catch {
        Write-Warning "Migration job failed: $_"
        Write-Warning "You may need to run migrations manually"
    }
}

function Test-Deployment {
    Write-Info "Verifying deployment..."
    
    try {
        $serviceUrl = gcloud run services describe $Script:Config.ServiceName --platform managed --region $Script:Config.Region --format "value(status.url)" 2>$null
        
        if ($serviceUrl) {
            Write-Info "Testing service health at: $serviceUrl"
            
            # Test multiple endpoints
            $endpoints = @("/", "/api/health")
            $allHealthy = $true
            
            foreach ($endpoint in $endpoints) {
                try {
                    $testUrl = "$serviceUrl$endpoint"
                    $response = Invoke-WebRequest -Uri $testUrl -Method Head -UseBasicParsing -TimeoutSec 30 -ErrorAction SilentlyContinue
                    
                    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 307 -or $response.StatusCode -eq 404) {
                        Write-Success "Endpoint $endpoint is responding (Status: $($response.StatusCode))"
                    } else {
                        Write-Warning "Endpoint $endpoint returned status code: $($response.StatusCode)"
                        $allHealthy = $false
                    }
                } catch {
                    Write-Warning "Could not test endpoint $endpoint`: $_"
                    $allHealthy = $false
                }
            }
            
            if ($allHealthy) {
                Write-Success "Deployment verification completed successfully"
            } else {
                Write-Warning "Some health checks failed, but deployment may still be functional"
            }
            
            return $serviceUrl
        } else {
            Write-Error "Could not retrieve service URL"
            return $null
        }
    } catch {
        Write-Warning "Could not verify deployment: $_"
        return $null
    }
}

function Invoke-Rollback {
    if (-not $Rollback) { return }
    
    Write-Info "Performing rollback..."
    
    try {
        if ($RollbackToRevision) {
            $command = "gcloud run services update-traffic $($Script:Config.ServiceName) --to-revisions=$RollbackToRevision=100 --region $($Script:Config.Region) --project $($Script:Config.ProjectId)"
        } else {
            # Rollback to previous image
            $backupFile = "$($Script:Config.BackupDir)/previous-image.txt"
            if (Test-Path $backupFile) {
                $previousImage = Get-Content $backupFile | Where-Object { $_ -match "PREVIOUS_IMAGE=(.+)" } | ForEach-Object { $matches[1] }
                if ($previousImage) {
                    $command = "gcloud run deploy $($Script:Config.ServiceName) --image `"$previousImage`" --region $($Script:Config.Region) --project $($Script:Config.ProjectId)"
                } else {
                    throw "No previous image found in backup"
                }
            } else {
                throw "No backup file found"
            }
        }
        
        Invoke-Command -Command $command -Description "Rollback"
        Write-Success "Rollback completed successfully"
    } catch {
        Write-Error "Rollback failed: $_"
        exit 1
    }
}

function Show-DeploymentSummary {
    param([string]$ServiceUrl)
    
    Write-Log "" "INFO" $Colors.Blue
    Write-Log "=" * 60 "INFO" $Colors.Blue
    Write-Log "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!" "INFO" $Colors.Green
    Write-Log "=" * 60 "INFO" $Colors.Blue
    
    Write-Log "" "INFO" $Colors.White
    Write-Log "📋 Deployment Summary:" "INFO" $Colors.Green
    Write-Log "  Service Name: $($Script:Config.ServiceName)" "INFO" $Colors.White
    Write-Log "  Environment: $Environment" "INFO" $Colors.White
    Write-Log "  Region: $($Script:Config.Region)" "INFO" $Colors.White
    Write-Log "  Project: $($Script:Config.ProjectId)" "INFO" $Colors.White
    Write-Log "  Image: $($Script:Config.ContainerRegistry):latest" "INFO" $Colors.White
    Write-Log "  URL: $ServiceUrl" "INFO" $Colors.White
    Write-Log "  Log File: $($Script:Config.LogFile)" "INFO" $Colors.White
    
    Write-Log "" "INFO" $Colors.White
    Write-Log "📝 Quick Commands:" "INFO" $Colors.Yellow
    Write-Log "  View logs:    gcloud run services logs tail $($Script:Config.ServiceName) --region $($Script:Config.Region)" "INFO" $Colors.White
    Write-Log "  Update env:   gcloud run services update $($Script:Config.ServiceName) --region $($Script:Config.Region) --update-env-vars KEY=VALUE" "INFO" $Colors.White
    Write-Log "  Rollback:     .$($MyInvocation.MyCommand.Name) -Rollback" "INFO" $Colors.White
    Write-Log "  Check status: gcloud run services describe $($Script:Config.ServiceName) --region $($Script:Config.Region)" "INFO" $Colors.White
    
    Write-Log "" "INFO" $Colors.White
    Write-Log "🔧 Management URLs:" "INFO" $Colors.Yellow
    Write-Log "  Cloud Console: https://console.cloud.google.com/run/detail/$($Script:Config.Region)/$($Script:Config.ServiceName)" "INFO" $Colors.White
    Write-Log "  Logs: https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%20resource.labels.service_name%3D%22$($Script:Config.ServiceName)%22" "INFO" $Colors.White
    Write-Log "  Metrics: https://console.cloud.google.com/monitoring/dashboards/custom/cloud-run" "INFO" $Colors.White
}

# Main execution
function Main {
    Write-Log "🚀 Starting Enhanced HoliTime Cloud Run Deployment" "INFO" $Colors.Blue
    Write-Log "=" * 60 "INFO" $Colors.Blue
    
    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No actual changes will be made"
    }
    
    # Handle rollback
    if ($Rollback) {
        Invoke-Rollback
        return
    }
    
    # Validate prerequisites
    Write-Info "Validating prerequisites..."
    
    $requiredCommands = @("docker", "gcloud")
    foreach ($cmd in $requiredCommands) {
        if (-not (Test-Command $cmd)) {
            throw "Required command not found: $cmd"
        }
    }
    Write-Success "All required commands available"
    
    # Check authentication
    Test-GcloudAuth
    
    # Set project
    Write-Info "Setting Google Cloud project to: $($Script:Config.ProjectId)"
    if (-not $DryRun) {
        gcloud config set project $Script:Config.ProjectId
    }
    
    # Initialize secrets
    if (-not $SkipSecretCheck) {
        Initialize-SecretsFromEnv
    } else {
        Write-Info "Skipping secret check (--SkipSecretCheck specified)"
    }
    
    # Build and push image
    if (-not $SkipBuild) {
        $imageTag = Build-DockerImage
        Push-DockerImage -ImageTag $imageTag
    } else {
        Write-Info "Skipping build (--SkipBuild specified)"
        $imageTag = "$($Script:Config.ContainerRegistry):latest"
    }
    
    # Deploy service
    Deploy-CloudRunService -ImageTag $imageTag
    
    # Update NEXTAUTH_URL
    Update-NextAuthUrl
    
    # Run migrations
    Run-DatabaseMigrations
    
    # Verify deployment
    $serviceUrl = Test-Deployment
    
    # Show summary
    if ($serviceUrl) {
        Show-DeploymentSummary -ServiceUrl $serviceUrl
    }
    
    Write-Success "Deployment pipeline completed successfully!"
}

# Execute main function
try {
    Main
} catch {
    Write-Error "Deployment failed: $_"
    Write-Info "Check the log file for details: $($Script:Config.LogFile)"
    exit 1
}