import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { TIMESHEET_STATUS } from '@/constants';

async function getCurrentUser(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: shiftId } = await params;

    // Check if shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        timesheets: true,
        assignedPersonnel: {
          include: {
            user: true
          }
        }
      }
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Safely check assigned personnel
    const assignedPersonnel = shift.assignedPersonnel || [];
    
    // Check if all workers have ended their shifts
    const activeWorkers = assignedPersonnel.filter(assignment => {
      // Skip if no userId or is placeholder
      if (!assignment.userId || assignment.isPlaceholder) {
        return false;
      }

      const isShiftEnded = assignment.status === 'shift_ended' || 
                          assignment.status === 'Shift Ended' || 
                          assignment.status === 'ShiftEnded' ||
                          assignment.status === 'SHIFT_ENDED';
      
      const isNoShow = assignment.status === 'NoShow' || 
                      assignment.status === 'no_show' || 
                      assignment.status === 'NO_SHOW';
      
      return !isShiftEnded && !isNoShow;
    });

    if (activeWorkers.length > 0) {
      return NextResponse.json({ 
        error: `Cannot finalize timesheet. ${activeWorkers.length} workers have not ended their shifts yet.` 
      }, { status: 400 });
    }

    // Check if timesheet already exists for this shift
    const existingTimesheet = await prisma.timesheet.findUnique({
      where: { shiftId: shiftId }
    });

    let timesheet;

    if (existingTimesheet) {
      // Update existing timesheet
      timesheet = await prisma.timesheet.update({
        where: { id: existingTimesheet.id },
        data: {
          status: TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL,
          submittedBy: user.id,
          submittedAt: new Date(),
        },
      });
    } else {
      // Create new timesheet only if one doesn't exist
      timesheet = await prisma.timesheet.create({
        data: {
          shiftId,
          status: TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL,
          submittedBy: user.id,
          submittedAt: new Date(),
        },
      });
    }

    // Update shift status to completed if not already
    if (shift.status !== 'Completed') {
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'Completed' }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Timesheet finalized successfully',
      timesheetId: timesheet.id,
      timesheet
    });

  } catch (error) {
    console.error('Error finalizing timesheet:', error);
    
    // Handle specific Prisma unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json({
        error: 'A timesheet already exists for this shift. Please refresh the page and try again.',
      }, { status: 409 });
    }
    
    return NextResponse.json(
      { error: 'Failed to finalize timesheet' },
      { status: 500 }
    );
  }
}