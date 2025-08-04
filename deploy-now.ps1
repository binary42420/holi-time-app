# One-Click HoliTime Deployment
# This script will get your app deployed to Cloud Run immediately

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "elated-fabric-460119-t3"
$SERVICE_NAME = "holitime"
$REGION = "us-west2"

function Write-Status { param([string]$msg) Write-Host "🚀 $msg" -ForegroundColor Cyan }
function Write-Success { param([string]$msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error { param([string]$msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param([string]$msg) Write-Host "INFO: $msg" -ForegroundColor Blue }

Write-Status "HoliTime - One-Click Cloud Run Deployment"
Write-Info "Project: $PROJECT_ID"
Write-Info "Service: $SERVICE_NAME"
Write-Info "Region: $REGION"
Write-Host ""

# Check if gcloud is available
$gcloudAvailable = $false
try {
    $null = gcloud --version 2>$null
    $gcloudAvailable = $true
    Write-Success "Google Cloud CLI found"
} catch {
    Write-Info "Google Cloud CLI not found locally"
}

if (-not $gcloudAvailable) {
    Write-Status "🌐 Opening Cloud Shell deployment..."
    Write-Info "Since gcloud is not installed locally, we'll use Google Cloud Shell"
    Write-Host ""
    Write-Info "Follow these steps:"
    Write-Info "1. The browser will open to Google Cloud Shell"
    Write-Info "2. Upload your project files to Cloud Shell"
    Write-Info "3. Run the deployment script"
    Write-Host ""
    
    # Create a simple upload command file
    $uploadScript = @"
# Run these commands in Google Cloud Shell:

# 1. Upload your project (run this from your local machine):
gcloud cloud-shell scp --recurse "$PWD" cloudshell:~/holitime-app

# 2. Then in Cloud Shell, run:
cd ~/holitime-app
chmod +x deploy-cloud-shell.sh
./deploy-cloud-shell.sh
"@
    
    $uploadScript | Out-File -FilePath "cloud-shell-commands.txt" -Encoding UTF8
    Write-Success "Created cloud-shell-commands.txt with instructions"
    
    # Open Cloud Shell
    Start-Process "https://shell.cloud.google.com"
    
    Write-Info "Cloud Shell opened in browser. Follow the instructions in cloud-shell-commands.txt"
    return
}

# If gcloud is available, proceed with local deployment
Write-Status "Deploying using local gcloud..."

try {
    # Set project
    Write-Info "Setting project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
    
    # Check authentication
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $account) {
        Write-Info "Authentication required..."
        gcloud auth login
    } else {
        Write-Success "Authenticated as: $account"
    }
    
    # Enable APIs
    Write-Info "Enabling required APIs..."
    gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com --quiet
    
    # Submit build
    Write-Status "Submitting build to Google Cloud Build..."
    Write-Info "This may take 5-10 minutes..."
    gcloud builds submit --config cloudbuild.yaml .
    
    # Get service URL
    Write-Info "Getting service information..."
    $serviceUrl = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>$null
    
    if ($serviceUrl) {
        Write-Success "🎉 Deployment successful!"
        Write-Host ""
        Write-Host "🌐 Your app is live at: $serviceUrl" -ForegroundColor Green -BackgroundColor Black
        Write-Host ""
        Write-Info "Next steps:"
        Write-Info "• Test your app: $serviceUrl"
        Write-Info "• Check health: $serviceUrl/api/health"
        Write-Info "• View logs: gcloud logs tail --service=$SERVICE_NAME"
        Write-Info "• Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
        
        # Open the app in browser
        if (-not $Force) {
            $openBrowser = Read-Host "Open your app in browser? (y/n)"
            if ($openBrowser -eq "y") {
                Start-Process $serviceUrl
            }
        }
    } else {
        Write-Error "Could not retrieve service URL. Check Cloud Run console."
    }
    
} catch {
    Write-Error "Deployment failed: $_"
    Write-Info "Troubleshooting steps:"
    Write-Info "1. Check build logs: gcloud builds list --limit=5"
    Write-Info "2. Check service logs: gcloud logs tail --service=$SERVICE_NAME"
    Write-Info "3. Verify secrets in Secret Manager console"
    Write-Info "4. Try the Cloud Shell method instead"
    exit 1
}

Write-Success "Deployment completed successfully! 🚀"