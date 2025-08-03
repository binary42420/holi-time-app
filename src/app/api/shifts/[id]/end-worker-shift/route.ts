import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const endWorkerShiftSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

// POST /api/shifts/[id]/end-worker-shift - End a specific worker's shift
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !['Admin', 'CrewChief'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or Crew Chief access required' },
        { status: 403 }
      );
    }

    const { id: shiftId } = await params;
    const body = await request.json();

    // Validate request body
    const validation = endWorkerShiftSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { workerId } = validation.data;

    // Check if shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignedPersonnel: {
          where: { id: workerId },
          include: {
            timeEntries: {
              orderBy: { entryNumber: 'desc' }
            }
          }
        }
      }
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const worker = shift.assignedPersonnel[0];
    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found in this shift' },
        { status: 404 }
      );
    }

    // Check if worker is already marked as shift ended
    if (worker.status === 'ShiftEnded') {
      return NextResponse.json(
        { error: 'Worker shift has already ended' },
        { status: 400 }
      );
    }

    // Check if worker is marked as no show
    if (worker.status === 'NoShow') {
      return NextResponse.json(
        { error: 'Cannot end shift for a no-show worker' },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Clock out any active time entries
      const activeEntry = worker.timeEntries.find(entry => entry.isActive);
      if (activeEntry) {
        await tx.timeEntry.update({
          where: { id: activeEntry.id },
          data: {
            clockOut: new Date(),
            isActive: false
          }
        });
      }

      // Update worker status to shift ended
      const updatedWorker = await tx.assignedPersonnel.update({
        where: { id: workerId },
        data: {
          status: 'ShiftEnded'
        },
        include: {
          user: {
            select: { id: true, name: true }
          },
          timeEntries: {
            orderBy: { entryNumber: 'asc' }
          }
        }
      });

      // Check if all workers have ended their shifts
      const allWorkers = await tx.assignedPersonnel.findMany({
        where: { shiftId },
        select: { id: true, status: true }
      });

      const allWorkersEnded = allWorkers.every(worker =>
        worker.status === 'ShiftEnded' || worker.status === 'NoShow'
      );

      let timesheetId = null;

      // If all workers have ended their shifts, create timesheet
      if (allWorkersEnded) {
        // Check if timesheet already exists
        const existingTimesheet = await tx.timesheet.findUnique({
          where: { shiftId },
          select: { id: true }
        });

        if (!existingTimesheet) {
          // Create new timesheet
          const newTimesheet = await tx.timesheet.create({
            data: {
              shiftId,
              status: 'PENDING_COMPANY_APPROVAL',
              submittedBy: user.id,
              submittedAt: new Date(),
            },
            select: { id: true }
          });
          timesheetId = newTimesheet.id;

          // Update shift status to completed
          await tx.shift.update({
            where: { id: shiftId },
            data: { status: 'Completed' }
          });
        }
      }

      return { updatedWorker, timesheetId, allWorkersEnded };
    });

    return NextResponse.json({
      success: true,
      message: `${result.updatedWorker.user.name}'s shift has been ended${result.allWorkersEnded ? '. Timesheet created and ready for client approval.' : ''}`,
      data: {
        workerId,
        workerName: result.updatedWorker.user.name,
        status: result.updatedWorker.status,
        timeEntries: result.updatedWorker.timeEntries
      },
      timesheetCreated: !!result.timesheetId,
      timesheetId: result.timesheetId,
      allWorkersEnded: result.allWorkersEnded
    });

  } catch (error) {
    console.error('Error ending worker shift:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
