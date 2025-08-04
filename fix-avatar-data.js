import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function fixAvatarData() {
  try {
    console.log('🔧 Fixing malformed avatar data URLs...\n');
    
    // Get users with malformed avatar data
    const users = await prisma.user.findMany({
      where: {
        avatarData: {
          contains: 'data:image/jpeg;base64/'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      }
    });

    console.log(`Found ${users.length} users with malformed avatar data URLs\n`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const originalData = user.avatarData;
        
        // Fix the malformed data URL by replacing the forward slash with a comma
        const fixedData = originalData.replace('data:image/jpeg;base64/', 'data:image/jpeg;base64,');
        
        // Verify the fix worked by testing the regex
        const matches = fixedData.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          console.log(`❌ Failed to fix ${user.name}: Still doesn't match expected format`);
          errorCount++;
          continue;
        }

        // Test if the base64 data is valid
        try {
          Buffer.from(matches[2], 'base64');
        } catch (base64Error) {
          console.log(`❌ Failed to fix ${user.name}: Invalid base64 data`);
          errorCount++;
          continue;
        }

        // Update the user's avatar data
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarData: fixedData }
        });

        console.log(`✅ Fixed ${user.name} (${user.email})`);
        fixedCount++;

      } catch (error) {
        console.log(`❌ Error fixing ${user.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully fixed: ${fixedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

    if (fixedCount > 0) {
      console.log(`\n🎉 Avatar data has been fixed! The avatars should now load properly.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAvatarData();