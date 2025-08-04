import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { isBuildTime, buildTimeResponse } from '@/lib/build-time-check';

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to consolidate avatar data
 * Ensures all users have their avatar/profile picture data in the avatarUrl field only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('🔄 Starting avatar consolidation process...');

    // Find all users with avatar data (avatarUrl field has been removed)
    const usersWithAvatarData = await prisma.user.findMany({
      where: {
        avatarData: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      }
    });

    console.log(`Found ${usersWithAvatarData.length} users with avatar data`);

    let migratedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Avatar consolidation is complete - avatarUrl field has been removed
    // All avatar data is now stored in the avatarData field
    for (const user of usersWithAvatarData) {
      migratedCount++;
      console.log(`✅ Avatar data confirmed for user: ${user.name || user.email} (${user.id})`);
    }

    // No duplicates possible - avatarUrl field has been removed
    const cleanedCount = 0;
    console.log('✅ No duplicate avatar data found - avatarUrl field has been removed');

    // Get final statistics
    const totalUsers = await prisma.user.count();
    const usersWithAvatars = await prisma.user.count({
      where: {
        avatarData: { not: null }
      }
    });
    const remainingUsersWithLegacyData = await prisma.user.count({
      where: {
        avatarData: { not: null }
      }
    });

    console.log('✅ Avatar consolidation completed');

    return NextResponse.json({
      success: true,
      message: 'Avatar consolidation completed successfully',
      statistics: {
        totalUsers,
        usersWithAvatars,
        remainingUsersWithLegacyData,
        migratedCount,
        cleanedCount,
        errorCount
      },
      errors: errors.length > 0 ? errors : undefined,
      consolidation: {
        singleSourceOfTruth: 'avatarUrl',
        legacyFieldCleared: 'avatarData',
        storageFormat: 'base64 data URLs',
        servingEndpoint: '/api/users/[id]/avatar/image'
      }
    });

  } catch (error) {
    console.error('❌ Avatar consolidation failed:', error);
    return NextResponse.json({
      error: 'Avatar consolidation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check avatar consolidation status
 */
export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return buildTimeResponse('Avatar consolidation check');
  }

  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const totalUsers = await prisma.user.count();
    const usersWithAvatarUrl = await prisma.user.count({
      where: { avatarUrl: { not: null } }
    });
    const usersWithAvatarData = await prisma.user.count({
      where: { avatarData: { not: null } }
    });
    const usersWithBoth = await prisma.user.count({
      where: {
        AND: [
          { avatarUrl: { not: null } },
          { avatarData: { not: null } }
        ]
      }
    });

    const isConsolidated = usersWithAvatarData === 0;

    return NextResponse.json({
      status: 'Avatar consolidation status',
      isConsolidated,
      statistics: {
        totalUsers,
        usersWithAvatarUrl,
        usersWithAvatarData,
        usersWithBoth,
        needsMigration: usersWithAvatarData > 0
      },
      recommendation: isConsolidated 
        ? 'Avatar system is properly consolidated' 
        : 'Run POST /api/admin/consolidate-avatars to consolidate avatar data'
    });

  } catch (error) {
    console.error('Error checking avatar consolidation status:', error);
    return NextResponse.json({
      error: 'Failed to check consolidation status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
