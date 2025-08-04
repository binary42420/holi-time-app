import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

async function testGCSConnection() {
  try {
    console.log('🔍 Testing Google Cloud Storage connection...\n');
    
    // Check required environment variables
    const projectId = process.env.PROJECT_ID;
    const bucketName = process.env.GCS_AVATAR_BUCKET;
    
    if (!projectId) {
      throw new Error('PROJECT_ID environment variable is not set');
    }
    
    if (!bucketName) {
      throw new Error('GCS_AVATAR_BUCKET environment variable is not set');
    }
    
    console.log(`Project ID: ${projectId}`);
    console.log(`Bucket Name: ${bucketName}\n`);
    
    // Initialize Google Cloud Storage
    const storage = new Storage({
      projectId: projectId,
    });
    
    const bucket = storage.bucket(bucketName);
    
    // Test bucket access
    console.log('Testing bucket access...');
    const [metadata] = await bucket.getMetadata();
    console.log('✅ Bucket accessible');
    console.log(`   Location: ${metadata.location}`);
    console.log(`   Storage Class: ${metadata.storageClass}`);
    console.log(`   Created: ${metadata.timeCreated}`);
    
    // Check if uniform bucket-level access is enabled
    if (metadata.uniformBucketLevelAccess && metadata.uniformBucketLevelAccess.enabled) {
      console.log('ℹ️  Uniform Bucket-Level Access: ENABLED');
      console.log('   This is the recommended security model for GCS');
    } else {
      console.log('ℹ️  Uniform Bucket-Level Access: DISABLED');
      console.log('   Using legacy ACL model');
    }
    console.log('');
    
    // Test write permissions by creating a test file
    console.log('Testing write permissions...');
    const testFileName = `test-${Date.now()}.txt`;
    const testFile = bucket.file(testFileName);
    
    await testFile.save('This is a test file for avatar conversion', {
      metadata: {
        contentType: 'text/plain',
      },
      // Don't set public ACL - use bucket-level permissions
    });
    
    console.log('✅ Write permissions confirmed');
    
    // Clean up test file
    await testFile.delete();
    console.log('✅ Test file cleaned up\n');
    
    // Check existing avatar files
    console.log('Checking existing avatar files...');
    const [files] = await bucket.getFiles({ prefix: 'avatars/' });
    console.log(`Found ${files.length} existing avatar files in the bucket\n`);
    
    console.log('🎉 GCS connection test successful!');
    console.log('You can now run the avatar conversion script safely.');
    
    // Additional guidance for public access
    console.log('\n📋 Important Notes:');
    console.log('• Files will be uploaded to GCS successfully');
    console.log('• For public avatar access, ensure your bucket has public read permissions');
    console.log('• With Uniform Bucket-Level Access, configure permissions at bucket level');
    console.log('• Alternative: Use signed URLs or authenticated access in your app');
    
  } catch (error) {
    console.error('❌ GCS connection test failed:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Check that your Google Cloud credentials are configured');
    console.log('2. Verify the PROJECT_ID and GCS_AVATAR_BUCKET environment variables');
    console.log('3. Ensure the bucket exists and you have read/write permissions');
    console.log('4. Check your network connection');
    
    process.exit(1);
  }
}

testGCSConnection();