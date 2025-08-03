import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { TIMESHEET_STATUS, USER_ROLES } from '@/lib/constants';

const rejectTimesheetSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  notes: z.string().optional(),
});

// POST /api/timesheets/[id]/reject - Reject a timesheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = rejectTimesheetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reason, notes } = validation.data;

    // Check if timesheet exists
    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
            assignedPersonnel: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Check permissions - only admins, crew chiefs, and company users can reject
    const canReject = user.role === USER_ROLES.ADMIN ||
                     user.role === USER_ROLES.CREW_CHIEF ||
                     (user.role === USER_ROLES.COMPANY_USER && user.companyId === timesheet.shift.job.companyId);

    if (!canReject) {
      return NextResponse.json(
        { error: 'Insufficient permissions to reject timesheet' },
        { status: 403 }
      );
    }

    // Check if timesheet can be rejected (not already completed or rejected)
    if (timesheet.status === TIMESHEET_STATUS.COMPLETED || timesheet.status === TIMESHEET_STATUS.REJECTED) {
      return NextResponse.json(
        { error: 'Cannot reject a timesheet that is already completed or rejected' },
        { status: 400 }
      );
    }

    // Update timesheet with rejection
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        status: TIMESHEET_STATUS.REJECTED,
        rejectionReason: reason,
        rejectedAt: new Date(),
        rejectedBy: user.id,
        notes: notes || timesheet.notes,
      },
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });

    // Create notifications for relevant parties
    const jobName = timesheet.shift?.job?.name || 'Unknown Job';
    
    // Notify all assigned personnel that their timesheet was rejected
    for (const assignment of timesheet.shift?.assignedPersonnel || []) {
      await prisma.notification.create({
        data: {
          userId: assignment.user.id,
          type: 'timesheet_rejected',
          title: 'Timesheet Rejected',
          message: `Your timesheet for ${jobName} has been rejected. Reason: ${reason}`,
          relatedTimesheetId: id,
          relatedShiftId: timesheet.shiftId,
        },
      });
    }

    // If rejected by company, also notify managers
    if (user.role === 'CompanyUser') {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['Admin', 'CrewChief'] },
        },
      });

      for (const manager of managers) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            type: 'timesheet_rejected',
            title: 'Timesheet Rejected by Company',
            message: `Timesheet for ${jobName} has been rejected by the company. Reason: ${reason}`,
            relatedTimesheetId: id,
            relatedShiftId: timesheet.shiftId,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Timesheet rejected successfully',
      timesheet: updatedTimesheet,
    });

  } catch (error) {
    console.error('Error rejecting timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
