import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!['CrewChief', 'Admin', 'Staff'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id: shiftId } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignedPersonnel: true },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const activeWorkers = shift.assignedPersonnel.filter(
      p => p.status !== 'ShiftEnded' && p.status !== 'NoShow'
    ).length;

    if (activeWorkers > 0) {
      return NextResponse.json(
        { error: `Cannot finalize timesheet. ${activeWorkers} workers have not ended their shifts yet.` },
        { status: 400 }
      );
    }

    const existingTimesheet = await prisma.timesheet.findUnique({
      where: { shiftId },
    });

    if (existingTimesheet) {
      return NextResponse.json({
        success: true,
        message: 'Timesheet already exists.',
        timesheetId: existingTimesheet.id,
      });
    }

    const newTimesheet = await prisma.timesheet.create({
      data: {
        shiftId,
        status: 'PENDING_COMPANY_APPROVAL',
        submittedBy: user.id,
        submittedAt: new Date(),
      },
    });

    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'Completed' },
    });

    return NextResponse.json({
      success: true,
      message: 'Timesheet finalized successfully.',
      timesheetId: newTimesheet.id,
    });

  } catch (error) {
    console.error('Error finalizing shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
