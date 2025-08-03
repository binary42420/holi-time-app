#!/usr/bin/env node

/**
 * Avatar Data Migration Script
 * 
 * This script consolidates avatar data from both avatarUrl and avatarData fields
 * into a single avatarData field for consistency.
 * 
 * Migration Strategy:
 * 1. If user has avatarData but no avatarUrl: Keep avatarData as-is
 * 2. If user has avatarUrl but no avatarData: Move avatarUrl to avatarData
 * 3. If user has both: Keep avatarData (it's the processed version), clear avatarUrl
 * 4. If user has neither: Leave as-is (will use fallback)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

async function migrateAvatarData() {
  console.log('🚀 Starting avatar data migration...');
  
  try {
    // Get all users with avatar data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        avatarData: true,
      },
    });

    console.log(`📊 Found ${users.length} users to process`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const hasAvatarData = user.avatarData && user.avatarData !== '<null>' && user.avatarData !== 'null';
        const hasAvatarUrl = user.avatarUrl && user.avatarUrl !== '<null>' && user.avatarUrl !== 'null';

        if (hasAvatarData && hasAvatarUrl) {
          // Case 3: Has both - keep avatarData, clear avatarUrl
          await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: null },
          });
          console.log(`✅ ${user.name}: Cleared redundant avatarUrl (kept avatarData)`);
          migratedCount++;
        } else if (!hasAvatarData && hasAvatarUrl) {
          // Case 2: Has only avatarUrl - move to avatarData
          await prisma.user.update({
            where: { id: user.id },
            data: {
              avatarData: user.avatarUrl,
              avatarUrl: null,
            },
          });
          console.log(`✅ ${user.name}: Moved avatarUrl to avatarData`);
          migratedCount++;
        } else if (hasAvatarData && !hasAvatarUrl) {
          // Case 1: Has only avatarData - already correct
          console.log(`⏭️  ${user.name}: Already has avatarData only (no change needed)`);
          skippedCount++;
        } else {
          // Case 4: Has neither - no change needed
          console.log(`⏭️  ${user.name}: No avatar data (will use fallback)`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.name} (${user.id}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total: ${users.length} users processed`);

    if (errorCount === 0) {
      console.log('\n🎉 Avatar data migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors. Please review the errors above.`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateAvatarData().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

export { migrateAvatarData };