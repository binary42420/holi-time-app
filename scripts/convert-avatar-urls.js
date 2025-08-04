/**
 * Avatar URL to Base64 Converter
 * 
 * This script converts image URLs to base64 format for avatar storage.
 * Supports multiple input formats and includes error handling.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  inputFile: 'test-urls.txt', // Input file with URLs
  outputFile: 'avatar-base64-results.json', // Output file
  maxFileSize: 5 * 1024 * 1024, // 5MB max file size
  timeout: 30000, // 30 second timeout
  concurrent: 5, // Process 5 images at a time
  retries: 3, // Retry failed downloads
};

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(url, retryCount = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const request = client.get(url, { timeout: CONFIG.timeout }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadImageAsBase64(response.headers.location, retryCount)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        return reject(new Error(`Invalid content type: ${contentType}`));
      }

      const contentLength = parseInt(response.headers['content-length'] || '0');
      if (contentLength > CONFIG.maxFileSize) {
        return reject(new Error(`File too large: ${contentLength} bytes`));
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

    request.on('error', (error) => {
      if (retryCount < CONFIG.retries) {
        console.log(`Retrying ${url} (attempt ${retryCount + 1}/${CONFIG.retries})`);
        setTimeout(() => {
          downloadImageAsBase64(url, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, 1000 * (retryCount + 1));
      } else {
        reject(error);
      }
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Process URLs in batches to avoid overwhelming the server
 */
async function processBatch(urls) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += CONFIG.concurrent) {
    const batch = urls.slice(i, i + CONFIG.concurrent);
    console.log(`Processing batch ${Math.floor(i / CONFIG.concurrent) + 1}/${Math.ceil(urls.length / CONFIG.concurrent)} (${batch.length} images)`);
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await downloadImageAsBase64(item.url);
        console.log(`✅ ${item.identifier || item.url} - ${(result.size / 1024).toFixed(1)}KB`);
        return {
          ...item,
          ...result
        };
      } catch (error) {
        console.log(`❌ ${item.identifier || item.url} - ${error.message}`);
        return {
          ...item,
          success: false,
          error: error.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to be respectful
    if (i + CONFIG.concurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Parse input file - supports multiple formats
 */
function parseInputFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  const urls = [];
  
  for (const line of lines) {
    try {
      // Try to parse as JSON first (for structured data)
      const parsed = JSON.parse(line);
      if (parsed.url) {
        urls.push({
          identifier: parsed.id || parsed.email || parsed.name || parsed.identifier,
          url: parsed.url,
          ...parsed
        });
      }
    } catch {
      // If not JSON, treat as plain URL or CSV
      if (line.includes(',')) {
        // CSV format: identifier,url
        const [identifier, url] = line.split(',').map(s => s.trim());
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          urls.push({ identifier, url });
        }
      } else if (line.startsWith('http://') || line.startsWith('https://')) {
        // Plain URL
        urls.push({ url: line });
      }
    }
  }
  
  return urls;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🖼️  Avatar URL to Base64 Converter');
  console.log('=====================================');
  
  const inputPath = path.resolve(CONFIG.inputFile);
  const outputPath = path.resolve(CONFIG.outputFile);
  
  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    console.log('\nCreate a file with one of these formats:');
    console.log('1. Plain URLs (one per line):');
    console.log('   https://example.com/avatar1.jpg');
    console.log('   https://example.com/avatar2.png');
    console.log('');
    console.log('2. CSV format (identifier,url):');
    console.log('   user1,https://example.com/avatar1.jpg');
    console.log('   user2@email.com,https://example.com/avatar2.png');
    console.log('');
    console.log('3. JSON format (one per line):');
    console.log('   {"id": "user1", "url": "https://example.com/avatar1.jpg"}');
    console.log('   {"email": "user2@email.com", "url": "https://example.com/avatar2.png"}');
    return;
  }

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
    console.log('');

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
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { downloadImageAsBase64, processBatch, parseInputFile };