import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permissions: user can only update their own avatar, or admin/staff can update any
    if (user.id !== userId && user.role !== UserRole.Admin && user.role !== UserRole.Staff) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid image URL. Must start with http:// or https://' },
        { status: 400 }
      );
    }

    // Test if the URL is accessible
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (!response.ok) {
        return NextResponse.json(
          { error: `Image URL is not accessible: ${response.status} ${response.statusText}` },
          { status: 400 }
        );
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return NextResponse.json(
          { error: `URL does not point to an image. Content-Type: ${contentType}` },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: `Error testing image URL: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user with external avatar URL (will be converted on first access)
    await prisma.user.update({
      where: { id: userId },
      data: {
        avatarData: imageUrl, // Store external URL temporarily
        avatarUrl: `/api/users/${userId}/avatar/image` // Unified system URL
      }
    });

    console.log(`External avatar URL set for user ${targetUser.name} (${userId}): ${imageUrl}`);
    console.log(`🔄 Will be converted to local storage on first access`);

    return NextResponse.json({
      success: true,
      message: `External avatar URL set for ${targetUser.name}`,
      avatarUrl: `/api/users/${userId}/avatar/image`,
      conversionInfo: {
        status: 'pending',
        description: 'External URL will be converted to local storage on first access',
        originalUrl: imageUrl
      }
    });

  } catch (error) {
    console.error('Error setting external avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}