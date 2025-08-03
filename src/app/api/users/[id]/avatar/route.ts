import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { processImageBuffer, validateImageFile } from '@/lib/image-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Users can update their own avatar, admins can update any user's avatar
    if (user.id !== id && user.role !== UserRole.Admin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const data = await request.formData();
    const file: File | null = data.get('avatar') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    console.log(`Processing avatar for user ${id}, file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Convert file to buffer and process
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`Buffer created, size: ${buffer.length} bytes`);

    // Process image: resize and convert to base64 with more aggressive compression for smaller size
    const processedImage = await processImageBuffer(buffer, file.type, 150, 150, 60);

    console.log(`Processed image size: ${processedImage.size} bytes (${Math.round(processedImage.size / 1024)}KB)`);

    // Check if processed image is too large for database storage
    const maxDbSize = 1024 * 1024; // 1MB limit for database storage
    if (processedImage.size > maxDbSize) {
      console.error(`Processed image too large for database: ${processedImage.size} bytes`);
      return NextResponse.json({
        error: 'Image is too large after processing. Please try a smaller image or different format.'
      }, { status: 400 });
    }

    // Store the base64 data in database (unified approach)
    // Use avatarUrl as the single source of truth for both profile and avatar images
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        avatarData: processedImage.dataUrl,
      },
    });

    console.log(`✅ Avatar stored successfully for user ${id}. Size: ${Math.round(processedImage.size / 1024)}KB`);

    console.log(`Avatar saved to database for user ${id}`);

    // Return success with cache-busting information
    const timestamp = Date.now();
    const avatarUrl = `/api/users/${id}/avatar/image?t=${timestamp}`;

    return NextResponse.json({
      success: true,
      data: {
        url: avatarUrl,
        size: processedImage.size,
        mimeType: processedImage.mimeType,
        timestamp,
        userId: id
      },
      // Include cache invalidation instructions for frontend
      cacheInvalidation: {
        userId: id,
        timestamp,
        action: 'avatar_updated'
      }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Provide more specific error messages
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('file too large') || errorMessage.includes('too big')) {
        return NextResponse.json(
          { error: 'Image file is too large after processing. Please try a smaller image.' },
          { status: 400 }
        );
      }

      if (errorMessage.includes('invalid image') || errorMessage.includes('corrupt')) {
        return NextResponse.json(
          { error: 'Invalid or corrupted image file. Please upload a valid image.' },
          { status: 400 }
        );
      }

      if (errorMessage.includes('sharp') || errorMessage.includes('processing')) {
        return NextResponse.json(
          { error: 'Image processing failed. Please try a different image format.' },
          { status: 400 }
        );
      }

      if (errorMessage.includes('database') || errorMessage.includes('prisma')) {
        return NextResponse.json(
          { error: 'Database error. Please try again later.' },
          { status: 500 }
        );
      }

      // Return the actual error message for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { error: `Upload failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload avatar. Please try again with a smaller image.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Users can delete their own avatar, admins can delete any user's avatar
    if (user.id !== id && user.role !== UserRole.Admin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Clear the avatar from database
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        avatarData: null
      },
    });

    console.log(`✅ Avatar deleted successfully for user ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully',
      userId: id
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('database') || errorMessage.includes('prisma')) {
        return NextResponse.json(
          { error: 'Database error. Please try again later.' },
          { status: 500 }
        );
      }
      
      // Return the actual error message for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { error: `Delete failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete avatar. Please try again.' },
      { status: 500 }
    );
  }
}