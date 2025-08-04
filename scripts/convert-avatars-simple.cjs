/**
 * Simple Avatar URL to Base64 Converter
 * 
 * This script converts image URLs to base64 format for avatar storage.
 * Uses CommonJS to avoid module issues.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  inputFile: 'test-urls.txt',
  outputFile: 'avatar-base64-results.json',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  timeout: 30000, // 30 seconds
  concurrent: 3, // Process 3 at a time
};

/**
 * Download image and convert to base64
 */
function downloadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    console.log(`🔄 Downloading: ${url}`);
    
    const request = client.get(url, { timeout: CONFIG.timeout }, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }

      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        return reject(new Error(`Invalid content type: ${contentType}`));
      }

      const chunks = [];
      let totalSize = 0;

      response.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > CONFIG.maxFileSize) {
          request.destroy();
          return reject(new Error(`File too large: ${totalSize} bytes`));
        }
        chunks.push(chunk);
      });

      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const dataUri = `data:${contentType};base64,${base64}`;
          
          resolve({
            success: true,
            url,
            base64: dataUri,
            size: buffer.length,
            contentType
          });
        } catch (error) {
          reject(error);
        }
      });

      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Parse input file
 */
function parseInputFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  
  const urls = [];
  
  for (const line of lines) {
    try {
      // Try JSON first
      const parsed = JSON.parse(line);
      if (parsed.url) {
        urls.push({
          identifier: parsed.id || parsed.email || parsed.name || '',
          url: parsed.url
        });
      }
    } catch {
      // Try CSV or plain URL
      if (line.includes(',')) {
        const [identifier, url] = line.split(',').map(s => s.trim());
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          urls.push({ identifier, url });
        }
      } else if (line.startsWith('http://') || line.startsWith('https://')) {
        urls.push({ identifier: '', url: line });
      }
    }
  }
  
  return urls;
}

/**
 * Process URLs in batches
 */
async function processBatch(urls) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += CONFIG.concurrent) {
    const batch = urls.slice(i, i + CONFIG.concurrent);
    const batchNum = Math.floor(i / CONFIG.concurrent) + 1;
    const totalBatches = Math.ceil(urls.length / CONFIG.concurrent);
    
    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} images)`);
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await downloadImageAsBase64(item.url);
        console.log(`✅ ${item.identifier || item.url} - ${(result.size / 1024).toFixed(1)}KB`);
        return { ...item, ...result };
      } catch (error) {
        console.log(`❌ ${item.identifier || item.url} - ${error.message}`);
        return { ...item, success: false, error: error.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + CONFIG.concurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('🖼️  Avatar URL to Base64 Converter');
  console.log('=====================================');
  
  const inputPath = path.resolve(CONFIG.inputFile);
  const outputPath = path.resolve(CONFIG.outputFile);
  
  try {
    // Parse input file
    console.log(`📁 Reading input file: ${inputPath}`);
    const urls = parseInputFile(inputPath);
    
    if (urls.length === 0) {
      console.error('❌ No valid URLs found in input file');
      return;
    }
    
    console.log(`📊 Found ${urls.length} URLs to process`);
    console.log(`⚙️  Max file size: ${(CONFIG.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    console.log(`⚙️  Concurrent downloads: ${CONFIG.concurrent}`);
    console.log(`⚙️  Timeout: ${CONFIG.timeout / 1000}s`);

    // Process all URLs
    const startTime = Date.now();
    const results = await processBatch(urls);
    const endTime = Date.now();
    
    // Generate summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalSize = successful.reduce((sum, r) => sum + (r.size || 0), 0);
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📦 Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`⏱️  Time taken: ${((endTime - startTime) / 1000).toFixed(1)}s`);
    
    // Save results
    const output = {
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        totalSizeBytes: totalSize,
        processingTimeMs: endTime - startTime,
        timestamp: new Date().toISOString()
      },
      results: results
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
    
    // Show sample results
    if (successful.length > 0) {
      console.log('\n📋 Sample Results:');
      successful.slice(0, 3).forEach(result => {
        console.log(`   ${result.identifier || 'No ID'}: ${result.base64.substring(0, 50)}...`);
      });
    }
    
    // Show failed URLs if any
    if (failed.length > 0) {
      console.log('\n❌ Failed URLs:');
      failed.forEach(item => {
        console.log(`   ${item.identifier || item.url}: ${item.error}`);
      });
    }
    
    console.log('\n🎉 Conversion complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { downloadImageAsBase64, processBatch, parseInputFile };