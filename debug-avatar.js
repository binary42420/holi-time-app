import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function debugAvatars() {
  try {
    console.log('🔍 Checking avatar data in database...\n');
    
    // Get all users with their avatar data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      }
    });

    console.log(`Found ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      
      if (user.avatarData) {
        if (user.avatarData.startsWith('data:')) {
          const sizeKB = Math.round(user.avatarData.length / 1024);
          const mimeMatch = user.avatarData.match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
          console.log(`   Avatar: Base64 data (${sizeKB}KB, ${mimeType})`);
          console.log(`   Preview: ${user.avatarData.substring(0, 50)}...`);
        } else if (user.avatarData.startsWith('http')) {
          console.log(`   Avatar: External URL - ${user.avatarData}`);
        } else {
          console.log(`   Avatar: Unknown format - ${user.avatarData.substring(0, 50)}...`);
        }
      } else {
        console.log(`   Avatar: None`);
      }
      console.log('');
    });

    // Test avatar API endpoints for each user
    console.log('\n🧪 Testing avatar API endpoints...\n');
    
    for (const user of users.slice(0, 3)) { // Test first 3 users
      console.log(`Testing avatar API for ${user.name}:`);
      
      try {
        const response = await fetch(`http://localhost:3000/api/users/${user.id}/avatar/image`, {
          method: 'HEAD'
        });
        
        console.log(`   HEAD /api/users/${user.id}/avatar/image: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`   Content-Type: ${contentType}`);
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAvatars();