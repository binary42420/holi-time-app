import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  // Skip database operations during build time
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      error: 'Database not available during build',
      message: 'Database tests are skipped during build time'
    });
  }

  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Test database connection
    console.log('Testing database connection...');
    
    // Check if DATABASE_URL is set
    const hasDbUrl = !!process.env.DATABASE_URL;
    console.log('DATABASE_URL is set:', hasDbUrl);
    
    if (hasDbUrl) {
      console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    }

    // Test simple query
    const healthResult = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Health check result:', healthResult);

    // Test shift creation query
    const testShiftData = {
      jobId: '01e1b522-f0d8-45b5-a2df-66cd7a6e0a54',
      date: '2024-07-21',
      startTime: '10:00',
      endTime: '18:00',
      location: 'API Test Location',
      crewChiefId: '56d1dcd6-00fc-480b-b125-bdd3bb77a0fd',
      requestedWorkers: 1,
      notes: 'API test shift'
    };

    console.log('Testing shift creation with data:', testShiftData);

    const shiftResult = await prisma.$queryRaw`
      INSERT INTO shifts (job_id, date, start_time, end_time, location, crew_chief_id, requested_workers, notes, status)
      VALUES (${testShiftData.jobId}, ${testShiftData.date}, ${testShiftData.startTime}, ${testShiftData.endTime}, ${testShiftData.location}, ${testShiftData.crewChiefId}, ${testShiftData.requestedWorkers}, ${testShiftData.notes}, 'Upcoming')
      RETURNING id, job_id, date, start_time, end_time, status
    `;

    console.log('Shift creation result:', shiftResult);

    return NextResponse.json({
      success: true,
      hasDbUrl,
      healthCheck: healthResult,
      shiftCreated: shiftResult
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
