import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function checkAvatarData() {
  try {
    // Get users with avatar data (not null)
    const users = await prisma.user.findMany({
      where: {
        avatarData: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        avatarData: true,
      },
      take: 10
    });

    console.log(`Found ${users.length} users with avatar data`);
    console.log('=== Avatar Data Check ===');
    
    let gcsCount = 0;
    let dataUrlCount = 0;
    let otherCount = 0;
    
    users.forEach(user => {
      console.log(`\nUser: ${user.name} (${user.id})`);
      console.log(`avatarData type: ${typeof user.avatarData}`);
      console.log(`avatarData length: ${user.avatarData ? user.avatarData.length : 'null'}`);
      
      if (user.avatarData && typeof user.avatarData === 'string') {
        console.log(`avatarData starts with: ${user.avatarData.substring(0, 50)}...`);
        const isDataUrl = user.avatarData.startsWith('data:');
        const isGcsUrl = user.avatarData.startsWith('https://storage.googleapis.com/');
        console.log(`Is data URL: ${isDataUrl}`);
        console.log(`Is GCS URL: ${isGcsUrl}`);
        
        if (isGcsUrl) gcsCount++;
        else if (isDataUrl) dataUrlCount++;
        else otherCount++;
      }
      console.log('---');
    });
    
    console.log(`\n=== Summary ===`);
    console.log(`GCS URLs: ${gcsCount}`);
    console.log(`Data URLs: ${dataUrlCount}`);
    console.log(`Other: ${otherCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvatarData();