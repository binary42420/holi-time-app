import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admins to run this check
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('🔍 Checking for large avatar data in the database...');

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
    const largeAvatars = [];

    for (const user of users) {
      if (user.avatarData) {
        const size = user.avatarData.length;
        totalSize += size;

        // Consider anything over 100KB as large
        if (size > 100 * 1024) {
          totalLargeAvatars++;
          largeAvatars.push({
            userId: user.id,
            name: user.name,
            email: user.email,
            sizeKB: Math.round(size / 1024),
            type: user.avatarData.startsWith('data:') ? 'Base64' : 'URL',
          });
          
          console.log(`⚠️  Large avatar found: ${user.name} (${Math.round(size / 1024)} KB)`);
        }
      }
    }

    const summary = {
      totalUsers: users.length,
      usersWithAvatars: users.filter(u => u.avatarData).length,
      largeAvatars: totalLargeAvatars,
      totalSizeKB: Math.round(totalSize / 1024),
      largeAvatarDetails: largeAvatars,
    };

    console.log(`📊 Summary: ${totalLargeAvatars} large avatars found (${Math.round(totalSize / 1024)} KB total)`);

    return NextResponse.json({
      success: true,
      summary,
      recommendations: totalLargeAvatars > 0 ? [
        'Convert large base64 avatars to external URLs',
        'Compress existing avatar images',
        'Set up proper avatar serving via /api/users/[id]/avatar/image',
        'Consider moving avatars to cloud storage (GCS)',
      ] : ['No large avatars found! Session data should be optimized.'],
    });

  } catch (error) {
    console.error('Error checking large avatars:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}