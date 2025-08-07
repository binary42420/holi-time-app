const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  // Target dimensions for avatars
  width: 128,
  height: 128,
  
  // Compression settings
  quality: 75, // JPEG quality (1-100)
  format: 'jpeg', // Output format
  
  // Size limits
  maxSizeKB: 50, // Maximum size in KB after compression
  
  // Processing options
  batchSize: 10, // Process users in batches
  dryRun: false, // Set to true to see what would be processed without making changes
};

/**
 * Parse a data URL and extract buffer and mime type
 */
function parseDataUrl(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  return { buffer, mimeType, base64Data };
}

/**
 * Compress an image buffer using Sharp
 */
async function compressImage(inputBuffer, originalMimeType) {
  try {
    let sharpInstance = sharp(inputBuffer);
    
    // Get original metadata
    const metadata = await sharpInstance.metadata();
    console.log(`    Original: ${metadata.width}x${metadata.height}, ${metadata.format}, ${Math.round(inputBuffer.length / 1024)}KB`);
    
    // Resize and compress
    const outputBuffer = await sharpInstance
      .resize(CONFIG.width, CONFIG.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: CONFIG.quality,
        progressive: true,
        mozjpeg: true // Use mozjpeg encoder for better compression
      })
      .toBuffer();
    
    const outputSizeKB = Math.round(outputBuffer.length / 1024);
    console.log(`    Compressed: ${CONFIG.width}x${CONFIG.height}, jpeg, ${outputSizeKB}KB`);
    
    // Check if compression was successful
    if (outputSizeKB > CONFIG.maxSizeKB) {
      console.log(`    ⚠️  Still too large (${outputSizeKB}KB > ${CONFIG.maxSizeKB}KB), trying higher compression...`);
      
      // Try with lower quality
      const higherCompressionBuffer = await sharp(inputBuffer)
        .resize(CONFIG.width, CONFIG.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 60, // Lower quality
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      const finalSizeKB = Math.round(higherCompressionBuffer.length / 1024);
      console.log(`    Final: ${CONFIG.width}x${CONFIG.height}, jpeg, ${finalSizeKB}KB (higher compression)`);
      
      return {
        buffer: higherCompressionBuffer,
        mimeType: 'image/jpeg',
        sizeKB: finalSizeKB,
        compressionRatio: Math.round((1 - higherCompressionBuffer.length / inputBuffer.length) * 100)
      };
    }
    
    return {
      buffer: outputBuffer,
      mimeType: 'image/jpeg',
      sizeKB: outputSizeKB,
      compressionRatio: Math.round((1 - outputBuffer.length / inputBuffer.length) * 100)
    };
    
  } catch (error) {
    console.error(`    ❌ Compression failed:`, error.message);
    throw error;
  }
}

/**
 * Process a single user's avatar
 */
async function processUserAvatar(user) {
  console.log(`\n📸 Processing avatar for: ${user.name} (${user.email})`);
  console.log(`   User ID: ${user.id}`);
  
  if (!user.avatarData) {
    console.log(`   ⏭️  No avatar data found`);
    return { status: 'skipped', reason: 'no_avatar' };
  }
  
  // Check if it's already a URL (not base64)
  if (user.avatarData.startsWith('http')) {
    console.log(`   ⏭️  Avatar is already a URL: ${user.avatarData.substring(0, 50)}...`);
    return { status: 'skipped', reason: 'already_url' };
  }
  
  // Check if it's base64 data
  if (!user.avatarData.startsWith('data:')) {
    console.log(`   ⏭️  Avatar data format not recognized: ${user.avatarData.substring(0, 50)}...`);
    return { status: 'skipped', reason: 'unknown_format' };
  }
  
  try {
    // Parse the data URL
    const { buffer: originalBuffer, mimeType: originalMimeType } = parseDataUrl(user.avatarData);
    const originalSizeKB = Math.round(originalBuffer.length / 1024);
    
    console.log(`   📊 Original size: ${originalSizeKB}KB, type: ${originalMimeType}`);
    
    // Skip if already small enough
    if (originalSizeKB <= CONFIG.maxSizeKB) {
      console.log(`   ✅ Already small enough (${originalSizeKB}KB <= ${CONFIG.maxSizeKB}KB)`);
      return { status: 'skipped', reason: 'already_small', originalSizeKB };
    }
    
    // Compress the image
    const compressed = await compressImage(originalBuffer, originalMimeType);
    
    // Create new data URL
    const newDataUrl = `data:${compressed.mimeType};base64,${compressed.buffer.toString('base64')}`;
    
    console.log(`   📉 Compression: ${originalSizeKB}KB → ${compressed.sizeKB}KB (${compressed.compressionRatio}% reduction)`);
    
    if (CONFIG.dryRun) {
      console.log(`   🔍 DRY RUN: Would update avatar data (${newDataUrl.length} chars)`);
      return { 
        status: 'would_compress', 
        originalSizeKB, 
        compressedSizeKB: compressed.sizeKB, 
        compressionRatio: compressed.compressionRatio 
      };
    }
    
    // Update the database
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarData: newDataUrl }
    });
    
    console.log(`   ✅ Avatar compressed and updated successfully`);
    
    return { 
      status: 'compressed', 
      originalSizeKB, 
      compressedSizeKB: compressed.sizeKB, 
      compressionRatio: compressed.compressionRatio 
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to process avatar:`, error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Main processing function
 */
async function compressAllAvatars() {
  console.log('🚀 Starting avatar compression process...\n');
  console.log(`📋 Configuration:`);
  console.log(`   Target size: ${CONFIG.width}x${CONFIG.height}`);
  console.log(`   Quality: ${CONFIG.quality}%`);
  console.log(`   Max size: ${CONFIG.maxSizeKB}KB`);
  console.log(`   Batch size: ${CONFIG.batchSize}`);
  console.log(`   Dry run: ${CONFIG.dryRun ? 'YES' : 'NO'}`);
  
  try {
    // Get all users with avatar data
    console.log('\n🔍 Finding users with avatar data...');
    
    const usersWithAvatars = await prisma.user.findMany({
      where: {
        avatarData: {
          not: null
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
    
    console.log(`📊 Found ${usersWithAvatars.length} users with avatar data`);
    
    if (usersWithAvatars.length === 0) {
      console.log('✅ No avatars to process!');
      return;
    }
    
    // Process in batches
    const results = {
      compressed: 0,
      skipped: 0,
      errors: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      details: []
    };
    
    for (let i = 0; i < usersWithAvatars.length; i += CONFIG.batchSize) {
      const batch = usersWithAvatars.slice(i, i + CONFIG.batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(usersWithAvatars.length / CONFIG.batchSize)} (${batch.length} users)`);
      
      for (const user of batch) {
        const result = await processUserAvatar(user);
        results.details.push({ user: user.name, ...result });
        
        if (result.status === 'compressed' || result.status === 'would_compress') {
          results.compressed++;
          results.totalOriginalSize += result.originalSizeKB || 0;
          results.totalCompressedSize += result.compressedSizeKB || 0;
        } else if (result.status === 'error') {
          results.errors++;
        } else {
          results.skipped++;
          if (result.originalSizeKB) {
            results.totalOriginalSize += result.originalSizeKB;
            results.totalCompressedSize += result.originalSizeKB; // No compression
          }
        }
      }
      
      // Small delay between batches to avoid overwhelming the database
      if (i + CONFIG.batchSize < usersWithAvatars.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPRESSION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${usersWithAvatars.length}`);
    console.log(`✅ Compressed: ${results.compressed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);
    
    if (results.totalOriginalSize > 0) {
      const totalSavings = results.totalOriginalSize - results.totalCompressedSize;
      const totalSavingsPercent = Math.round((totalSavings / results.totalOriginalSize) * 100);
      
      console.log(`\n💾 Storage Impact:`);
      console.log(`   Before: ${results.totalOriginalSize}KB`);
      console.log(`   After: ${results.totalCompressedSize}KB`);
      console.log(`   Saved: ${totalSavings}KB (${totalSavingsPercent}% reduction)`);
    }
    
    if (CONFIG.dryRun) {
      console.log(`\n🔍 This was a DRY RUN - no changes were made to the database.`);
      console.log(`   Run with CONFIG.dryRun = false to apply changes.`);
    }
    
    console.log('\n✅ Avatar compression process completed!');
    
  } catch (error) {
    console.error('\n❌ Fatal error during avatar compression:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  compressAllAvatars()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { compressAllAvatars, CONFIG };