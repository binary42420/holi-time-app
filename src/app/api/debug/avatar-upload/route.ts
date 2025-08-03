import { NextRequest, NextResponse } from 'next/server';
import { processImageBuffer, validateImageFile } from '@/lib/image-utils';

/**
 * Debug endpoint to test avatar upload processing
 * This helps identify where the upload process is failing
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug: Avatar upload test started');
    
    const data = await request.formData();
    const file: File | null = data.get('avatar') as unknown as File;

    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided',
        debug: 'FormData did not contain an "avatar" field'
      }, { status: 400 });
    }

    console.log('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Step 1: Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error,
        debug: 'File validation failed',
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      }, { status: 400 });
    }
    console.log('✅ File validation passed');

    // Step 2: Convert to buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
      console.log('✅ Buffer created:', {
        originalSize: file.size,
        bufferSize: buffer.length,
        match: file.size === buffer.length
      });
    } catch (bufferError) {
      console.error('❌ Buffer creation failed:', bufferError);
      return NextResponse.json({ 
        error: 'Failed to read file data',
        debug: bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'
      }, { status: 400 });
    }

    // Step 3: Test image processing
    let processedImage;
    try {
      console.log('🔄 Starting image processing...');
      processedImage = await processImageBuffer(buffer, file.type, 150, 150, 60);
      console.log('✅ Image processing completed:', {
        originalSize: buffer.length,
        processedSize: processedImage.size,
        compressionRatio: Math.round((1 - processedImage.size / buffer.length) * 100),
        mimeType: processedImage.mimeType,
        dataUrlLength: processedImage.dataUrl.length
      });
    } catch (processingError) {
      console.error('❌ Image processing failed:', processingError);
      return NextResponse.json({ 
        error: 'Image processing failed',
        debug: processingError instanceof Error ? processingError.message : 'Unknown processing error',
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          bufferSize: buffer.length
        }
      }, { status: 400 });
    }

    // Step 4: Check database size limits
    const maxDbSize = 1024 * 1024; // 1MB
    if (processedImage.size > maxDbSize) {
      return NextResponse.json({ 
        error: 'Processed image too large for database',
        debug: `Processed size: ${processedImage.size} bytes, limit: ${maxDbSize} bytes`,
        suggestions: [
          'Try a smaller image',
          'Use JPEG format instead of PNG',
          'Reduce image quality/resolution before upload'
        ]
      }, { status: 400 });
    }

    // Step 5: Test Sharp availability
    let sharpAvailable = false;
    try {
      const sharp = await import('sharp');
      sharpAvailable = true;
      console.log('✅ Sharp is available');
    } catch (sharpError) {
      console.log('⚠️ Sharp not available:', sharpError);
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar upload processing test completed successfully',
      debug: {
        fileInfo: {
          name: file.name,
          originalSize: file.size,
          type: file.type
        },
        processing: {
          bufferSize: buffer.length,
          processedSize: processedImage.size,
          compressionRatio: Math.round((1 - processedImage.size / buffer.length) * 100) + '%',
          finalMimeType: processedImage.mimeType,
          withinDbLimit: processedImage.size <= maxDbSize
        },
        system: {
          sharpAvailable,
          nodeEnv: process.env.NODE_ENV,
          maxDbSize: maxDbSize
        }
      },
      // Don't return the actual image data in debug mode to avoid large responses
      imagePreview: processedImage.dataUrl.substring(0, 100) + '...'
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug test failed',
      debug: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check system status
 */
export async function GET() {
  try {
    // Check Sharp availability
    let sharpInfo = { available: false, version: null };
    try {
      const sharp = await import('sharp');
      sharpInfo = {
        available: true,
        version: sharp.default().constructor.version || 'unknown'
      };
    } catch (sharpError) {
      console.log('Sharp not available:', sharpError);
    }

    return NextResponse.json({
      status: 'Avatar upload system status',
      sharp: sharpInfo,
      limits: {
        maxFileSize: '5MB',
        maxDbSize: '1MB',
        supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP']
      },
      processing: {
        defaultSize: '150x150px',
        defaultQuality: '60%',
        outputFormat: 'JPEG (when Sharp available)'
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'System check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
