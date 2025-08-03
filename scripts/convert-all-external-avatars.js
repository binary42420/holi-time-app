import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 10; // Process users in batches to avoid overwhelming the system
const FETCH_TIMEOUT = 15000; // 15 second timeout per image
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB max image size
const RETRY_ATTEMPTS = 3; // Retry failed conversions

class AvatarConverter {
  constructor() {
    this.stats = {
      total: 0,
      converted: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };
  }

  async convertAllExternalAvatars(options = {}) {
    const { dryRun = false, verbose = true } = options;
    
    console.log('🚀 Starting bulk avatar conversion process...\n');
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made to the database\n');
    }

    try {
      // Find all users with external URLs in avatarData
      const usersWithExternalAvatars = await this.findUsersWithExternalAvatars();
      
      if (usersWithExternalAvatars.length === 0) {
        console.log('✅ No users found with external avatar URLs. All avatars are already converted!');
        return this.stats;
      }

      this.stats.total = usersWithExternalAvatars.length;
      console.log(`📊 Found ${this.stats.total} users with external avatar URLs\n`);

      // Process users in batches
      for (let i = 0; i < usersWithExternalAvatars.length; i += BATCH_SIZE) {
        const batch = usersWithExternalAvatars.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(usersWithExternalAvatars.length / BATCH_SIZE);
        
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)...`);
        
        await this.processBatch(batch, dryRun, verbose);
        
        // Small delay between batches to be gentle on external servers
        if (i + BATCH_SIZE < usersWithExternalAvatars.length) {
          console.log('⏳ Waiting 2 seconds before next batch...\n');
          await this.sleep(2000);
        }
      }

      // Print final summary
      this.printSummary();
      
      return this.stats;

    } catch (error) {
      console.error('❌ Fatal error during conversion process:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  async findUsersWithExternalAvatars() {
    return await prisma.user.findMany({
      where: {
        avatarData: {
          not: null,
          // Find URLs that start with http:// or https://
          startsWith: 'http'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  async processBatch(users, dryRun, verbose) {
    const promises = users.map(user => this.convertUserAvatar(user, dryRun, verbose));
    await Promise.allSettled(promises);
  }

  async convertUserAvatar(user, dryRun, verbose) {
    const { id, name, email, avatarData } = user;
    
    try {
      if (verbose) {
        console.log(`👤 Processing: ${name} (${email})`);
        console.log(`   Current URL: ${avatarData}`);
      }

      // Validate URL format
      if (!this.isValidUrl(avatarData)) {
        if (verbose) console.log(`   ⚠️  Invalid URL format, skipping`);
        this.stats.skipped++;
        return;
      }

      // Convert with retry logic
      const convertedData = await this.convertWithRetry(avatarData, RETRY_ATTEMPTS);
      
      if (!convertedData) {
        if (verbose) console.log(`   ❌ Failed to convert after ${RETRY_ATTEMPTS} attempts`);
        this.stats.failed++;
        this.stats.errors.push({
          user: `${name} (${email})`,
          url: avatarData,
          error: 'Failed after all retry attempts'
        });
        return;
      }

      // Save to database (unless dry run)
      if (!dryRun) {
        await prisma.user.update({
          where: { id },
          data: { avatarData: convertedData }
        });
      }

      if (verbose) {
        console.log(`   ✅ Converted successfully (${convertedData.length} chars)`);
        if (dryRun) console.log(`   🔍 DRY RUN: Would save to database`);
      }
      
      this.stats.converted++;

    } catch (error) {
      if (verbose) console.log(`   ❌ Error: ${error.message}`);
      this.stats.failed++;
      this.stats.errors.push({
        user: `${name} (${email})`,
        url: avatarData,
        error: error.message
      });
    }
  }

  async convertWithRetry(url, maxAttempts) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.fetchAndConvert(url);
      } catch (error) {
        console.log(`   🔄 Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
        
        if (attempt < maxAttempts) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`   ⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    return null;
  }

  async fetchAndConvert(url) {
    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Holitime-Avatar-Converter/1.0',
          'Accept': 'image/*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
        throw new Error(`Image too large: ${contentLength} bytes (max: ${MAX_IMAGE_SIZE})`);
      }

      // Get image data
      const imageBuffer = await response.arrayBuffer();
      
      // Double-check size after download
      if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
        throw new Error(`Image too large: ${imageBuffer.byteLength} bytes (max: ${MAX_IMAGE_SIZE})`);
      }

      // Convert to base64
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;

      return dataUrl;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout after ${FETCH_TIMEOUT}ms`);
      }
      
      throw error;
    }
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONVERSION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${this.stats.total}`);
    console.log(`✅ Successfully converted: ${this.stats.converted}`);
    console.log(`⚠️  Skipped (invalid): ${this.stats.skipped}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`📈 Success rate: ${this.stats.total > 0 ? ((this.stats.converted / this.stats.total) * 100).toFixed(1) : 0}%`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.user}`);
        console.log(`   URL: ${error.url}`);
        console.log(`   Error: ${error.error}\n`);
      });
    }

    if (this.stats.converted > 0) {
      console.log('\n🎉 Conversion completed successfully!');
      console.log('All converted avatars are now stored locally and will load much faster.');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    verbose: !args.includes('--quiet') && !args.includes('-q'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log(`
🖼️  Avatar Conversion Script

Usage: node scripts/convert-all-external-avatars.js [options]

Options:
  --dry-run, -d     Show what would be converted without making changes
  --quiet, -q       Reduce output verbosity
  --help, -h        Show this help message

Examples:
  node scripts/convert-all-external-avatars.js
  node scripts/convert-all-external-avatars.js --dry-run
  node scripts/convert-all-external-avatars.js --quiet

This script will:
1. Find all users with external URLs in avatarData
2. Fetch each external image
3. Convert to base64 format
4. Save back to the database
5. Provide detailed progress and error reporting
`);
    return;
  }

  const converter = new AvatarConverter();
  
  try {
    await converter.convertAllExternalAvatars(options);
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AvatarConverter };