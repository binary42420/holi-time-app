#!/usr/bin/env pwsh

# Test Docker build locally
Write-Host "🐳 Testing Docker build locally..." -ForegroundColor Green

# Build the Docker image
Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
docker build -t holitime-test .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker build successful!" -ForegroundColor Green

# Test running the container (with dummy DATABASE_URL)
Write-Host "🚀 Testing container startup..." -ForegroundColor Yellow
docker run --rm -p 8080:8080 -e NODE_ENV=production -e DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy" -e PORT=8080 holitime-test

Write-Host "🎉 Container test completed!" -ForegroundColor Green