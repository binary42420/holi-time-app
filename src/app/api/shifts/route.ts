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
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, date, startTime, endTime, location, crewChiefId, requestedWorkers, workerRequirements, notes } = body;

    if (!jobId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Job ID, date, start time, and end time are required' }, { status: 400 });
    }

    // Verify the job exists and user has permission
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, name: true, companyId: true }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Authorization check - match the frontend logic
    const canCreateShift = 
      user.role === UserRole.Admin ||
      (user.role === UserRole.CrewChief && job.companyId === user.companyId) ||
      (user.role === UserRole.CompanyUser && job.companyId === user.companyId);

    if (!canCreateShift) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only administrators, crew chiefs, or company users for this job can create shifts.' 
      }, { status: 403 });
    }

    // Convert date and time strings to proper DateTime objects
    const shiftDate = new Date(date);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(shiftDate);
    startDateTime.setUTCHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(shiftDate);
    endDateTime.setUTCHours(endHour, endMinute, 0, 0);
    
    // Handle overnight shifts (end time is next day)
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    // Prepare shift data
    const shiftData = {
      jobId,
      date: shiftDate,
      startTime: startDateTime,
      endTime: endDateTime,
      location: location || null,
      crewChiefId: crewChiefId || null,
      requestedWorkers: requestedWorkers || 1,
      notes: notes || null,
      status: 'Pending', // Use correct enum value - new shifts start as Pending
      // Store worker requirements in the database format
      requiredStagehands: workerRequirements?.StageHand || 0,
      requiredForkOperators: workerRequirements?.ForkOperator || 0,
      requiredReachForkOperators: workerRequirements?.ReachForkOperator || 0,
      requiredGeneralLaborers: workerRequirements?.General || 0,
      requiredCrewChiefs: 1, // Always 1 crew chief
    };

    const shift = await prisma.shift.create({
      data: shiftData,
      include: shiftWithDetailsInclude
    });

    // Transform the response to match expected format
    const transformedShift = transformShiftToShiftWithDetails(shift);

    return NextResponse.json({
      success: true,
      shift: transformedShift,
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
