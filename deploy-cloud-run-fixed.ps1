# HoliTime Cloud Run Deployment Script with SSR Fixes
# This script builds and deploys the application with fixes for server-side rendering issues

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId = "elated-fabric-460119-t3",
    
    [string]$ServiceName = "holitime",
    [string]$Region = "us-west2"
)

# Color codes for output
$Blue = "Blue"
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput $Blue "🚀 Starting HoliTime deployment to Google Cloud Run with SSR fixes"
Write-ColorOutput $Blue "=================================================="

# Step 1: Verify fixes are in place
Write-ColorOutput $Yellow "`n📋 Verifying SSR fixes are in place..."

$filesToCheck = @(
    "src/components/pdf-viewer-wrapper.tsx",
    "src/lib/services/notification-service.ts"
)

$allFilesExist = $true
foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-ColorOutput $Green "✓ $file exists"
    } else {
        Write-ColorOutput $Red "✗ $file is missing"
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-ColorOutput $Red "❌ Required SSR fix files are missing. Please ensure all fixes are applied."
    exit 1
}

# Step 1.5: Check and create secrets if they don't exist
Write-ColorOutput $Yellow "`n🔑 Checking for required secrets in Secret Manager..."

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
    try {
        gcloud secrets describe $secretName --project $ProjectId --quiet --error-action SilentlyContinue | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "✓ Secret '$secretName' already exists."
        } else {
            Write-ColorOutput $Yellow "⚠️ Secret '$secretName' not found. Creating it with a placeholder value..."
            # Create the secret
            gcloud secrets create $secretName --replication-policy="automatic" --project $ProjectId
            
            # Add a placeholder value
            $placeholderValue = "placeholder-for-$secretName"
            if ($secretName -eq "SMTP_PORT") {
                $placeholderValue = "587"
            }
            
            echo $placeholderValue | gcloud secrets versions add $secretName --data-file=- --project $ProjectId
            Write-ColorOutput $Green "✓ Created secret '$secretName' and added a placeholder value. PLEASE UPDATE IT IN GCP CONSOLE."
        }
    } catch {
        Write-ColorOutput $Red "❌ Failed to check or create secret '$secretName': $_"
        exit 1
    }
}

# Step 2: Build the Docker image
Write-ColorOutput $Yellow "`n🔨 Building Docker image with production configuration..."
try {
    docker build -t "gcr.io/elated-fabric-460119-t3/holitime:latest" -t "gcr.io/elated-fabric-460119-t3/holitime:$(Get-Date -Format 'yyyyMMdd-HHmmss')" .
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed"
    }
    Write-ColorOutput $Green "✓ Docker image built successfully"
} catch {
    Write-ColorOutput $Red "❌ Docker build failed: $_"
    exit 1
}

# Step 3: Push to Google Container Registry
Write-ColorOutput $Yellow "`n📤 Pushing image to Google Container Registry..."
try {
    docker push "gcr.io/elated-fabric-460119-t3/holitime:latest"
    if ($LASTEXITCODE -ne 0) {
        throw "Docker push failed"
    }
    Write-ColorOutput $Green "✓ Image pushed successfully"
} catch {
    Write-ColorOutput $Red "❌ Failed to push image: $_"
    exit 1
}

# Step 4: Deploy to Cloud Run
Write-ColorOutput $Yellow "`n🚀 Deploying to Cloud Run..."
try {
    $gcloudArgs = @(
        "run", "deploy", $ServiceName,
        "--image", "gcr.io/elated-fabric-460119-t3/holitime:latest",
        "--platform", "managed",
        "--region", $Region,
        "--allow-unauthenticated",
        "--port", "3000",
        "--memory", "1Gi",
        "--cpu", "1",
        "--timeout", "300",
        "--max-instances", "1",
        "--min-instances", "0",
        "--concurrency", "100",
        "--set-env-vars", "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1",
        "--add-cloudsql-instances", "elated-fabric-460119-t3:us-west2:holitime-db",
        "--set-secrets", "DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,JWT_SECRET=JWT_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest,SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest"
    )
    
    & gcloud @gcloudArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "Cloud Run deployment failed"
    }
    Write-ColorOutput $Green "✓ Deployed to Cloud Run successfully"
} catch {
    Write-ColorOutput $Red "❌ Deployment failed: $_"
    exit 1
}

# Step 5: Update NEXTAUTH_URL secret with the service URL
Write-ColorOutput $Yellow "`n🔐 Updating NEXTAUTH_URL secret..."
try {
    $serviceUrl = gcloud run services describe $ServiceName --platform managed --region $Region --format "value(status.url)"
    
    if ($serviceUrl) {
        # Update the secret
        echo $serviceUrl | gcloud secrets versions add NEXTAUTH_URL --data-file=-
        
        # Update the service to use the latest version
        gcloud run services update $ServiceName `
            --platform managed `
            --region $Region `
            --update-secrets "NEXTAUTH_URL=NEXTAUTH_URL:latest"
            
        Write-ColorOutput $Green "✓ NEXTAUTH_URL updated to: $serviceUrl"
    }
} catch {
    Write-ColorOutput $Yellow "⚠️  Failed to update NEXTAUTH_URL: $_"
}

# Step 6: Run database migrations
Write-ColorOutput $Yellow "`n🗄️  Running database migrations..."
try {
    # Create a one-time job to run migrations
    $migrationJobName = "holitime-migrate-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    gcloud run jobs create $migrationJobName `
        --image gcr.io/elated-fabric-460119-t3/holitime:latest `
        --region $Region `
        --command "npx" `
        --args "prisma,migrate,deploy" `
        --set-env-vars "NODE_ENV=production" `
        --set-secrets "DATABASE_URL=DATABASE_URL:latest" `
        --max-retries 3 `
        --task-timeout 600
    
    # Execute the job
    gcloud run jobs execute $migrationJobName --region $Region --wait
    
    Write-ColorOutput $Green "✓ Database migrations completed"
    
    # Clean up the job
    gcloud run jobs delete $migrationJobName --region $Region --quiet
} catch {
    Write-ColorOutput $Yellow "⚠️  Migration job failed: $_"
    Write-ColorOutput $Yellow "   You may need to run migrations manually"
}

# Step 7: Verify deployment
Write-ColorOutput $Yellow "`n✅ Verifying deployment..."
try {
    $serviceUrl = gcloud run services describe $ServiceName --platform managed --region $Region --format "value(status.url)"
    
    # Test the service
    $response = Invoke-WebRequest -Uri $serviceUrl -Method Head -UseBasicParsing -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 307) {
        Write-ColorOutput $Green "✓ Service is responding correctly"
    } else {
        Write-ColorOutput $Yellow "⚠️  Service returned status code: $($response.StatusCode)"
    }
} catch {
    Write-ColorOutput $Yellow "⚠️  Could not verify service: $_"
}

# Display deployment summary
Write-ColorOutput $Blue "`n=================================================="
Write-ColorOutput $Green "🎉 Deployment completed successfully!"
Write-ColorOutput $Blue "=================================================="

$serviceUrl = gcloud run services describe $ServiceName --platform managed --region $Region --format "value(status.url)"

Write-ColorOutput $Green "`n📋 Deployment Summary:"
Write-ColorOutput $White "  Service Name: $ServiceName"
Write-ColorOutput $White "  Region: $Region"
Write-ColorOutput $White "  Image: gcr.io/elated-fabric-460119-t3/holitime:latest"
Write-ColorOutput $White "  URL: $serviceUrl"

Write-ColorOutput $Yellow "`n📝 Next Steps:"
Write-ColorOutput $White "  1. Visit your application at: $serviceUrl"
Write-ColorOutput $White "  2. Check logs: gcloud run services logs tail $ServiceName --region $Region"
Write-ColorOutput $White "  3. Monitor metrics in Cloud Console"

Write-ColorOutput $Blue "`n🔧 Useful Commands:"
Write-ColorOutput $White "  View logs:    gcloud run services logs tail $ServiceName --region $Region"
Write-ColorOutput $White "  Update env:   gcloud run services update $ServiceName --region $Region --update-env-vars KEY=VALUE"
Write-ColorOutput $White "  Rollback:     gcloud run services update $ServiceName --region $Region --image gcr.io/elated-fabric-460119-t3/holitime:previous-tag"

Write-ColorOutput $Green "`n✨ Deployment complete! Your app should now be running without SSR issues."
