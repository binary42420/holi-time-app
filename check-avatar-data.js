import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function checkAvatarData() {
  try {
    const userId = 'cmdtsfp6k006vme9ewx4cjtsiq'; // Allison Osband
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        avatarData: true,
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`User: ${user.name}`);
    console.log(`avatarUrl: ${user.avatarUrl}`);
    console.log(`avatarData type: ${typeof user.avatarData}`);
    console.log(`avatarData length: ${user.avatarData ? user.avatarData.length : 'null'}`);
    
    if (user.avatarData) {
      console.log(`avatarData starts with: ${user.avatarData.substring(0, 50)}...`);
      console.log(`Is data URL: ${user.avatarData.startsWith('data:')}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvatarData();