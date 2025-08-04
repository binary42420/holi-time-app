import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function validateAvatars() {
  console.log('🔍 Validating avatar data and API endpoints...\n');
  
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

  console.log(`Testing ${users.length} users with avatar data\n`);

  let validDataCount = 0;
  let validApiCount = 0;
  let errorCount = 0;

  for (const user of users) {
    console.log(`👤 Testing ${user.name} (${user.email})`);
    
    // Validate avatar data format
    const avatarData = user.avatarData;
    const isValidFormat = validateAvatarDataFormat(avatarData);
    
    if (isValidFormat) {
      console.log(`   ✅ Avatar data format is valid`);
      validDataCount++;
    } else {
      console.log(`   ❌ Avatar data format is invalid`);
      console.log(`   Preview: ${avatarData?.substring(0, 100)}...`);
      errorCount++;
      continue;
    }

    // Test avatar API endpoint
    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/avatar/image`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const avatarSource = response.headers.get('x-avatar-source');
        
        console.log(`   ✅ API endpoint works`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Content-Length: ${contentLength}`);
        console.log(`   Avatar-Source: ${avatarSource}`);
        validApiCount++;
      } else {
        console.log(`   ❌ API endpoint failed: ${response.status} ${response.statusText}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`   ❌ API endpoint error: ${error.message}`);
      errorCount++;
    }
    
    console.log('');
  }

  console.log(`📊 Validation Summary:`);
  console.log(`- Valid avatar data: ${validDataCount}/${users.length}`);
  console.log(`- Working API endpoints: ${validApiCount}/${users.length}`);
  console.log(`- Errors encountered: ${errorCount}`);
  
  if (validDataCount === users.length && validApiCount === users.length) {
    console.log(`🎉 All avatars are working correctly!`);
  } else {
    console.log(`⚠️  Some issues found. Consider running the fix script.`);
  }
}

function validateAvatarDataFormat(avatarData) {
  if (!avatarData || typeof avatarData !== 'string') {
    return false;
  }

  // Check for correct data URL format
  const dataUrlRegex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/;
  
  if (!dataUrlRegex.test(avatarData)) {
    return false;
  }

  // Extract and validate base64 data
  const base64Data = avatarData.split(',')[1];
  
  try {
    // Try to decode the base64 data
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Check if it's a reasonable size (between 1KB and 10MB)
    if (buffer.length < 1000 || buffer.length > 10 * 1024 * 1024) {
      return false;
    }
    
    // Check if it has valid image magic numbers
    if (buffer.length < 4) return false;
    
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }
    
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return true;
    }
    
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return true;
    }
    
    // WebP: RIFF...WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

async function main() {
  try {
    await validateAvatars();
  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();