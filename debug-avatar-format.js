import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function debugAvatarFormats() {
  try {
    console.log('🔍 Checking avatar data formats...\n');
    
    // Get users with avatar data that might be problematic
    const users = await prisma.user.findMany({
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
      }
    });

    console.log(`Found ${users.length} users with avatar data:\n`);

    const problematicUsers = [];
    const workingUsers = [];

    users.forEach((user) => {
      const avatarData = user.avatarData;
      
      if (avatarData) {
        let status = 'UNKNOWN';
        let issue = '';
        
        if (avatarData.startsWith('data:')) {
          // Check if it's a valid data URL
          const matches = avatarData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            
            // Check if base64 is valid
            try {
              Buffer.from(base64Data, 'base64');
              status = 'VALID_BASE64';
              workingUsers.push(user);
            } catch (error) {
              status = 'INVALID_BASE64';
              issue = 'Base64 data is corrupted';
              problematicUsers.push({ user, issue });
            }
          } else {
            status = 'INVALID_DATA_URL';
            issue = 'Data URL format is incorrect';
            problematicUsers.push({ user, issue });
          }
        } else if (avatarData.startsWith('http')) {
          status = 'EXTERNAL_URL';
          workingUsers.push(user);
        } else {
          status = 'UNKNOWN_FORMAT';
          issue = 'Unknown avatar data format';
          problematicUsers.push({ user, issue });
        }
        
        console.log(`${user.name} (${user.id.substring(0, 8)}...): ${status}`);
        if (issue) {
          console.log(`  Issue: ${issue}`);
          console.log(`  Data preview: ${avatarData.substring(0, 100)}...`);
        }
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`✅ Working avatars: ${workingUsers.length}`);
    console.log(`❌ Problematic avatars: ${problematicUsers.length}`);

    if (problematicUsers.length > 0) {
      console.log(`\n🔧 Problematic users that need fixing:`);
      problematicUsers.forEach(({ user, issue }) => {
        console.log(`- ${user.name} (${user.email}): ${issue}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAvatarFormats();