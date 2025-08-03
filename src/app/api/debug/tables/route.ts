import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Skip database operations during build time
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      error: 'Database not available during build',
      tables: [],
      userTableColumns: []
    });
  }

  try {
    // Get all table names
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    // Get columns for users table specifically
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    
    return NextResponse.json({
      success: true,
      tables,
      userTableColumns: userColumns
    });
    
  } catch (error) {
    console.error('Error querying database:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to query database',
      details: error instanceof Error ? error.message : 'Unknown error',
      tables: [],
      userTableColumns: []
    }, { status: 500 });
  }
}