import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isBuildTime, buildTimeResponse } from '@/lib/build-time-check';

/**
 * Admin endpoint to add the avatarData column to the users table
 * This is a one-time setup endpoint
 */
export async function POST(request: NextRequest) {
  if (isBuildTime()) {
    return buildTimeResponse('Avatar column setup');
  }

  try {
    console.log('🔧 Adding avatarData column to users table...');
    
    // Check if column already exists
    const existingColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatarData';
    `;
    
    if (Array.isArray(existingColumn) && existingColumn.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'avatarData column already exists',
        alreadyExists: true
      });
    }
    
    // Add the column
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN "avatarData" TEXT;
    `;
    
    console.log('✅ avatarData column added successfully');
    
    // Verify the column was added
    const verifyColumn = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatarData';
    `;
    
    return NextResponse.json({
      success: true,
      message: 'avatarData column added successfully',
      columnInfo: verifyColumn
    });
    
  } catch (error) {
    console.error('❌ Error adding avatarData column:', error);
    return NextResponse.json({
      error: 'Failed to add avatarData column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check if the column exists
 */
export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return buildTimeResponse('Avatar column check');
  }

  try {
    // Check if column exists
    const columnInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatarData';
    `;
    
    const exists = Array.isArray(columnInfo) && columnInfo.length > 0;
    
    return NextResponse.json({
      success: true,
      columnExists: exists,
      columnInfo: exists ? columnInfo[0] : null,
      instructions: exists 
        ? 'Column already exists. Avatar system is ready to use.'
        : 'Column does not exist. Send a POST request to this endpoint to add it.'
    });
    
  } catch (error) {
    console.error('❌ Error checking avatarData column:', error);
    return NextResponse.json({
      error: 'Failed to check avatarData column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}