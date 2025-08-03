import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing shifts API...');
    
    // Test authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        step: 'authentication'
      }, { status: 401 });
    }
    
    console.log(`👤 User authenticated: ${user.name} (${user.role})`);
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic shifts query
    const shiftsCount = await prisma.shift.count();
    console.log(`📊 Total shifts in database: ${shiftsCount}`);
    
    // Test shifts query with basic include
    const shifts = await prisma.shift.findMany({
      take: 5,
      include: {
        job: {
          select: {
            id: true,
            name: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignedPersonnel: {
          select: {
            id: true,
            roleCode: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    console.log(`📋 Retrieved ${shifts.length} shifts successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Shifts API test completed successfully',
      results: {
        authentication: {
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            companyId: user.companyId
          }
        },
        database: {
          connected: true,
          totalShifts: shiftsCount
        },
        shifts: {
          retrieved: shifts.length,
          sample: shifts.map(shift => ({
            id: shift.id,
            date: shift.date,
            status: shift.status,
            jobName: shift.job?.name,
            companyName: shift.job?.company?.name,
            assignedCount: shift.assignedPersonnel?.length || 0
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Shifts API test failed:', error);
    return NextResponse.json({
      error: 'Shifts API test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}