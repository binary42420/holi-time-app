import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { dbQueryService } from '@/lib/services/database-query-service';
import { ShiftWithDetails, User } from '@/lib/types';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const shiftWithDetailsInclude = {
  job: {
    select: {
      id: true,
      name: true,
      company: {
        select: {
          id: true,
          name: true,
          company_logo_url: true,
        },
      },
    },
  },
  assignedPersonnel: {
    select: {
      id: true,
      userId: true,
      roleCode: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  timesheets: {
    select: {
      id: true,
      status: true,
    },
  },
};

function transformShiftToShiftWithDetails(shift: any): ShiftWithDetails {
  const { assignedPersonnel, ...rest } = shift;
  return {
    ...rest,
    assignments: assignedPersonnel,
  } as ShiftWithDetails;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search');
    const jobId = searchParams.get('jobId');

    // Use optimized database query service
    const result = await dbQueryService.getShiftsOptimized({
      userId: user.id,
      userRole: user.role,
      companyId: companyId || user.companyId || undefined,
      status: status || undefined,
      date: date || undefined,
      search: search || undefined,
      jobId: jobId || undefined,
      page,
      limit,
    });

    // Transform to match expected format with consistent fulfillment data
    const transformedShifts = result.shifts.map(shift => {
      const totalRequired = (shift.requiredCrewChiefs || 0) +
                           (shift.requiredStagehands || 0) +
                           (shift.requiredForkOperators || 0) +
                           (shift.requiredReachForkOperators || 0) +
                           (shift.requiredRiggers || 0) +
                           (shift.requiredGeneralLaborers || 0);
      
      const totalAssigned = shift.assignedPersonnel.filter(ap => ap.userId).length;
      const requested = totalRequired || shift.requestedWorkers || 0;
      
      // Transform assignments to include avatarUrl for users
      const transformedAssignments = shift.assignedPersonnel.map(assignment => ({
        ...assignment,
        user: assignment.user ? {
          ...assignment.user,
          avatarUrl: assignment.user.avatarData ? `/api/users/${assignment.user.id}/avatar/image` : null,
        } : null,
      }));

      return {
        ...shift,
        assignments: transformedAssignments,
        assignedPersonnel: transformedAssignments, // Keep both for backward compatibility
        fulfillment: {
          totalRequired: requested,
          totalAssigned,
          percentage: requested > 0 ? Math.round((totalAssigned / requested) * 100) : 100,
          status: requested > 0 && totalAssigned >= requested ? 'full' : 
                  requested > 0 && totalAssigned >= requested * 0.8 ? 'good' : 'critical',
        }
      };
    });

    // Add cache-busting headers in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    const headers = new Headers();

    if (isDevelopment) {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    } else {
      headers.set('Cache-Control', 'public, max-age=60'); // 1 minute cache in production
    }

    return NextResponse.json({
      success: true,
      shifts: transformedShifts,
      total: result.total,
      pages: result.pages,
      currentPage: result.currentPage,
      timestamp: new Date().toISOString(),
      cacheInfo: {
        environment: isDevelopment ? 'development' : 'production',
        cacheBusting: isDevelopment,
        timestamp: Date.now()
      }
    }, { headers });

  } catch (error) {
    console.error('Error getting shifts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || (user.role !== UserRole.Admin)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, date, startTime, endTime } = body;

    if (!jobId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Job, date, start time, and end time are required' }, { status: 400 });
    }

    const shift = await prisma.shift.create({ data: body });

    return NextResponse.json({
      success: true,
      shift,
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
