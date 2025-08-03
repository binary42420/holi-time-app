import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function fixAvatarSystem() {
  try {
    console.log('🔧 Fixing avatar system...\n');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        avatarData: true,
      }
    });

    console.log(`📊 Found ${users.length} users to process\n`);

    let fixedCount = 0;

    for (const user of users) {
      let needsUpdate = false;
      let newAvatarUrl = user.avatarUrl;

      // If user has avatarData (uploaded image), avatarUrl should point to unified system
      if (user.avatarData) {
        const expectedUrl = `/api/users/${user.id}/avatar/image`;
        if (user.avatarUrl !== expectedUrl) {
          newAvatarUrl = expectedUrl;
          needsUpdate = true;
          console.log(`✅ ${user.name}: Has avatar data, setting URL to unified system`);
        } else {
          console.log(`✅ ${user.name}: Has avatar data, URL already correct`);
        }
      } 
      // If user has no avatarData, avatarUrl should point to unified system (which will generate fallback)
      else {
        const expectedUrl = `/api/users/${user.id}/avatar/image`;
        if (user.avatarUrl !== expectedUrl) {
          newAvatarUrl = expectedUrl;
          needsUpdate = true;
          console.log(`🔄 ${user.name}: No avatar data, setting URL to unified system for fallback`);
        } else {
          console.log(`✅ ${user.name}: No avatar data, URL already points to unified system`);
        }
      }

      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: newAvatarUrl }
        });
        fixedCount++;
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} users' avatar URLs`);
    console.log(`📝 All users now use the unified avatar system: /api/users/{userId}/avatar/image`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAvatarSystem();