#!/usr/bin/env node

/**
 * Fix Avatar URLs Script
 * 
 * This script fixes users who have avatarData but no avatarUrl.
 * It populates the avatarUrl field with the correct API endpoint.
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

async function fixAvatarUrls() {
  console.log('🔍 Finding users with avatarData but no avatarUrl...');
  
  try {
    // Find users who have avatarData but no avatarUrl
    const usersToFix = await prisma.user.findMany({
      where: {
        AND: [
          {
            avatarData: {
              not: null,
              not: '',
              not: '<null>',
              not: 'null'
            }
          },
          {
            OR: [
              { avatarUrl: null },
              { avatarUrl: '' },
              { avatarUrl: '<null>' },
              { avatarUrl: 'null' }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        avatarData: true
      }
    });

    console.log(`📊 Found ${usersToFix.length} users to fix`);

    if (usersToFix.length === 0) {
      console.log('✅ No users need fixing!');
      return;
    }

    // Show preview of users to fix
    console.log('\n👥 Users to fix:');
    usersToFix.forEach((user, index) => {
      const avatarDataPreview = user.avatarData 
        ? `${user.avatarData.substring(0, 50)}...` 
        : 'null';
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Current avatarUrl: ${user.avatarUrl || 'null'}`);
      console.log(`   Has avatarData: ${user.avatarData ? 'Yes' : 'No'} (${avatarDataPreview})`);
      console.log('');
    });

    // Ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Do you want to proceed with fixing these users? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      return;
    }

    // Fix the users
    console.log('\n🔧 Fixing users...');
    let fixedCount = 0;

    for (const user of usersToFix) {
      try {
        const avatarUrl = `/api/users/${user.id}/avatar/image`;
        
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl }
        });

        console.log(`✅ Fixed ${user.name} (${user.email}) - Set avatarUrl to: ${avatarUrl}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ Failed to fix ${user.name} (${user.email}):`, error.message);
      }
    }

    console.log(`\n🎉 Successfully fixed ${fixedCount} out of ${usersToFix.length} users`);

    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const verifyUsers = await prisma.user.findMany({
      where: {
        id: { in: usersToFix.map(u => u.id) }
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        avatarData: true
      }
    });

    console.log('\n📋 Verification results:');
    verifyUsers.forEach((user) => {
      const hasAvatarData = user.avatarData && user.avatarData !== '<null>' && user.avatarData !== 'null';
      const hasAvatarUrl = user.avatarUrl && user.avatarUrl !== '<null>' && user.avatarUrl !== 'null';
      const status = hasAvatarData && hasAvatarUrl ? '✅' : '❌';
      
      console.log(`${status} ${user.name}`);
      console.log(`   avatarUrl: ${user.avatarUrl || 'null'}`);
      console.log(`   has avatarData: ${hasAvatarData ? 'Yes' : 'No'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error fixing avatar URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixAvatarUrls()
  .then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

export { fixAvatarUrls };