const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLargeAvatars() {
  console.log('🔍 Checking for large avatar data in the database...\n');

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true,
      },
    });

    let totalLargeAvatars = 0;
    let totalSize = 0;

    for (const user of users) {
      if (user.avatarData) {
        const size = user.avatarData.length;
        totalSize += size;

        // Consider anything over 100KB as large
        if (size > 100 * 1024) {
          totalLargeAvatars++;
          console.log(`⚠️  Large avatar found:`);
          console.log(`   User: ${user.name} (${user.email})`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Size: ${Math.round(size / 1024)} KB`);
          console.log(`   Type: ${user.avatarData.startsWith('data:') ? 'Base64' : 'URL'}`);
          console.log('');
        }
      }
    }

    console.log(`📊 Summary:`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Users with avatars: ${users.filter(u => u.avatarData).length}`);
    console.log(`   Large avatars (>100KB): ${totalLargeAvatars}`);
    console.log(`   Total avatar data size: ${Math.round(totalSize / 1024)} KB`);

    if (totalLargeAvatars > 0) {
      console.log('\n💡 Recommendations:');
      console.log('   1. Convert large base64 avatars to external URLs');
      console.log('   2. Compress existing avatar images');
      console.log('   3. Set up proper avatar serving via /api/users/[id]/avatar/image');
      console.log('   4. Consider moving avatars to cloud storage (GCS)');
    } else {
      console.log('\n✅ No large avatars found! Session data should be optimized.');
    }

  } catch (error) {
    console.error('❌ Error checking avatars:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLargeAvatars();