import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Setup endpoint to ensure the avatar system is properly configured
 */
export async function POST(request: NextRequest) {
  // Skip database operations during build time
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      error: 'Database not available during build',
      message: 'Avatar system setup is skipped during build time'
    });
  }

  try {
    console.log('🔧 Setting up unified avatar system...');
    
    // Check current schema
    const columnInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('avatarUrl', 'avatarData');
    `;
    
    console.log('Current avatar columns:', columnInfo);
    
    // Migrate any existing avatarData to avatarUrl for unified system
    const usersWithAvatarData = await prisma.$queryRaw`
      SELECT id, "avatarData", "avatarUrl" 
      FROM users 
      WHERE "avatarData" IS NOT NULL AND "avatarData" != '';
    `;
    
    if (Array.isArray(usersWithAvatarData) && usersWithAvatarData.length > 0) {
      console.log(`📦 Migrating ${usersWithAvatarData.length} users from avatarData to avatarUrl...`);
      
      for (const user of usersWithAvatarData as any[]) {
        if (user.avatarData && !user.avatarUrl) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              avatarUrl: user.avatarData,
              avatarData: null // Clear the old field
            }
          });
        }
      }
      
      console.log('✅ Migration completed');
    }
    
    // Clean up any remaining avatarData entries
    await prisma.$executeRaw`
      UPDATE users 
      SET "avatarData" = NULL 
      WHERE "avatarData" IS NOT NULL;
    `;
    
    // Verify the setup
    const totalUsers = await prisma.user.count();
    const usersWithAvatars = await prisma.user.count({
      where: {
        avatarUrl: {
          not: null
        }
      }
    });
    
    console.log('✅ Avatar system setup completed');
    
    return NextResponse.json({
      success: true,
      message: 'Avatar system setup completed successfully',
      statistics: {
        totalUsers,
        usersWithAvatars,
        migrated: Array.isArray(usersWithAvatarData) ? usersWithAvatarData.length : 0
      },
      configuration: {
        unifiedSystem: true,
        storageField: 'avatarUrl',
        legacyField: 'avatarData (cleared)',
        imageFormat: 'base64 data URLs',
        cacheStrategy: 'enhanced with invalidation'
      }
    });
    
  } catch (error) {
    console.error('❌ Avatar system setup failed:', error);
    return NextResponse.json({
      error: 'Avatar system setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check avatar system status
 */
export async function GET(request: NextRequest) {
  try {
    // Check database schema
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('avatarUrl', 'avatarData')
      ORDER BY column_name;
    `;
    
    // Check data distribution
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_users,
        COUNT("avatarUrl") as users_with_avatar_url,
        COUNT("avatarData") as users_with_avatar_data,
        COUNT(CASE WHEN "avatarUrl" LIKE 'data:%' THEN 1 END) as users_with_base64_avatars
      FROM users;
    `;
    
    const systemStatus = Array.isArray(stats) && stats.length > 0 ? stats[0] : {};
    
    return NextResponse.json({
      success: true,
      status: 'Avatar system status check',
      schema: {
        columns: columns,
        hasAvatarUrl: Array.isArray(columns) && columns.some((col: any) => col.column_name === 'avatarUrl'),
        hasAvatarData: Array.isArray(columns) && columns.some((col: any) => col.column_name === 'avatarData')
      },
      statistics: systemStatus,
      recommendations: {
        setupNeeded: false, // Will be determined by the actual data
        unifiedSystem: true,
        cacheOptimization: true
      }
    });
    
  } catch (error) {
    console.error('❌ Avatar system status check failed:', error);
    return NextResponse.json({
      error: 'Avatar system status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}