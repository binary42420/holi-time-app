#!/usr/bin/env pwsh

# Emergency Database Fix Script
Write-Host "🚨 EMERGENCY DATABASE FIX" -ForegroundColor Red
Write-Host "=========================" -ForegroundColor Red

$appUrl = "https://holitime-438323004618.us-west2.run.app"
$apiUrl = "$appUrl/api/admin/fix-database"

# Step 1: Diagnose the database
Write-Host "🔍 Step 1: Diagnosing database..." -ForegroundColor Yellow
try {
    $diagnoseBody = @{ action = "diagnose" } | ConvertTo-Json
    $diagnoseResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $diagnoseBody -ContentType "application/json" -TimeoutSec 30
    
    if ($diagnoseResponse.success) {
        Write-Host "✅ Database diagnosis completed!" -ForegroundColor Green
        Write-Host "📊 Results:" -ForegroundColor Cyan
        Write-Host "   - Connection: $($diagnoseResponse.results.connection)" -ForegroundColor White
        Write-Host "   - Shifts: $($diagnoseResponse.results.shifts.count)" -ForegroundColor White
        Write-Host "   - Jobs: $($diagnoseResponse.results.jobs.count)" -ForegroundColor White
        Write-Host "   - Companies: $($diagnoseResponse.results.companies.count)" -ForegroundColor White
        Write-Host "   - Users: $($diagnoseResponse.results.users.count)" -ForegroundColor White
        Write-Host "   - Bad dates: $($diagnoseResponse.results.shifts.badDates.Count)" -ForegroundColor White
        
        if ($diagnoseResponse.results.shifts.count -eq 0) {
            Write-Host "❌ NO SHIFTS FOUND! This is likely the main issue." -ForegroundColor Red
        }
        
        if ($diagnoseResponse.results.shifts.badDates.Count -gt 0) {
            Write-Host "⚠️  Found shifts with bad dates - these will be fixed." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Diagnosis failed: $($diagnoseResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to diagnose database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Ask for confirmation
Write-Host ""
Write-Host "🔧 Step 2: Ready to apply fixes..." -ForegroundColor Yellow
$confirmation = Read-Host "Do you want to proceed with the database fixes? (y/N)"

if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Fix cancelled by user." -ForegroundColor Red
    exit 0
}

# Step 3: Apply fixes
Write-Host "🔧 Step 3: Applying database fixes..." -ForegroundColor Yellow
try {
    $fixBody = @{ action = "fix" } | ConvertTo-Json
    $fixResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $fixBody -ContentType "application/json" -TimeoutSec 60
    
    if ($fixResponse.success) {
        Write-Host "✅ Database fixes applied successfully!" -ForegroundColor Green
        Write-Host "🔧 Fixes applied:" -ForegroundColor Cyan
        Write-Host "   - Null dates fixed: $($fixResponse.fixes.nullDates)" -ForegroundColor White
        Write-Host "   - Invalid ranges fixed: $($fixResponse.fixes.invalidRanges)" -ForegroundColor White
        Write-Host "   - Invalid status fixed: $($fixResponse.fixes.invalidStatus)" -ForegroundColor White
    } else {
        Write-Host "❌ Fix failed: $($fixResponse.error)" -ForegroundColor Red
        Write-Host "Details: $($fixResponse.details)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to apply fixes: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Verify the fix
Write-Host ""
Write-Host "✅ Step 4: Verifying fixes..." -ForegroundColor Yellow
try {
    $verifyBody = @{ action = "diagnose" } | ConvertTo-Json
    $verifyResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $verifyBody -ContentType "application/json" -TimeoutSec 30
    
    if ($verifyResponse.success) {
        Write-Host "✅ Verification completed!" -ForegroundColor Green
        Write-Host "📊 Updated Results:" -ForegroundColor Cyan
        Write-Host "   - Shifts: $($verifyResponse.results.shifts.count)" -ForegroundColor White
        Write-Host "   - Bad dates remaining: $($verifyResponse.results.shifts.badDates.Count)" -ForegroundColor White
        
        if ($verifyResponse.results.shifts.badDates.Count -eq 0) {
            Write-Host "🎉 All date issues have been resolved!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "⚠️  Verification failed, but fixes may have been applied." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 DATABASE FIX COMPLETED!" -ForegroundColor Green
Write-Host "📱 You can now check your app: $appUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 If you still don't see shifts, you may need to:" -ForegroundColor Yellow
Write-Host "   1. Create new shifts through the app interface" -ForegroundColor White
Write-Host "   2. Check if there are any filters applied in the UI" -ForegroundColor White
Write-Host "   3. Refresh your browser cache" -ForegroundColor White