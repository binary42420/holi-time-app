import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Test endpoint to verify the avatar system is working properly
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing avatar system...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Get a sample user to test with
    const sampleUser = await prisma.user.findFirst({
      select: { id: true, name: true, email: true, avatarData: true }
    });
    
    if (!sampleUser) {
      return NextResponse.json({
        error: 'No users found in database for testing',
        suggestion: 'Please create a user first'
      }, { status: 404 });
    }
    
    console.log(`👤 Found sample user: ${sampleUser.name} (${sampleUser.email})`);
    
    // Check if user has an avatar
    const hasAvatar = !!sampleUser.avatarData;
    const isBase64Avatar = sampleUser.avatarData?.startsWith('data:') || false;
    
    console.log(`🖼️  Avatar status: ${hasAvatar ? 'Has avatar' : 'No avatar'}`);
    if (hasAvatar) {
      console.log(`📊 Avatar type: ${isBase64Avatar ? 'Base64 (database)' : 'URL (external)'}`);
    }
    
    // Test avatar endpoints
    const avatarUploadUrl = `/api/users/${sampleUser.id}/avatar`;
    const avatarImageUrl = `/api/users/${sampleUser.id}/avatar/image`;
    
    return NextResponse.json({
      success: true,
      message: 'Avatar system test completed',
      results: {
        database: {
          connected: true,
          sampleUser: {
            id: sampleUser.id,
            name: sampleUser.name,
            email: sampleUser.email
          }
        },
        avatar: {
          hasAvatar,
          isBase64Avatar,
          avatarLength: sampleUser.avatarUrl?.length || 0
        },
        endpoints: {
          upload: avatarUploadUrl,
          image: avatarImageUrl
        },
        testInstructions: [
          '1. Use a tool like Postman to test avatar upload',
          `2. POST to ${avatarUploadUrl} with form-data:`,
          '   - avatar: [image file]',
          `3. Check avatar display at ${avatarImageUrl}`,
          '4. Verify avatar appears in profile page'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Avatar system test failed:', error);
    return NextResponse.json({
      error: 'Avatar system test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST endpoint to test avatar upload with a sample image
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'userId required',
        example: { userId: 'your-user-id-here' }
      }, { status: 400 });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarData: true }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        userId 
      }, { status: 404 });
    }
    
    // Create a simple test image (1x1 pixel red PNG in base64)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    // Update user with test avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarData: testImageBase64 }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test avatar uploaded successfully',
      user: {
        id: updatedUser.id,
        name: user.name,
        avatarUrl: `/api/users/${userId}/avatar/image`
      },
      testImage: {
        size: testImageBase64.length,
        type: 'PNG',
        description: '1x1 pixel red test image'
      }
    });
    
  } catch (error) {
    console.error('❌ Test avatar upload failed:', error);
    return NextResponse.json({
      error: 'Test avatar upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}