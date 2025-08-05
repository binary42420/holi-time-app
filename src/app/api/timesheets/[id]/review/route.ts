 import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { TimeEntry, TimesheetStatus, UserRole } from '@prisma/client';
import { NotificationType } from '@/lib/types';

// GET /api/timesheets/[id]/review - Get timesheet details for review
export async function GET(
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

    const { id: timesheetId } = await params;

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift: {
          include: {
            job: { include: { company: true } },
            assignedPersonnel: {
              include: {
                user: { select: { id: true, name: true } },
                timeEntries: {
                  select: {
                    id: true,
                    entryNumber: true,
                    clockIn: true,
                    clockOut: true,
                  },
                  orderBy: { createdAt: 'asc' },
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
    
    // Add safety checks for nested relations
    if (!timesheet.shift) {
      return NextResponse.json(
        { error: 'Timesheet shift data is missing' },
        { status: 500 }
      );
    }
    
    if (!timesheet.shift.job) {
      return NextResponse.json(
        { error: 'Timesheet job data is missing' },
        { status: 500 }
      );
    }

    // Check access permissions
    const hasAccess =
      user.role === UserRole.Admin ||
      user.id === timesheet.shift.assignedPersonnel.find(p => p.roleCode === 'CC')?.userId ||
      (user.role === UserRole.CompanyUser && user.companyId === timesheet.shift.job.companyId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to view this timesheet.' },
        { status: 403 }
      );
    }

    const { shift } = timesheet;
    const { job } = shift;
    const { company: client } = job;

    const processedPersonnel = shift.assignedPersonnel.map(p => {
      let totalMinutes = 0;
      p.timeEntries.forEach((entry) => {
        if (entry.clockIn && entry.clockOut) {
          const clockIn = new Date(entry.clockIn);
          const clockOut = new Date(entry.clockOut);
          const diffMs = clockOut.getTime() - clockIn.getTime();
          totalMinutes += Math.floor(diffMs / (1000 * 60));
        }
      });
      return {
        employeeId: p.userId,
        employeeName: p.user.name,
        employeeAvatar: p.user.avatarUrl,
        roleOnShift: p.roleCode, // Use roleCode as roleOnShift since that field doesn't exist
        roleCode: p.roleCode,
        timeEntries: p.timeEntries,
        totalHours: (totalMinutes / 60).toFixed(2),
        totalMinutes,
      };
    });

    const grandTotalMinutes = processedPersonnel.reduce((sum, emp) => sum + emp.totalMinutes, 0);
    const grandTotalHours = (grandTotalMinutes / 60).toFixed(2);

    const crewChief = shift.assignedPersonnel.find(p => p.roleCode === 'CC');
    
    // Get submitted user name if available
    let submittedByName = 'System';
    if (timesheet.submittedBy) {
      const submittedUser = await prisma.user.findUnique({
        where: { id: timesheet.submittedBy },
        select: { name: true }
      });
      submittedByName = submittedUser?.name || 'System';
    }

    const responseData = {
      timesheet: {
        id: timesheet.id,
        status: timesheet.status,
      clientSignature: timesheet.company_signature,
      managerSignature: timesheet.manager_signature,
      clientApprovedAt: timesheet.company_approved_at?.toISOString(),
      managerApprovedAt: timesheet.manager_approved_at?.toISOString(),
      submittedBy: submittedByName,
      submittedAt: timesheet.submittedAt?.toISOString() || timesheet.createdAt.toISOString(),
        unsigned_pdf_url: timesheet.unsigned_pdf_url,
        signed_pdf_url: timesheet.signed_pdf_url,
      },
      shift: {
        id: shift.id,
        date: shift.date.toISOString(),
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        location: shift.location,
        crewChiefId: crewChief?.userId,
        crewChiefName: crewChief?.user.name,
      },
      job: {
        id: job.id,
        name: job.name,
      },
      client: {
        id: client.id,
        companyName: client.name,
        contactPerson: client.email || 'N/A', // Use email as contact person since contactPerson field doesn't exist
      },
      assignedPersonnel: processedPersonnel,
      totals: {
        grandTotalHours,
        grandTotalMinutes,
        employeeCount: processedPersonnel.length,
      },
      permissions: {
        canApprove: user.role === UserRole.Admin || user.role === UserRole.CompanyUser || user.id === crewChief?.userId,
        canFinalApprove: user.role === UserRole.Admin,
        isClientUser: user.role === UserRole.CompanyUser,
        isManager: user.role === UserRole.Admin,
        isCrewChief: user.id === crewChief?.userId,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching timesheet for review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/timesheets/[id]/review - Update timesheet status (e.g., reject)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== UserRole.Admin) {
      return NextResponse.json(
        { error: 'Forbidden: Only managers can update timesheet status.' },
        { status: 403 }
      );
    }

    const { id: timesheetId } = await params;
    const { status, rejectionReason } = await request.json();

    if (status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Invalid status. Only "REJECTED" is supported.' },
        { status: 400 }
      );
    }

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required.' },
        { status: 400 }
      );
    }

    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: TimesheetStatus.REJECTED,
        rejectionReason,
      },
    });

    // Fetch related data for notification
    const shiftForNotification = await prisma.shift.findUnique({
      where: { id: updatedTimesheet.shiftId },
      select: {
        job: { select: { name: true } },
        assignedPersonnel: {
          where: { roleCode: 'CC' },
          select: { userId: true, user: { select: { name: true } } },
        },
      },
    });

    if (shiftForNotification) {
      const crewChief = shiftForNotification.assignedPersonnel[0];
      if (crewChief?.userId) {
        const jobName = shiftForNotification.job?.name || 'Unknown Job';
        await prisma.notification.create({
          data: {
            userId: crewChief.userId,
            type: 'timesheet_rejected',
            title: 'Timesheet Rejected',
            message: `Timesheet for job "${jobName}" has been rejected. Reason: ${rejectionReason}`,
            relatedTimesheetId: updatedTimesheet.id,
            relatedShiftId: updatedTimesheet.shiftId,
          },
        });
      }
    }

    return NextResponse.json({
      message: 'Timesheet has been rejected successfully.',
      timesheetId: updatedTimesheet.id,
    });
  } catch (error) {
    console.error('Error updating timesheet status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
