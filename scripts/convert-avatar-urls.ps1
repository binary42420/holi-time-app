# Avatar URL to Base64 Converter (PowerShell)
# Converts image URLs to base64 format for avatar storage

param(
    [string]$InputFile = "avatar-urls.txt",
    [string]$OutputFile = "avatar-base64-results.json",
    [int]$MaxFileSizeMB = 5,
    [int]$TimeoutSeconds = 30,
    [int]$Concurrent = 5
)

# Configuration
$MaxFileSize = $MaxFileSizeMB * 1024 * 1024
$TimeoutMs = $TimeoutSeconds * 1000

function Write-Status { param([string]$msg) Write-Host "🔄 $msg" -ForegroundColor Cyan }
function Write-Success { param([string]$msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error { param([string]$msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param([string]$msg) Write-Host "ℹ️  $msg" -ForegroundColor Blue }

function Download-ImageAsBase64 {
    param(
        [string]$Url,
        [string]$Identifier = ""
    )
    
    try {
        Write-Status "Downloading: $($Identifier ? $Identifier : $Url)"
        
        # Create web client with timeout
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        # Download image data
        $imageData = $webClient.DownloadData($Url)
        $webClient.Dispose()
        
        # Check file size
        if ($imageData.Length -gt $MaxFileSize) {
            throw "File too large: $($imageData.Length) bytes"
        }
        
        # Get content type from URL extension
        $extension = [System.IO.Path]::GetExtension($Url).ToLower()
        $contentType = switch ($extension) {
            ".jpg" { "image/jpeg" }
            ".jpeg" { "image/jpeg" }
            ".png" { "image/png" }
            ".gif" { "image/gif" }
            ".webp" { "image/webp" }
            ".bmp" { "image/bmp" }
            default { "image/jpeg" }
        }
        
        # Convert to base64
        $base64 = [Convert]::ToBase64String($imageData)
        $dataUri = "data:$contentType;base64,$base64"
        
        Write-Success "$($Identifier ? $Identifier : $Url) - $([math]::Round($imageData.Length / 1024, 1))KB"
        
        return @{
            success = $true
            url = $Url
            identifier = $Identifier
            base64 = $dataUri
            size = $imageData.Length
            contentType = $contentType
        }
    }
    catch {
        Write-Error "$($Identifier ? $Identifier : $Url) - $($_.Exception.Message)"
        return @{
            success = $false
            url = $Url
            identifier = $Identifier
            error = $_.Exception.Message
        }
    }
}

function Parse-InputFile {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        throw "Input file not found: $FilePath"
    }
    
    $content = Get-Content $FilePath -Raw
    $lines = $content -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    
    $urls = @()
    
    foreach ($line in $lines) {
        try {
            # Try to parse as JSON
            $parsed = $line | ConvertFrom-Json
            if ($parsed.url) {
                $urls += @{
                    identifier = $parsed.id ?? $parsed.email ?? $parsed.name ?? $parsed.identifier ?? ""
                    url = $parsed.url
                }
            }
        }
        catch {
            # If not JSON, try CSV or plain URL
            if ($line -match ",") {
                # CSV format: identifier,url
                $parts = $line -split "," | ForEach-Object { $_.Trim() }
                if ($parts.Length -ge 2 -and ($parts[1] -match "^https?://")) {
                    $urls += @{
                        identifier = $parts[0]
                        url = $parts[1]
                    }
                }
            }
            elseif ($line -match "^https?://") {
                # Plain URL
                $urls += @{
                    identifier = ""
                    url = $line
                }
            }
        }
    }
    
    return $urls
}

function Process-Batch {
    param([array]$Urls)
    
    $results = @()
    $totalBatches = [math]::Ceiling($Urls.Count / $Concurrent)
    
    for ($i = 0; $i -lt $Urls.Count; $i += $Concurrent) {
        $batchNum = [math]::Floor($i / $Concurrent) + 1
        $batch = $Urls[$i..([math]::Min($i + $Concurrent - 1, $Urls.Count - 1))]
        
        Write-Info "Processing batch $batchNum/$totalBatches ($($batch.Count) images)"
        
        # Process batch in parallel using jobs
        $jobs = @()
        foreach ($item in $batch) {
            $job = Start-Job -ScriptBlock {
                param($Url, $Identifier, $MaxFileSize)
                
                try {
                    $webClient = New-Object System.Net.WebClient
                    $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    
                    $imageData = $webClient.DownloadData($Url)
                    $webClient.Dispose()
                    
                    if ($imageData.Length -gt $MaxFileSize) {
                        throw "File too large: $($imageData.Length) bytes"
                    }
                    
                    $extension = [System.IO.Path]::GetExtension($Url).ToLower()
                    $contentType = switch ($extension) {
                        ".jpg" { "image/jpeg" }
                        ".jpeg" { "image/jpeg" }
                        ".png" { "image/png" }
                        ".gif" { "image/gif" }
                        ".webp" { "image/webp" }
                        ".bmp" { "image/bmp" }
                        default { "image/jpeg" }
                    }
                    
                    $base64 = [Convert]::ToBase64String($imageData)
                    $dataUri = "data:$contentType;base64,$base64"
                    
                    return @{
                        success = $true
                        url = $Url
                        identifier = $Identifier
                        base64 = $dataUri
                        size = $imageData.Length
                        contentType = $contentType
                    }
                }
                catch {
                    return @{
                        success = $false
                        url = $Url
                        identifier = $Identifier
                        error = $_.Exception.Message
                    }
                }
            } -ArgumentList $item.url, $item.identifier, $MaxFileSize
            
            $jobs += $job
        }
        
        # Wait for all jobs to complete
        $batchResults = $jobs | Wait-Job | Receive-Job
        $jobs | Remove-Job
        
        # Display results
        foreach ($result in $batchResults) {
            if ($result.success) {
                Write-Success "$($result.identifier ? $result.identifier : $result.url) - $([math]::Round($result.size / 1024, 1))KB"
            } else {
                Write-Error "$($result.identifier ? $result.identifier : $result.url) - $($result.error)"
            }
        }
        
        $results += $batchResults
        
        # Small delay between batches
        if ($i + $Concurrent -lt $Urls.Count) {
            Start-Sleep -Seconds 1
        }
    }
    
    return $results
}

# Main execution
Write-Host "🖼️  Avatar URL to Base64 Converter (PowerShell)" -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Magenta

$inputPath = Resolve-Path $InputFile -ErrorAction SilentlyContinue
if (-not $inputPath) {
    Write-Error "Input file not found: $InputFile"
    Write-Host ""
    Write-Host "Create a file with one of these formats:" -ForegroundColor Yellow
    Write-Host "1. Plain URLs (one per line):" -ForegroundColor Yellow
    Write-Host "   https://example.com/avatar1.jpg"
    Write-Host "   https://example.com/avatar2.png"
    Write-Host ""
    Write-Host "2. CSV format (identifier,url):" -ForegroundColor Yellow
    Write-Host "   user1,https://example.com/avatar1.jpg"
    Write-Host "   user2@email.com,https://example.com/avatar2.png"
    Write-Host ""
    Write-Host "3. JSON format (one per line):" -ForegroundColor Yellow
    Write-Host '   {"id": "user1", "url": "https://example.com/avatar1.jpg"}'
    Write-Host '   {"email": "user2@email.com", "url": "https://example.com/avatar2.png"}'
    exit 1
}

try {
    # Parse input file
    Write-Info "Reading input file: $inputPath"
    $urls = Parse-InputFile $inputPath
    
    if ($urls.Count -eq 0) {
        Write-Error "No valid URLs found in input file"
        exit 1
    }
    
    Write-Info "Found $($urls.Count) URLs to process"
    Write-Info "Max file size: $($MaxFileSizeMB)MB"
    Write-Info "Concurrent downloads: $Concurrent"
    Write-Info "Timeout: $($TimeoutSeconds)s"
    Write-Host ""
    
    # Process all URLs
    $startTime = Get-Date
    $results = Process-Batch $urls
    $endTime = Get-Date
    
    # Generate summary
    $successful = $results | Where-Object { $_.success }
    $failed = $results | Where-Object { -not $_.success }
    $totalSize = ($successful | Measure-Object -Property size -Sum).Sum
    $processingTime = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "📊 Summary:" -ForegroundColor Magenta
    Write-Success "Successful: $($successful.Count)"
    Write-Error "Failed: $($failed.Count)"
    Write-Info "Total size: $([math]::Round($totalSize / 1024 / 1024, 2))MB"
    Write-Info "Time taken: $([math]::Round($processingTime, 1))s"
    
    # Create output
    $output = @{
        summary = @{
            total = $results.Count
            successful = $successful.Count
            failed = $failed.Count
            totalSizeBytes = $totalSize
            processingTimeSeconds = $processingTime
            timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        results = $results
    }
    
    # Save results
    $outputPath = Resolve-Path $OutputFile -ErrorAction SilentlyContinue
    if (-not $outputPath) {
        $outputPath = Join-Path (Get-Location) $OutputFile
    }
    
    $output | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
    Write-Success "Results saved to: $outputPath"
    
    # Show failed URLs if any
    if ($failed.Count -gt 0) {
        Write-Host ""
        Write-Host "❌ Failed URLs:" -ForegroundColor Red
        foreach ($item in $failed) {
            Write-Host "   $($item.identifier ? $item.identifier : $item.url): $($item.error)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "🎉 Conversion complete!" -ForegroundColor Green
}
catch {
    Write-Error "Error: $($_.Exception.Message)"
    exit 1
}