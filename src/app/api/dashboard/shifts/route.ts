import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = (page - 1) * limit;

    // Calculate 72-hour window
    const now = new Date();
    const past36Hours = new Date(now.getTime() - (36 * 60 * 60 * 1000));
    const future36Hours = new Date(now.getTime() + (36 * 60 * 60 * 1000));

    let shiftsQuery: any = {
      where: {
        date: {
          gte: past36Hours,
          lte: future36Hours,
        },
      },
      include: {
        job: {
          include: {
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
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                performance: true,
              },
            },
            timeEntries: {
              orderBy: {
                clockIn: 'desc',
              },
            },
          },
        },
        timesheets: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            company_approved_at: true,
            manager_approved_at: true,
          },
        },
      },
      orderBy: [
        {
          date: 'asc',
        },
        {
          startTime: 'asc',
        },
      ],
    };

    // Role-based filtering for shifts
    if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
      // Admin: All shifts in 72-hour window, paginated (5 per page)
      // No additional filtering needed
    } else if (user.role === UserRole.CrewChief || user.role === UserRole.Employee) {
      // Crew Chief/Employee: Only their assigned shifts in 72-hour window, paginated (5 per page)
      shiftsQuery.where.assignedPersonnel = {
        some: {
          userId: user.id,
        },
      };
    } else if (user.role === UserRole.CompanyUser) {
      // Company users see only their company's shifts
      if (!user.companyId) {
        return NextResponse.json({ success: true, shifts: [], meta: { total: 0, page: 1, totalPages: 0 } });
      }
      shiftsQuery.where.job = {
        companyId: user.companyId,
      };
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get total count for pagination
    const totalCount = await prisma.shift.count({
      where: shiftsQuery.where,
    });

    // Get paginated shifts
    const shifts = await prisma.shift.findMany({
      ...shiftsQuery,
      skip: offset,
      take: limit,
    });

    // Enhance shifts with additional data
    const enhancedShifts = shifts.map(shift => {
      const totalRequired = 
        shift.requiredCrewChiefs +
        shift.requiredStagehands +
        shift.requiredForkOperators +
        shift.requiredReachForkOperators +
        shift.requiredRiggers +
        shift.requiredGeneralLaborers;

      const totalAssigned = shift.assignedPersonnel.length;
      const fulfillmentPercentage = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

      // Calculate shift timing status
      const shiftDate = new Date(shift.date);
      const shiftStart = shift.startTime ? new Date(`${shift.date}T${shift.startTime}`) : shiftDate;
      const shiftEnd = shift.endTime ? new Date(`${shift.date}T${shift.endTime}`) : shiftDate;
      
      let timingStatus = 'upcoming';
      if (now >= shiftStart && now <= shiftEnd) {
        timingStatus = 'current';
      } else if (now > shiftEnd) {
        timingStatus = 'past';
      }

      // Get worker status summary
      const workerStatusSummary = {
        assigned: shift.assignedPersonnel.filter(ap => ap.status === 'Assigned').length,
        clockedIn: shift.assignedPersonnel.filter(ap => ap.status === 'ClockedIn').length,
        onBreak: shift.assignedPersonnel.filter(ap => ap.status === 'OnBreak').length,
        clockedOut: shift.assignedPersonnel.filter(ap => ap.status === 'ClockedOut').length,
        shiftEnded: shift.assignedPersonnel.filter(ap => ap.status === 'ShiftEnded').length,
        noShow: shift.assignedPersonnel.filter(ap => ap.status === 'NoShow').length,
      };

      // Check user's role on this shift
      const userAssignment = shift.assignedPersonnel.find(ap => ap.userId === user.id);
      const userRoleOnShift = userAssignment?.roleCode || null;
      const isCrewChiefForShift = userRoleOnShift === 'CC';

      // Determine permissions
      const timesheet = shift.timesheets && shift.timesheets.length > 0 ? shift.timesheets[0] : null;
      const isTimesheetFinalized = timesheet?.status === 'COMPLETED';
      
      let canModifyShift = false;
      let canManageWorkers = false;
      let canFinalizeTimesheet = false;

      if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
        canModifyShift = true;
        canManageWorkers = true;
        canFinalizeTimesheet = true;
      } else if (user.role === UserRole.CrewChief && isCrewChiefForShift && !isTimesheetFinalized) {
        canModifyShift = true;
        canManageWorkers = true;
        canFinalizeTimesheet = false; // Can prepare but not finalize
      }

      return {
        ...shift,
        fulfillment: {
          totalRequired,
          totalAssigned,
          percentage: fulfillmentPercentage,
          status: fulfillmentPercentage >= 100 ? 'full' : fulfillmentPercentage >= 80 ? 'good' : 'critical',
        },
        timing: {
          status: timingStatus,
          shiftStart,
          shiftEnd,
          isToday: shiftDate.toDateString() === now.toDateString(),
        },
        workerStatus: workerStatusSummary,
        userContext: {
          assignment: userAssignment,
          roleOnShift: userRoleOnShift,
          isCrewChief: isCrewChiefForShift,
        },
        permissions: {
          canModifyShift,
          canManageWorkers,
          canFinalizeTimesheet,
          canView: true,
        },
        timesheet: timesheet || null,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      shifts: enhancedShifts,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        userRole: user.role,
        windowStart: past36Hours,
        windowEnd: future36Hours,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard shifts:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}