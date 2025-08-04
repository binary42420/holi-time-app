import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAvatarData() {
  console.log('🔍 Checking avatar data...\n');
  
  // Get all users with avatar data
  const users = await prisma.user.findMany({
    where: {
      avatarData: {
        not: null,
        not: ''
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarData: true
    }
  });

  console.log(`Found ${users.length} users with avatar data`);

  let fixedCount = 0;
  let validCount = 0;
  let errorCount = 0;

  for (const user of users) {
    const avatarData = user.avatarData;
    
    // Skip null, empty, or placeholder values
    if (!avatarData || avatarData === 'null' || avatarData === '<null>' || avatarData.trim() === '') {
      console.log(`⚠️  ${user.name}: Null/empty avatar data - setting to null`);
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarData: null }
        });
        fixedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${user.name}:`, error.message);
        errorCount++;
      }
      continue;
    }

    // Check if it's already in correct format
    if (avatarData.startsWith('data:image/') && avatarData.includes(';base64,')) {
      // Additional check for common base64 corruption (missing leading slash)
      const match = avatarData.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (match) {
        const [, imageType, base64Data] = match;
        
        // Check if base64 data is missing leading slash (common JPEG issue)
        if (imageType === 'jpeg' && (base64Data.startsWith('9j/4AAQ') || base64Data.startsWith('9j/2wBD'))) {
          const fixedData = `data:image/jpeg;base64,/${base64Data}`;
          console.log(`🔧 ${user.name}: Fixed missing leading slash in JPEG base64`);
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { avatarData: fixedData }
            });
            fixedCount++;
            console.log(`   ✅ Updated successfully`);
          } catch (error) {
            console.error(`   ❌ Error updating:`, error.message);
            errorCount++;
          }
          continue;
        }
        
        // If it passes all checks, it's valid
        if (isValidBase64(base64Data)) {
          console.log(`✅ ${user.name}: Already in correct format`);
          validCount++;
          continue;
        }
      }
    }

    // Try to fix common issues
    let fixedData = null;

    // Case 1: Raw base64 data without data: prefix
    if (!avatarData.startsWith('data:') && isValidBase64(avatarData)) {
      const imageType = detectImageType(avatarData);
      fixedData = `data:image/${imageType};base64,${avatarData}`;
      console.log(`🔧 ${user.name}: Added data: prefix (detected as ${imageType})`);
    }
    // Case 2: Has data: prefix but wrong format
    else if (avatarData.startsWith('data:') && !avatarData.includes(';base64,')) {
      const parts = avatarData.split(',');
      if (parts.length === 2 && isValidBase64(parts[1])) {
        const imageType = detectImageType(parts[1]);
        fixedData = `data:image/${imageType};base64,${parts[1]}`;
        console.log(`🔧 ${user.name}: Fixed data URL format (detected as ${imageType})`);
      }
    }
    // Case 3: Wrong MIME type
    else if (avatarData.startsWith('data:') && avatarData.includes(';base64,')) {
      const match = avatarData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const [, currentMimeType, base64Data] = match;
        if (!currentMimeType.startsWith('image/')) {
          const imageType = detectImageType(base64Data);
          fixedData = `data:image/${imageType};base64,${base64Data}`;
          console.log(`🔧 ${user.name}: Fixed MIME type from ${currentMimeType} to image/${imageType}`);
        }
      }
    }

    if (fixedData) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarData: fixedData }
        });
        fixedCount++;
        console.log(`   ✅ Updated successfully`);
      } catch (error) {
        console.error(`   ❌ Error updating:`, error.message);
        errorCount++;
      }
    } else {
      console.log(`⚠️  ${user.name}: Could not fix avatar data (length: ${avatarData.length})`);
      console.log(`   Preview: ${avatarData.substring(0, 100)}...`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`- Already valid: ${validCount}`);
  console.log(`- Fixed: ${fixedCount}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Total processed: ${users.length}`);
}

function isValidBase64(str) {
  try {
    // Basic base64 validation
    if (str.length % 4 !== 0) return false;
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) return false;
    
    // Try to decode and re-encode
    const decoded = Buffer.from(str, 'base64');
    const reencoded = decoded.toString('base64');
    
    // Remove padding for comparison
    return str.replace(/=+$/, '') === reencoded.replace(/=+$/, '');
  } catch (error) {
    return false;
  }
}

function detectImageType(base64Data) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    if (buffer.length < 4) return 'jpeg'; // Default fallback
    
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpeg';
    }
    
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'png';
    }
    
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'gif';
    }
    
    // WebP: RIFF...WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'webp';
    }
    
    // Default to jpeg
    return 'jpeg';
  } catch (error) {
    return 'jpeg';
  }
}

async function main() {
  try {
    await fixAvatarData();
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();