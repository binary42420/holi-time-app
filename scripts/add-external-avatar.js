import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function addExternalAvatar(userEmail, imageUrl) {
  try {
    console.log(`🔍 Looking for user with email: ${userEmail}`);
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        avatarData: true,
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.id})`);
    console.log(`📸 Current avatar setup:`);
    console.log(`   avatarUrl: ${user.avatarUrl}`);
    console.log(`   avatarData: ${user.avatarData ? (user.avatarData.startsWith('data:') ? 'Base64 data' : 'External URL') : 'No data'}`);

    // Validate the image URL
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.log('❌ Invalid image URL. Must start with http:// or https://');
      return;
    }

    // Test if the URL is accessible
    console.log(`🔗 Testing image URL: ${imageUrl}`);
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.log(`❌ Image URL is not accessible: ${response.status} ${response.statusText}`);
        return;
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        console.log(`❌ URL does not point to an image. Content-Type: ${contentType}`);
        return;
      }
      console.log(`✅ Image URL is valid. Content-Type: ${contentType}`);
    } catch (error) {
      console.log(`❌ Error testing image URL: ${error.message}`);
      return;
    }

    // Update user with external avatar URL (will be converted on first access)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarData: imageUrl, // Store external URL temporarily
        avatarUrl: `/api/users/${user.id}/avatar/image` // Unified system URL
      }
    });

    console.log(`✅ Successfully set external avatar URL for ${user.name}!`);
    console.log(`🔄 External URL stored: ${imageUrl}`);
    console.log(`🎯 On first access, it will be converted to local base64 storage`);
    console.log(`🔗 Access via: http://localhost:3001/api/users/${user.id}/avatar/image`);
    console.log(`\n💡 The first user to access this avatar will trigger the conversion.`);
    console.log(`   After that, all users will get the fast, locally-stored version!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Usage: node scripts/add-external-avatar.js user@example.com https://example.com/avatar.jpg
const userEmail = process.argv[2];
const imageUrl = process.argv[3];

if (!userEmail || !imageUrl) {
  console.log('Usage: node scripts/add-external-avatar.js <user-email> <image-url>');
  console.log('Example: node scripts/add-external-avatar.js john@example.com https://example.com/avatar.jpg');
  console.log('\nThis will:');
  console.log('1. Store the external URL in the database');
  console.log('2. On first avatar access, convert it to local base64 storage');
  console.log('3. All subsequent accesses will use the fast, local version');
  process.exit(1);
}

addExternalAvatar(userEmail, imageUrl);