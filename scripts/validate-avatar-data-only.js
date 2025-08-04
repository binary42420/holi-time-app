import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateAvatarDataOnly() {
  console.log('🔍 Validating avatar data format for all users...\n');
  
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

  console.log(`Found ${users.length} users with avatar data\n`);

  let validCount = 0;
  let invalidCount = 0;
  const issues = [];

  for (const user of users) {
    const avatarData = user.avatarData;
    const isValid = validateAvatarDataFormat(avatarData);
    
    if (isValid) {
      validCount++;
      console.log(`✅ ${user.name}: Valid avatar data`);
    } else {
      invalidCount++;
      console.log(`❌ ${user.name}: Invalid avatar data`);
      console.log(`   Preview: ${avatarData?.substring(0, 100)}...`);
      
      issues.push({
        name: user.name,
        email: user.email,
        id: user.id,
        preview: avatarData?.substring(0, 100)
      });
    }
  }

  console.log(`\n📊 Validation Summary:`);
  console.log(`- Total users: ${users.length}`);
  console.log(`- Valid avatar data: ${validCount}`);
  console.log(`- Invalid avatar data: ${invalidCount}`);
  
  if (invalidCount > 0) {
    console.log(`\n❌ Users with invalid avatar data:`);
    issues.forEach(issue => {
      console.log(`   - ${issue.name} (${issue.email})`);
    });
    console.log(`\nRun the fix script to correct these issues.`);
  } else {
    console.log(`\n🎉 All avatar data is properly formatted!`);
  }

  // Additional statistics
  const stats = await getAvatarStats(users);
  console.log(`\n📈 Avatar Statistics:`);
  console.log(`- JPEG images: ${stats.jpeg}`);
  console.log(`- PNG images: ${stats.png}`);
  console.log(`- GIF images: ${stats.gif}`);
  console.log(`- WebP images: ${stats.webp}`);
  console.log(`- Other/Unknown: ${stats.other}`);
  console.log(`- Average size: ${Math.round(stats.averageSize / 1024)}KB`);
  console.log(`- Largest: ${Math.round(stats.maxSize / 1024)}KB`);
  console.log(`- Smallest: ${Math.round(stats.minSize / 1024)}KB`);
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
    
    // Check if it's a reasonable size (between 500 bytes and 10MB)
    if (buffer.length < 500 || buffer.length > 10 * 1024 * 1024) {
      return false;
    }
    
    // Check if it has valid image magic numbers
    if (buffer.length < 4) return false;
    
    // JPEG: FF D8 (and third byte can vary)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
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

async function getAvatarStats(users) {
  const stats = {
    jpeg: 0,
    png: 0,
    gif: 0,
    webp: 0,
    other: 0,
    totalSize: 0,
    sizes: [],
    averageSize: 0,
    maxSize: 0,
    minSize: Infinity
  };

  for (const user of users) {
    const avatarData = user.avatarData;
    if (!avatarData || !avatarData.startsWith('data:image/')) continue;

    // Get image type
    if (avatarData.includes('image/jpeg')) {
      stats.jpeg++;
    } else if (avatarData.includes('image/png')) {
      stats.png++;
    } else if (avatarData.includes('image/gif')) {
      stats.gif++;
    } else if (avatarData.includes('image/webp')) {
      stats.webp++;
    } else {
      stats.other++;
    }

    // Get size
    try {
      const base64Data = avatarData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const size = buffer.length;
      
      stats.sizes.push(size);
      stats.totalSize += size;
      stats.maxSize = Math.max(stats.maxSize, size);
      stats.minSize = Math.min(stats.minSize, size);
    } catch (error) {
      // Skip if can't decode
    }
  }

  if (stats.sizes.length > 0) {
    stats.averageSize = stats.totalSize / stats.sizes.length;
  }

  if (stats.minSize === Infinity) {
    stats.minSize = 0;
  }

  return stats;
}

async function main() {
  try {
    await validateAvatarDataOnly();
  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();