import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function testSingleConversion() {
  try {
    console.log('🧪 Testing single avatar conversion...\n');

    // Find Ector Cedillo (has GitHub avatar)
    const user = await prisma.user.findUnique({
      where: { email: 'cedilloector89@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log(`👤 Test user: ${user.name} (${user.email})`);
    console.log(`📸 Current avatarData: ${user.avatarData}`);
    console.log(`🔍 Format: ${user.avatarData.startsWith('data:') ? 'Base64 (already converted)' : 'External URL (needs conversion)'}`);

    if (user.avatarData.startsWith('data:')) {
      console.log('\n✅ Avatar is already converted to base64 format!');
      const sizeKB = Math.round(user.avatarData.length / 1024);
      console.log(`📦 Size: ${sizeKB}KB`);
      return;
    }

    console.log('\n🔄 Converting external URL to base64...');
    
    // Fetch the image
    console.log(`📥 Fetching: ${user.avatarData}`);
    const response = await fetch(user.avatarData, {
      headers: {
        'User-Agent': 'Holitime-Avatar-Converter/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    console.log(`📄 Content-Type: ${contentType}`);
    
    if (!contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const sizeKB = Math.round(imageBuffer.byteLength / 1024);
    console.log(`📦 Image size: ${sizeKB}KB`);
    
    // Check size (max 5MB)
    if (imageBuffer.byteLength > 5 * 1024 * 1024) {
      throw new Error(`Image too large: ${imageBuffer.byteLength} bytes`);
    }

    // Convert to base64
    console.log('🔄 Converting to base64...');
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    console.log(`📝 Base64 length: ${base64.length} characters`);
    console.log(`📝 Data URL preview: ${dataUrl.substring(0, 50)}...`);

    // Save to database
    console.log('💾 Saving to database...');
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarData: dataUrl }
    });

    console.log('\n✅ Conversion successful!');
    console.log(`🎯 Avatar for ${user.name} is now stored locally as base64`);
    console.log(`📊 Original URL: ${user.avatarData}`);
    console.log(`📊 New format: Base64 data (${sizeKB}KB)`);
    console.log(`🚀 Future requests will be much faster!`);

  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleConversion();