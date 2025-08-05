#!/usr/bin/env pwsh

# Shift Time Alignment Script
Write-Host "🔧 SHIFT TIME ALIGNMENT" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

$appUrl = "https://holitime-438323004618.us-west2.run.app"
$apiUrl = "$appUrl/api/admin/fix-database"

Write-Host "🎯 This script will align shift start/end times with actual time entries" -ForegroundColor Yellow
Write-Host "📊 It will fix the mismatch caused by manually changing shift times" -ForegroundColor Yellow
Write-Host ""

# Step 1: Diagnose current state
Write-Host "🔍 Step 1: Diagnosing current database state..." -ForegroundColor Yellow
try {
    $diagnoseBody = @{ action = "diagnose" } | ConvertTo-Json
    $diagnoseResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $diagnoseBody -ContentType "application/json" -TimeoutSec 30
    
    if ($diagnoseResponse.success) {
        Write-Host "✅ Database diagnosis completed!" -ForegroundColor Green
        Write-Host "📊 Current state:" -ForegroundColor Cyan
        Write-Host "   - Total shifts: $($diagnoseResponse.results.shifts.count)" -ForegroundColor White
        Write-Host "   - Jobs: $($diagnoseResponse.results.jobs.count)" -ForegroundColor White
        Write-Host "   - Companies: $($diagnoseResponse.results.companies.count)" -ForegroundColor White
        Write-Host "   - Users: $($diagnoseResponse.results.users.count)" -ForegroundColor White
        
        if ($diagnoseResponse.results.shifts.badDates.Count -gt 0) {
            Write-Host "   - Shifts with bad dates: $($diagnoseResponse.results.shifts.badDates.Count)" -ForegroundColor Red
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
Write-Host "🔧 Step 2: Ready to align shift times..." -ForegroundColor Yellow
Write-Host "⚠️  This will:" -ForegroundColor Yellow
Write-Host "   - Align shift start/end times with actual time entries" -ForegroundColor White
Write-Host "   - Fix shifts without time entries by setting reasonable defaults" -ForegroundColor White
Write-Host "   - Set problematic shifts to DRAFT status for review" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Do you want to proceed with shift time alignment? (y/N)"

if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Alignment cancelled by user." -ForegroundColor Red
    exit 0
}

# Step 3: Run alignment
Write-Host "🔧 Step 3: Aligning shift times..." -ForegroundColor Yellow
try {
    $alignBody = @{ action = "align-times" } | ConvertTo-Json
    $alignResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $alignBody -ContentType "application/json" -TimeoutSec 120
    
    if ($alignResponse.success) {
        Write-Host "✅ Shift time alignment completed successfully!" -ForegroundColor Green
        Write-Host "📊 Alignment results:" -ForegroundColor Cyan
        Write-Host "   - Total shifts processed: $($alignResponse.results.totalShifts)" -ForegroundColor White
        Write-Host "   - Shifts aligned: $($alignResponse.results.alignedShifts)" -ForegroundColor White
        Write-Host "   - Shifts with time data: $($alignResponse.results.shiftsWithTimeData)" -ForegroundColor White
        Write-Host "   - Shifts without time data: $($alignResponse.results.shiftsWithoutTimeData)" -ForegroundColor White
        
        if ($alignResponse.results.details -and $alignResponse.results.details.Count -gt 0) {
            Write-Host ""
            Write-Host "📋 Detailed changes:" -ForegroundColor Cyan
            foreach ($detail in $alignResponse.results.details) {
                Write-Host "   🔧 Shift $($detail.shiftId) ($($detail.jobName))" -ForegroundColor White
                Write-Host "      Action: $($detail.action)" -ForegroundColor Gray
                Write-Host "      Old: $($detail.oldStart) - $($detail.oldEnd)" -ForegroundColor Red
                Write-Host "      New: $($detail.newStart) - $($detail.newEnd)" -ForegroundColor Green
            }
        }
        
        if ($alignResponse.results.alignedShifts -eq 0) {
            Write-Host "✅ All shift times were already properly aligned!" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Alignment failed: $($alignResponse.error)" -ForegroundColor Red
        Write-Host "Details: $($alignResponse.details)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to align shift times: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Verify the alignment
Write-Host ""
Write-Host "✅ Step 4: Verifying alignment..." -ForegroundColor Yellow
try {
    $verifyBody = @{ action = "diagnose" } | ConvertTo-Json
    $verifyResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $verifyBody -ContentType "application/json" -TimeoutSec 30
    
    if ($verifyResponse.success) {
        Write-Host "✅ Verification completed!" -ForegroundColor Green
        Write-Host "📊 Final state:" -ForegroundColor Cyan
        Write-Host "   - Total shifts: $($verifyResponse.results.shifts.count)" -ForegroundColor White
        Write-Host "   - Bad dates remaining: $($verifyResponse.results.shifts.badDates.Count)" -ForegroundColor White
        
        if ($verifyResponse.results.shifts.badDates.Count -eq 0) {
            Write-Host "🎉 All date issues have been resolved!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Some date issues remain - may need manual review" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  Verification failed, but alignment may have been successful." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 SHIFT TIME ALIGNMENT COMPLETED!" -ForegroundColor Green
Write-Host "📱 Check your app to see the corrected shift times: $appUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review shifts that were set to DRAFT status" -ForegroundColor White
Write-Host "   2. Verify that shift times now match your time entries" -ForegroundColor White
Write-Host "   3. Update any shifts that still need manual adjustment" -ForegroundColor White
Write-Host "   4. Clear browser cache if you don't see changes immediately" -ForegroundColor White