# Quick Deployment Wrapper for HoliTime
# Provides simple commands for common deployment scenarios

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "staging", "prod", "rollback", "status", "logs", "test")]
    [string]$Action = "prod",
    
    [Parameter(Position=1)]
    [string]$Options = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnhancedScript = Join-Path $ScriptDir "deploy-cloud-run-enhanced.ps1"

function Show-Help {
    Write-Host "🚀 HoliTime Quick Deploy Commands" -ForegroundColor Blue
    Write-Host "=================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\quick-deploy.ps1 <action> [options]" -ForegroundColor Green
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  dev      - Deploy to development environment" -ForegroundColor White
    Write-Host "  staging  - Deploy to staging environment" -ForegroundColor White  
    Write-Host "  prod     - Deploy to production (default)" -ForegroundColor White
    Write-Host "  rollback - Rollback to previous version" -ForegroundColor White
    Write-Host "  status   - Check deployment status" -ForegroundColor White
    Write-Host "  logs     - View recent logs" -ForegroundColor White
    Write-Host "  test     - Run dry-run deployment" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\quick-deploy.ps1 dev                  # Deploy to development" -ForegroundColor Cyan
    Write-Host "  .\quick-deploy.ps1 prod -Verbose        # Verbose production deploy" -ForegroundColor Cyan
    Write-Host "  .\quick-deploy.ps1 test                 # Test deployment (dry run)" -ForegroundColor Cyan
    Write-Host "  .\quick-deploy.ps1 rollback             # Rollback production" -ForegroundColor Cyan
    Write-Host "  .\quick-deploy.ps1 status               # Check service status" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "For advanced options, use deploy-cloud-run-enhanced.ps1 directly" -ForegroundColor Gray
}

if (-not (Test-Path $EnhancedScript)) {
    Write-Error "Enhanced deployment script not found: $EnhancedScript"
    exit 1
}

switch ($Action.ToLower()) {
    "dev" {
        Write-Host "🔧 Deploying to Development Environment..." -ForegroundColor Blue
        & $EnhancedScript -Environment "development" -Memory "1Gi" -CPU "1" -MaxInstances 3 -MinInstances 0 $Options.Split(' ')
    }
    
    "staging" {
        Write-Host "🧪 Deploying to Staging Environment..." -ForegroundColor Blue
        & $EnhancedScript -Environment "staging" -Memory "1Gi" -CPU "1" -MaxInstances 5 -MinInstances 0 $Options.Split(' ')
    }
    
    "prod" {
        Write-Host "🚀 Deploying to Production Environment..." -ForegroundColor Blue
        & $EnhancedScript -Environment "production" -Memory "2Gi" -CPU "2" -MaxInstances 10 -MinInstances 1 $Options.Split(' ')
    }
    
    "rollback" {
        Write-Host "🔄 Rolling back to previous version..." -ForegroundColor Yellow
        & $EnhancedScript -Rollback $Options.Split(' ')
    }
    
    "test" {
        Write-Host "🧪 Running deployment test (dry run)..." -ForegroundColor Cyan
        & $EnhancedScript -DryRun -Verbose $Options.Split(' ')
    }
    
    "status" {
        Write-Host "📊 Checking deployment status..." -ForegroundColor Green
        try {
            $serviceUrl = gcloud run services describe holitime --platform managed --region us-west2 --format "value(status.url)" 2>$null
            $revisions = gcloud run revisions list --service holitime --region us-west2 --format "table(metadata.name,status.conditions[0].status,spec.template.spec.containers[0].image)" --limit 5
            
            Write-Host ""
            Write-Host "🌐 Service URL: $serviceUrl" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Recent Revisions:" -ForegroundColor Yellow
            Write-Host $revisions
            
            # Test service health
            if ($serviceUrl) {
                try {
                    $response = Invoke-WebRequest -Uri $serviceUrl -Method Head -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
                    Write-Host ""
                    Write-Host "✅ Service Health: OK (Status: $($response.StatusCode))" -ForegroundColor Green
                } catch {
                    Write-Host ""
                    Write-Host "❌ Service Health: FAILED ($_)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Error "Failed to get status: $_"
        }
    }
    
    "logs" {
        Write-Host "📝 Viewing recent logs..." -ForegroundColor Green
        try {
            gcloud run services logs tail holitime --region us-west2 --limit 50
        } catch {
            Write-Error "Failed to get logs: $_"
        }
    }
    
    default {
        Show-Help
    }
}