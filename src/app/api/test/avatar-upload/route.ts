import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processImageBuffer } from '@/lib/image-utils';

/**
 * Test endpoint to verify avatar upload functionality
 * This endpoint can be used to test the image processing and database storage
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing avatar upload functionality...');
    
    const data = await request.formData();
    const file: File | null = data.get('avatar') as unknown as File;
    const testUserId = data.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!testUserId) {
      return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
    }

    console.log(`📁 Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`📊 Buffer size: ${buffer.length} bytes`);

    // Process image
    const processedImage = await processImageBuffer(buffer, file.type, 200, 200, 85);
    console.log(`✅ Image processed successfully:`);
    console.log(`   - Data URL length: ${processedImage.dataUrl.length} characters`);
    console.log(`   - Estimated size: ${Math.round(processedImage.size / 1024)}KB`);
    console.log(`   - MIME type: ${processedImage.mimeType}`);

    // Test database connection
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { id: true, name: true, email: true }
    });

    if (!existingUser) {
      return NextResponse.json({ 
        error: 'Test user not found',
        suggestion: 'Please provide a valid user ID for testing'
      }, { status: 404 });
    }

    console.log(`👤 Found test user: ${existingUser.name} (${existingUser.email})`);

    // Test database update
    try {
      const updatedUser = await prisma.user.update({
        where: { id: testUserId },
        data: { 
          avatarData: processedImage.dataUrl,
          avatarUrl: null // Clear any old URL-based avatar
        },
        select: { id: true, name: true, avatarData: true }
      });

      console.log('✅ Database update successful');
      console.log(`   - User ID: ${updatedUser.id}`);
      console.log(`   - Avatar data stored: ${updatedUser.avatarData ? 'Yes' : 'No'}`);
      console.log(`   - Avatar data length: ${updatedUser.avatarData?.length || 0} characters`);

      // Test image serving
      const imageUrl = `/api/users/${testUserId}/avatar/image`;
      console.log(`🖼️  Avatar accessible at: ${imageUrl}`);

      return NextResponse.json({
        success: true,
        message: 'Avatar upload test completed successfully',
        results: {
          originalFile: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          processedImage: {
            size: processedImage.size,
            mimeType: processedImage.mimeType,
            dataUrlLength: processedImage.dataUrl.length
          },
          database: {
            userFound: true,
            updateSuccessful: true,
            avatarStored: true
          },
          imageUrl: imageUrl
        }
      });

    } catch (updateError) {
      console.error('❌ Database update failed:', updateError);
      return NextResponse.json({ 
        error: 'Database update failed',
        details: updateError instanceof Error ? updateError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Avatar upload test failed:', error);
    return NextResponse.json({
      error: 'Avatar upload test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to show test instructions
 */
export async function GET() {
  return NextResponse.json({
    message: 'Avatar Upload Test Endpoint',
    instructions: {
      method: 'POST',
      contentType: 'multipart/form-data',
      requiredFields: {
        avatar: 'Image file (JPEG, PNG, GIF, WebP)',
        userId: 'Valid user ID from your database'
      },
      example: 'Use a tool like Postman or curl to test this endpoint'
    },
    testSteps: [
      '1. Find a valid user ID from your database',
      '2. Prepare a test image file',
      '3. Send POST request with avatar file and userId',
      '4. Check the response for success/failure details',
      '5. Verify the avatar is accessible at the returned imageUrl'
    ]
  });
}