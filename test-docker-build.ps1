#!/usr/bin/env pwsh

# Test Docker build script for Holitime app
Write-Host "🐳 Testing Docker build for Holitime app..." -ForegroundColor Green

# Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t holitime-test .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker build successful!" -ForegroundColor Green

# Test run the container
Write-Host "Testing container startup..." -ForegroundColor Yellow
$containerId = docker run -d -p 8080:8080 -e NODE_ENV=production -e PORT=8080 holitime-test

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Container startup failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Container started with ID: $containerId" -ForegroundColor Green

# Wait a few seconds for startup
Start-Sleep -Seconds 10

# Check if container is still running
$containerStatus = docker ps -q --filter "id=$containerId"
if ($containerStatus) {
    Write-Host "✅ Container is running successfully!" -ForegroundColor Green
    Write-Host "🌐 App should be available at http://localhost:8080" -ForegroundColor Cyan
    
    # Test basic connectivity
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 10 -ErrorAction Stop
        Write-Host "✅ HTTP response received: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  HTTP test failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Container may still be starting up..." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Container stopped unexpectedly!" -ForegroundColor Red
    Write-Host "Container logs:" -ForegroundColor Yellow
    docker logs $containerId
}

# Cleanup
Write-Host "Stopping and removing test container..." -ForegroundColor Yellow
docker stop $containerId | Out-Null
docker rm $containerId | Out-Null

Write-Host "🧹 Cleanup complete!" -ForegroundColor Green