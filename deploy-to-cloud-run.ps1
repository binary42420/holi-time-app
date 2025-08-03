# HoliTime Cloud Run Deployment Script
# This script deploys the application to Cloud Run with the correct database configuration

param(
    [string]$ProjectId = "elated-fabric-460119-t3"
)

# Configuration
$ServiceName = "holitime"
$Region = "us-west2"
$ImageName = "gcr.io/$ProjectId/$ServiceName"

Write-Host "Deploying HoliTime to Cloud Run..." -ForegroundColor Blue
Write-Host "Project ID: $ProjectId"
Write-Host "Service Name: $ServiceName"
Write-Host "Region: $Region"
Write-Host ""

# Wait for Docker build to complete if still running
Write-Host "Waiting for Docker build to complete..." -ForegroundColor Yellow
while ((docker ps -q --filter "ancestor=${ImageName}:latest" | Measure-Object).Count -gt 0) {
    Start-Sleep -Seconds 5
}

# Push the image to Google Container Registry
Write-Host "Pushing image to Google Container Registry..." -ForegroundColor Blue
docker push "${ImageName}:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker push failed" -ForegroundColor Red
    exit 1
}
Write-Host "Image pushed successfully!" -ForegroundColor Green

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Blue
gcloud run deploy $ServiceName `
    --image "${ImageName}:latest" `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --cpu 1 `
    --timeout 300 `
    --max-instances 10 `
    --min-instances 0 `
    --set-env-vars "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" `
    --add-cloudsql-instances "${ProjectId}:${Region}:holitime-db" `
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,JWT_SECRET=JWT_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest,SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest,NEXTAUTH_URL=NEXTAUTH_URL:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green

# Get the service URL
$ServiceUrl = gcloud run services describe $ServiceName --platform managed --region $Region --format 'value(status.url)'
Write-Host ""
Write-Host "Service deployed at: $ServiceUrl" -ForegroundColor Green

# Update NEXTAUTH_URL secret if needed
Write-Host ""
Write-Host "Updating NEXTAUTH_URL secret..." -ForegroundColor Blue
$ServiceUrl | gcloud secrets versions add NEXTAUTH_URL --data-file=-
Write-Host "NEXTAUTH_URL secret updated" -ForegroundColor Green

# Display summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Service URL: $ServiceUrl"
Write-Host "Service Name: $ServiceName"
Write-Host "Region: $Region"
Write-Host "Database: holitime-db"
Write-Host ""
Write-Host "Test these routes to verify deployment:" -ForegroundColor Yellow
Write-Host "  - $ServiceUrl/login (should be accessible)"
Write-Host "  - $ServiceUrl/signup (should be accessible)"
Write-Host "  - $ServiceUrl/ (landing page should be accessible)"
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  gcloud run services logs tail $ServiceName --region $Region"
Write-Host ""
Write-Host "To run database migrations:" -ForegroundColor Yellow
Write-Host "  gcloud run jobs create ${ServiceName}-migrate ``"
Write-Host "    --image ${ImageName}:latest ``"
Write-Host "    --region $Region ``"
Write-Host "    --add-cloudsql-instances ${ProjectId}:${Region}:holitime-db ``"
Write-Host "    --set-secrets `"DATABASE_URL=DATABASE_URL:latest`" ``"
Write-Host "    --command `"npx`" ``"
Write-Host "    --args `"prisma,migrate,deploy`""
Write-Host ""
Write-Host "  Then execute: gcloud run jobs execute ${ServiceName}-migrate --region $Region"
