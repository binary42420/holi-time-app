import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for long-running compression

interface CompressionConfig {
  width: number;
  height: number;
  quality: number;
  maxSizeKB: number;
  batchSize: number;
}

const CONFIG: CompressionConfig = {
  width: 128,
  height: 128,
  quality: 75,
  maxSizeKB: 50,
  batchSize: 5, // Smaller batches for API endpoint
};

function parseDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  return { buffer, mimeType, base64Data };
}

async function compressImage(inputBuffer: Buffer) {
  try {
    const metadata = await sharp(inputBuffer).metadata();
    
    // First attempt with standard quality
    let outputBuffer = await sharp(inputBuffer)
      .resize(CONFIG.width, CONFIG.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: CONFIG.quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
    
    let outputSizeKB = Math.round(outputBuffer.length / 1024);
    
    // If still too large, try higher compression
    if (outputSizeKB > CONFIG.maxSizeKB) {
      outputBuffer = await sharp(inputBuffer)
        .resize(CONFIG.width, CONFIG.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 60,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      outputSizeKB = Math.round(outputBuffer.length / 1024);
    }
    
    return {
      buffer: outputBuffer,
      mimeType: 'image/jpeg',
      sizeKB: outputSizeKB,
      compressionRatio: Math.round((1 - outputBuffer.length / inputBuffer.length) * 100),
      originalSize: Math.round(inputBuffer.length / 1024),
      originalDimensions: `${metadata.width}x${metadata.height}`
    };
    
  } catch (error) {
    throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admins to run compression
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const dryRun = body.dryRun === true;

    console.log(`🚀 Starting avatar compression (${dryRun ? 'DRY RUN' : 'LIVE'})`);

    // Get all users with base64 avatar data
    const usersWithAvatars = await prisma.user.findMany({
      where: {
        avatarData: {
          not: null,
          startsWith: 'data:'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    if (usersWithAvatars.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No base64 avatars found to compress',
        results: {
          processed: 0,
          compressed: 0,
          skipped: 0,
          errors: 0,
          totalSavingsKB: 0
        }
      });
    }

    const results = {
      processed: 0,
      compressed: 0,
      skipped: 0,
      errors: 0,
      totalOriginalSizeKB: 0,
      totalCompressedSizeKB: 0,
      details: [] as any[]
    };

    // Process in batches
    for (let i = 0; i < usersWithAvatars.length; i += CONFIG.batchSize) {
      const batch = usersWithAvatars.slice(i, i + CONFIG.batchSize);
      
      for (const user of batch) {
        results.processed++;
        
        try {
          if (!user.avatarData || !user.avatarData.startsWith('data:')) {
            results.skipped++;
            continue;
          }

          const { buffer: originalBuffer } = parseDataUrl(user.avatarData);
          const originalSizeKB = Math.round(originalBuffer.length / 1024);
          
          // Skip if already small enough
          if (originalSizeKB <= CONFIG.maxSizeKB) {
            results.skipped++;
            results.details.push({
              user: user.name,
              status: 'skipped',
              reason: 'already_small',
              originalSizeKB
            });
            continue;
          }

          // Compress the image
          const compressed = await compressImage(originalBuffer);
          
          results.totalOriginalSizeKB += originalSizeKB;
          results.totalCompressedSizeKB += compressed.sizeKB;

          if (!dryRun) {
            // Update the database
            const newDataUrl = `data:${compressed.mimeType};base64,${compressed.buffer.toString('base64')}`;
            
            await prisma.user.update({
              where: { id: user.id },
              data: { avatarData: newDataUrl }
            });
          }

          results.compressed++;
          results.details.push({
            user: user.name,
            status: dryRun ? 'would_compress' : 'compressed',
            originalSizeKB,
            compressedSizeKB: compressed.sizeKB,
            compressionRatio: compressed.compressionRatio,
            originalDimensions: compressed.originalDimensions
          });

        } catch (error) {
          results.errors++;
          results.details.push({
            user: user.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    const totalSavingsKB = results.totalOriginalSizeKB - results.totalCompressedSizeKB;
    const totalSavingsPercent = results.totalOriginalSizeKB > 0 
      ? Math.round((totalSavingsKB / results.totalOriginalSizeKB) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      dryRun,
      results: {
        ...results,
        totalSavingsKB,
        totalSavingsPercent
      },
      summary: {
        message: dryRun 
          ? `Would compress ${results.compressed} avatars, saving ${totalSavingsKB}KB (${totalSavingsPercent}%)` 
          : `Compressed ${results.compressed} avatars, saved ${totalSavingsKB}KB (${totalSavingsPercent}%)`,
        processed: results.processed,
        compressed: results.compressed,
        skipped: results.skipped,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('Error compressing avatars:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get compression statistics without actually compressing
    const usersWithAvatars = await prisma.user.findMany({
      where: {
        avatarData: {
          not: null,
          startsWith: 'data:'
        }
      },
      select: {
        id: true,
        name: true,
        avatarData: true
      }
    });

    let totalSizeKB = 0;
    let largeAvatarsCount = 0;
    const sizeDistribution = { small: 0, medium: 0, large: 0, xlarge: 0 };

    for (const user of usersWithAvatars) {
      if (user.avatarData) {
        const sizeKB = Math.round(user.avatarData.length * 0.75 / 1024); // Approximate base64 to binary size
        totalSizeKB += sizeKB;
        
        if (sizeKB > CONFIG.maxSizeKB) {
          largeAvatarsCount++;
        }

        if (sizeKB < 25) sizeDistribution.small++;
        else if (sizeKB < 100) sizeDistribution.medium++;
        else if (sizeKB < 500) sizeDistribution.large++;
        else sizeDistribution.xlarge++;
      }
    }

    return NextResponse.json({
      success: true,
      statistics: {
        totalUsers: usersWithAvatars.length,
        totalSizeKB,
        largeAvatarsCount,
        compressionNeeded: largeAvatarsCount > 0,
        sizeDistribution,
        config: CONFIG
      }
    });

  } catch (error) {
    console.error('Error getting avatar statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}