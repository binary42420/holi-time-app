import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function testAvatarConversion() {
  try {
    const testUserEmail = 'cedilloector89@gmail.com'; // Ector Cedillo
    const testImageUrl = 'https://avatars.githubusercontent.com/u/1?v=4'; // GitHub's first user avatar
    
    console.log('🧪 Testing Avatar Conversion System\n');
    
    // Step 1: Find user
    const user = await prisma.user.findUnique({
      where: { email: testUserEmail },
      select: { id: true, name: true, avatarData: true }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log(`👤 Test user: ${user.name} (${user.id})`);
    
    // Step 2: Set external URL
    console.log(`\n📝 Step 1: Setting external URL...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarData: testImageUrl }
    });
    console.log(`✅ External URL set: ${testImageUrl}`);
    
    // Step 3: Check current state
    const userAfterSet = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarData: true }
    });
    
    console.log(`\n📊 Current database state:`);
    console.log(`   avatarData: ${userAfterSet.avatarData.substring(0, 50)}...`);
    console.log(`   Format: ${userAfterSet.avatarData.startsWith('data:') ? 'Base64 (converted)' : 'External URL (not converted yet)'}`);
    
    // Step 4: Simulate first access (this would happen when someone visits the avatar URL)
    console.log(`\n🔄 Step 2: Simulating first avatar access...`);
    console.log(`   In real usage, this happens when someone visits:`);
    console.log(`   http://localhost:3001/api/users/${user.id}/avatar/image`);
    console.log(`\n   The system will:`);
    console.log(`   1. Detect external URL in avatarData`);
    console.log(`   2. Fetch the image from: ${testImageUrl}`);
    console.log(`   3. Convert to base64 format`);
    console.log(`   4. Save back to database permanently`);
    console.log(`   5. Serve the image to the user`);
    console.log(`\n   All subsequent requests will use the converted local version!`);
    
    console.log(`\n✅ Test setup complete!`);
    console.log(`🎯 Visit the avatar URL to trigger the conversion process.`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAvatarConversion();