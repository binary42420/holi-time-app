import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Prevents static rendering of this API route

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('Adding requested_workers column to shifts table...');
    
    // Add the column if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE shifts
      ADD COLUMN IF NOT EXISTS requested_workers INTEGER DEFAULT 1;
    `;
    
    console.log('✅ Successfully added requested_workers column');
    
    // Update existing shifts with a default value
    await prisma.$executeRaw`
      UPDATE shifts
      SET requested_workers = 1
      WHERE requested_workers IS NULL;
    `;
    
    console.log('✅ Updated existing shifts with default requested_workers value');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    });
  } catch (error) {
    console.error('❌ Error in migration:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
