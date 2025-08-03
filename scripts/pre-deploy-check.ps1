# Pre-deployment validation script
Write-Host "🚀 Running pre-deployment checks..." -ForegroundColor Cyan

$errors = @()

# Check 1: Verify Prisma schema
Write-Host "📋 Checking Prisma schema..." -ForegroundColor Blue
try {
    $env:DATABASE_URL = "postgresql://holitime-user:myDBpassWord1%21@35.235.75.173:5432/holitime"
    npx prisma validate
    if ($LASTEXITCODE -ne 0) {
        $errors += "Prisma schema validation failed"
    } else {
        Write-Host "✅ Prisma schema is valid" -ForegroundColor Green
    }
} catch {
    $errors += "Prisma schema validation error: $_"
}

# Check 2: Verify migrations exist
Write-Host "📋 Checking migrations..." -ForegroundColor Blue
$migrationFiles = Get-ChildItem -Path "prisma/migrations" -Directory -ErrorAction SilentlyContinue
if ($migrationFiles.Count -eq 0) {
    $errors += "No migration files found in prisma/migrations"
} else {
    Write-Host "✅ Found $($migrationFiles.Count) migration(s)" -ForegroundColor Green
}

# Check 3: Check migration status
Write-Host "📋 Checking migration status..." -ForegroundColor Blue
try {
    npx prisma migrate status
    if ($LASTEXITCODE -ne 0) {
        $errors += "Migration status check failed"
    } else {
        Write-Host "✅ Migration status check passed" -ForegroundColor Green
    }
} catch {
    $errors += "Migration status error: $_"
}

# Check 4: Verify environment files
Write-Host "📋 Checking environment files..." -ForegroundColor Blue
$envFiles = @(".env.development", ".env.production")
foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        Write-Host "✅ Found $envFile" -ForegroundColor Green
    } else {
        $errors += "Missing environment file: $envFile"
    }
}

# Check 5: Verify Docker files
Write-Host "📋 Checking Docker configuration..." -ForegroundColor Blue
if (Test-Path "Dockerfile") {
    Write-Host "✅ Dockerfile found" -ForegroundColor Green
} else {
    $errors += "Dockerfile not found"
}

if (Test-Path "cloudbuild.yaml") {
    Write-Host "✅ cloudbuild.yaml found" -ForegroundColor Green
} else {
    $errors += "cloudbuild.yaml not found"
}

# Check 6: Verify migration script
Write-Host "📋 Checking migration script..." -ForegroundColor Blue
if (Test-Path "scripts/migrate.sh") {
    Write-Host "✅ Migration script found" -ForegroundColor Green
} else {
    $errors += "Migration script not found: scripts/migrate.sh"
}

# Summary
Write-Host "`n" -NoNewline
if ($errors.Count -eq 0) {
    Write-Host "🎉 All pre-deployment checks passed! Ready to deploy." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Pre-deployment checks failed:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   • $error" -ForegroundColor Red
    }
    Write-Host "`nPlease fix these issues before deploying." -ForegroundColor Yellow
    exit 1
}