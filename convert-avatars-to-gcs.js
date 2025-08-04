import { PrismaClient } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.PROJECT_ID,
});

const bucketName = process.env.GCS_AVATAR_BUCKET;
const bucket = storage.bucket(bucketName);

/**
 * Parse base64 data URL and extract mime type and data
 */
function parseDataUrl(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  return {
    mimeType: matches[1],
    base64Data: matches[2]
  };
}

/**
 * Get file extension from mime type
 */
function getFileExtension(mimeType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  
  return extensions[mimeType] || 'jpg';
}

/**
 * Generate a unique filename for the avatar
 */
function generateAvatarFilename(userId, mimeType) {
  const extension = getFileExtension(mimeType);
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(userId + timestamp).digest('hex').substring(0, 8);
  return `avatars/${userId}-${timestamp}-${hash}.${extension}`;
}

/**
 * Upload base64 image to Google Cloud Storage
 */
async function uploadToGCS(base64Data, mimeType, filename) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create file in GCS
    const file = bucket.file(filename);
    
    // First, try uploading without public ACL (works with Uniform Bucket-Level Access)
    try {
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
      });
    } catch (uploadError) {
      // If that fails, try with legacy ACL approach
      if (uploadError.message.includes('uniform bucket-level access')) {
        throw uploadError; // Re-throw if it's definitely a uniform access issue
      }
      
      // Try alternative upload method
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000',
        },
        public: false, // Don't set public ACL
      });
    }
    
    // Try to make the file public (this will fail gracefully with uniform access)
    try {
      await file.makePublic();
    } catch (aclError) {
      // Ignore ACL errors - file is uploaded, just may not be publicly accessible
      console.log(`   ⚠️  Could not set public ACL (file uploaded successfully): ${aclError.message}`);
    }
    
    // Return the public URL
    return `https://storage.googleapis.com/${bucketName}/${filename}`;
  } catch (error) {
    throw new Error(`Failed to upload to GCS: ${error.message}`);
  }
}

/**
 * Convert a single user's base64 avatar to GCS URL
 */
async function convertUserAvatar(user) {
  try {
    console.log(`Processing ${user.name} (${user.email})...`);
    
    // Parse the base64 data URL
    const { mimeType, base64Data } = parseDataUrl(user.avatarData);
    
    // Generate filename
    const filename = generateAvatarFilename(user.id, mimeType);
    
    // Upload to GCS
    const gcsUrl = await uploadToGCS(base64Data, mimeType, filename);
    
    // Update user record with GCS URL
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarData: gcsUrl }
    });
    
    console.log(`✅ ${user.name}: Converted to ${gcsUrl}`);
    
    return {
      success: true,
      user: user.name,
      originalSize: Math.round(base64Data.length * 0.75), // Approximate original size in bytes
      gcsUrl
    };
    
  } catch (error) {
    console.log(`❌ ${user.name}: ${error.message}`);
    return {
      success: false,
      user: user.name,
      error: error.message
    };
  }
}

/**
 * Main conversion function
 */
async function convertAvatarsToGCS() {
  try {
    console.log('🚀 Starting avatar conversion to Google Cloud Storage...\n');
    
    // Check if GCS bucket exists and is accessible
    try {
      await bucket.getMetadata();
      console.log(`✅ Connected to GCS bucket: ${bucketName}\n`);
    } catch (error) {
      throw new Error(`Cannot access GCS bucket '${bucketName}': ${error.message}`);
    }
    
    // Get all users with base64 avatar data
    const users = await prisma.user.findMany({
      where: {
        avatarData: {
          startsWith: 'data:'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      }
    });
    
    console.log(`Found ${users.length} users with base64 avatar data\n`);
    
    if (users.length === 0) {
      console.log('🎉 No base64 avatars found. All avatars are already using URLs!');
      return;
    }
    
    const results = {
      successful: [],
      failed: [],
      totalSizeSaved: 0
    };
    
    // Process each user
    for (const user of users) {
      const result = await convertUserAvatar(user);
      
      if (result.success) {
        results.successful.push(result);
        results.totalSizeSaved += result.originalSize;
      } else {
        results.failed.push(result);
      }
      
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Print summary
    console.log('\n📊 Conversion Summary:');
    console.log(`✅ Successfully converted: ${results.successful.length} avatars`);
    console.log(`❌ Failed conversions: ${results.failed.length} avatars`);
    console.log(`💾 Total database size saved: ${Math.round(results.totalSizeSaved / 1024)} KB`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed conversions:');
      results.failed.forEach(failure => {
        console.log(`   - ${failure.user}: ${failure.error}`);
      });
    }
    
    if (results.successful.length > 0) {
      console.log('\n🎉 Avatar conversion completed successfully!');
      console.log('Benefits:');
      console.log('   • Faster page load times (no base64 decoding)');
      console.log('   • Reduced database size');
      console.log('   • Better caching with CDN');
      console.log('   • Improved mobile performance');
      console.log('   • Smart cache system compatibility');
    }
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Add command line options
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  
  // Just show what would be converted
  prisma.user.findMany({
    where: {
      avatarData: {
        startsWith: 'data:'
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarData: true
    }
  }).then(users => {
    console.log(`Would convert ${users.length} users:`);
    users.forEach(user => {
      const sizeKB = Math.round(user.avatarData.length * 0.75 / 1024);
      console.log(`   - ${user.name} (${user.email}) - ${sizeKB}KB`);
    });
    console.log('\nRun without --dry-run to perform the conversion.');
  }).finally(() => {
    prisma.$disconnect();
  });
} else {
  if (!force) {
    console.log('⚠️  This will convert all base64 avatars to Google Cloud Storage URLs.');
    console.log('   This action cannot be easily undone.');
    console.log('   Run with --dry-run first to see what will be converted.');
    console.log('   Add --force to proceed with the conversion.\n');
    process.exit(0);
  }
  
  // Run the conversion
  convertAvatarsToGCS();
}