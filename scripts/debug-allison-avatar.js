import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAllisonAvatar() {
  const user = await prisma.user.findFirst({
    where: {
      email: 'a.amore115@gmail.com'
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarData: true
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`Debugging avatar for ${user.name} (${user.email})`);
  console.log(`Avatar data length: ${user.avatarData?.length || 0}`);
  
  if (user.avatarData) {
    console.log(`First 200 chars: ${user.avatarData.substring(0, 200)}`);
    
    // Check if it matches the expected pattern
    const match = user.avatarData.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (match) {
      const [, imageType, base64Data] = match;
      console.log(`Image type: ${imageType}`);
      console.log(`Base64 data length: ${base64Data.length}`);
      console.log(`Base64 starts with: ${base64Data.substring(0, 50)}`);
      
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        console.log(`Decoded buffer length: ${buffer.length}`);
        console.log(`First 10 bytes: ${Array.from(buffer.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
        
        // Check JPEG magic numbers
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          console.log('✅ Valid JPEG magic numbers');
        } else {
          console.log('❌ Invalid JPEG magic numbers');
        }
        
      } catch (error) {
        console.log(`❌ Error decoding base64: ${error.message}`);
      }
    } else {
      console.log('❌ Does not match data URL pattern');
    }
  }
}

async function main() {
  try {
    await debugAllisonAvatar();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();