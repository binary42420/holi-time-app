param(
    [string]$ProjectId = "elated-fabric-460119-t3"
)
$ServiceName = "holitime"
$Region = "us-west2"
$ImageName = "gcr.io/$ProjectId/$ServiceName"
function Write-Step { param($Message) Write-Host "===> $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI is not installed."
    exit 1
}
Write-Step "Starting HoliTime deployment to Google Cloud Run"
Write-Step "Cleaning up previous build..."
Remove-Item -Recurse -Force ./.next -ErrorAction SilentlyContinue
Write-Step "Submitting build to Google Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Cloud Build failed"
    exit 1
}
Write-Success "Cloud Build completed successfully"
$ServiceUrl = gcloud run services describe $ServiceName --platform managed --region $Region --format 'value(status.url)'
Write-Success "Service deployed at: $ServiceUrl"
Write-Step "Deployment Summary"
Write-Host "===================="
Write-Host "Service URL: $ServiceUrl"
Write-Warning "Migrations are handled automatically by the startup script."
Write-Warning "Monitor logs: gcloud logs tail --service=\"$ServiceName\""
