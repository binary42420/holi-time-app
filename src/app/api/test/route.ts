import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Test basic queries
    const userCount = await prisma.user.count();
    const jobCount = await prisma.job.count();
    const shiftCount = await prisma.shift.count();
    const companyCount = await prisma.company.count();
    
    // Get a sample user if any exist
    const sampleUser = await prisma.user.findFirst();
    
    // Get all users for debugging
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      counts: {
        users: userCount,
        jobs: jobCount,
        shifts: shiftCount,
        companies: companyCount
      },
      sampleUser: sampleUser ? {
        id: sampleUser.id,
        name: sampleUser.name,
        email: sampleUser.email,
        role: sampleUser.role
      } : null,
      allUsers: allUsers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}