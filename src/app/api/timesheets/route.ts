import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { UserRole, TimesheetStatus } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get('shiftId');
  const status = searchParams.get('status');

  let where: any = {};

  // --- Role-Based Access Control ---
  if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
    // Admins and Staff can see all timesheets. No additional filters needed.
  } else if (user.role === UserRole.CompanyUser) {
    if (!user.companyId) {
      return NextResponse.json({ success: true, timesheets: [] }); // No company, no timesheets
    }
    where.shift = {
      job: {
        companyId: user.companyId,
        status: {
          notIn: ['Completed', 'Cancelled'],
        },
      },
    };
  } else if (user.role === UserRole.Employee || user.role === UserRole.CrewChief) {
    where.shift = {
      assignedPersonnel: {
        some: {
          userId: user.id,
        },
      },
    };
  } else {
    // Default to no access if role is not recognized
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // --- Additional Filtering ---
  if (shiftId) {
    where.shiftId = shiftId;
  }

  if (status) {
    const statusMap: { [key: string]: string } = {
      'pending_client_approval': 'PENDING_COMPANY_APPROVAL',
      'pending_manager_approval': 'PENDING_MANAGER_APPROVAL',
      'completed': 'COMPLETED',
      'rejected': 'REJECTED',
    };
    const dbStatus = statusMap[status] || status.toUpperCase();
    where.status = dbStatus;
  }
  
  console.log('Query where clause:', where);

  try {
    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        shift: {
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
                  },
                },
                timeEntries: true,
              },
            },
          },
        },
      },
      orderBy: {
        shift: {
          date: 'desc',
        },
      },
    });

    console.log('Timesheets query result:', {
      count: timesheets.length,
      timesheets: timesheets.map(t => ({
        id: t.id,
        status: t.status,
        shiftId: t.shiftId,
        submittedAt: t.submittedAt
      }))
    });

    return NextResponse.json({
      success: true,
      timesheets,
    });
  } catch (error) {
    console.error('Error getting timesheets:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

const createTimesheetSchema = z.object({
  shiftId: z.string().min(1, { message: 'Shift ID is required' }),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  const isAuthorized = user.role === UserRole.Admin || user.role === UserRole.CrewChief;
  if (!user || !isAuthorized) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = createTimesheetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { shiftId } = validation.data;

    // Check if a timesheet for this shift already exists
    const existingTimesheet = await prisma.timesheet.findUnique({
      where: { shiftId },
    });

    if (existingTimesheet) {
      return NextResponse.json(
        { error: 'A timesheet for this shift already exists' },
        { status: 409 }
      );
    }

    // Verify the shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const newTimesheet = await prisma.timesheet.create({
      data: {
        shiftId,
        status: TimesheetStatus.DRAFT,
      },
    });

    return NextResponse.json({
      success: true,
      timesheet: newTimesheet,
    });
  } catch (error) {
    console.error('Error creating timesheet:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
