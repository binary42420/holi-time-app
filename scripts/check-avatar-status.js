import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function checkAvatarStatus() {
  try {
    console.log('🔍 Checking avatar status across all users...\n');

    // Get all users with avatar data
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
      },
      orderBy: {
        name: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('📭 No users found with avatar data.');
      return;
    }

    // Categorize avatars
    const stats = {
      total: users.length,
      base64: 0,
      external: 0,
      invalid: 0,
      base64Users: [],
      externalUsers: [],
      invalidUsers: []
    };

    console.log(`📊 Analyzing ${users.length} users with avatar data...\n`);

    users.forEach(user => {
      const { avatarData } = user;
      
      if (avatarData.startsWith('data:')) {
        stats.base64++;
        stats.base64Users.push(user);
      } else if (avatarData.startsWith('http://') || avatarData.startsWith('https://')) {
        stats.external++;
        stats.externalUsers.push(user);
      } else {
        stats.invalid++;
        stats.invalidUsers.push(user);
      }
    });

    // Print summary
    console.log('📈 AVATAR STATUS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total users with avatars: ${stats.total}`);
    console.log(`✅ Base64 (converted): ${stats.base64} (${((stats.base64 / stats.total) * 100).toFixed(1)}%)`);
    console.log(`🔗 External URLs: ${stats.external} (${((stats.external / stats.total) * 100).toFixed(1)}%)`);
    console.log(`❓ Invalid format: ${stats.invalid} (${((stats.invalid / stats.total) * 100).toFixed(1)}%)`);

    // Show details for each category
    if (stats.base64Users.length > 0) {
      console.log('\n✅ USERS WITH CONVERTED AVATARS (Base64):');
      stats.base64Users.forEach((user, index) => {
        const sizeKB = Math.round(user.avatarData.length / 1024);
        console.log(`${index + 1}. ${user.name} (${user.email}) - ${sizeKB}KB`);
      });
    }

    if (stats.externalUsers.length > 0) {
      console.log('\n🔗 USERS WITH EXTERNAL URLS (Need Conversion):');
      stats.externalUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   URL: ${user.avatarData}`);
      });
    }

    if (stats.invalidUsers.length > 0) {
      console.log('\n❓ USERS WITH INVALID AVATAR DATA:');
      stats.invalidUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Data: ${user.avatarData.substring(0, 100)}...`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (stats.external > 0) {
      console.log(`🔄 Run conversion script to convert ${stats.external} external URLs:`);
      console.log('   node scripts/convert-all-external-avatars.js');
      console.log('   node scripts/convert-all-external-avatars.js --dry-run  (to preview)');
    }
    
    if (stats.invalid > 0) {
      console.log(`🔧 ${stats.invalid} users have invalid avatar data that may need manual review.`);
    }
    
    if (stats.external === 0 && stats.invalid === 0) {
      console.log('🎉 All avatars are properly converted! No action needed.');
    }

    return stats;

  } catch (error) {
    console.error('❌ Error checking avatar status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvatarStatus();