import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function convertAllAvatars() {
  try {
    console.log('🚀 Starting avatar conversion...\n');

    // Find all users with external URLs
    const users = await prisma.user.findMany({
      where: {
        avatarData: {
          startsWith: 'http'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      }
    });

    console.log(`📊 Found ${users.length} users with external avatar URLs\n`);

    if (users.length === 0) {
      console.log('✅ No external URLs to convert!');
      return;
    }

    let converted = 0;
    let failed = 0;

    // Process each user
    for (const user of users) {
      try {
        console.log(`👤 Converting: ${user.name} (${user.email})`);
        console.log(`   URL: ${user.avatarData.substring(0, 80)}...`);

        // Fetch the image
        const response = await fetch(user.avatarData, {
          headers: {
            'User-Agent': 'Holitime-Avatar-Converter/1.0'
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        
        if (!contentType.startsWith('image/')) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        const imageBuffer = await response.arrayBuffer();
        
        // Check size (max 5MB)
        if (imageBuffer.byteLength > 5 * 1024 * 1024) {
          throw new Error(`Image too large: ${imageBuffer.byteLength} bytes`);
        }

        // Convert to base64
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        // Save to database
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarData: dataUrl }
        });

        const sizeKB = Math.round(imageBuffer.byteLength / 1024);
        console.log(`   ✅ Converted successfully (${sizeKB}KB, ${base64.length} chars)`);
        converted++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failed++;
      }

      // Small delay between requests to be nice to external servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CONVERSION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total processed: ${users.length}`);
    console.log(`✅ Successfully converted: ${converted}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((converted / users.length) * 100).toFixed(1)}%`);

    if (converted > 0) {
      console.log('\n🎉 Avatar conversion completed!');
      console.log('All converted avatars are now stored locally and will load much faster.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertAllAvatars();