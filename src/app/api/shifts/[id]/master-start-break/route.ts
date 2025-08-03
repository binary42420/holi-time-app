import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// POST /api/shifts/[id]/master-start-break - Start break for all clocked-in workers
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

    // Check if shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignedPersonnel: {
          where: {
            status: {
              notIn: ['NoShow', 'ShiftEnded']
            }
          },
          include: {
            timeEntries: {
              where: { isActive: true }
            },
            user: {
              select: { id: true, name: true }
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

    // Find workers who are currently clocked in (have active time entries)
    const clockedInWorkers = shift.assignedPersonnel.filter(worker => 
      worker.timeEntries.length > 0
    );

    if (clockedInWorkers.length === 0) {
      return NextResponse.json(
        { error: 'No workers are currently clocked in' },
        { status: 400 }
      );
    }

    // Use transaction to clock out all active workers
    const results = await prisma.$transaction(async (tx) => {
      const clockOutResults = [];

      for (const worker of clockedInWorkers) {
        const activeEntry = worker.timeEntries[0]; // Should only be one active entry
        
        if (activeEntry) {
          const updatedEntry = await tx.timeEntry.update({
            where: { id: activeEntry.id },
            data: {
              clockOut: new Date(),
              isActive: false
            }
          });

          clockOutResults.push({
            workerId: worker.id,
            workerName: worker.user.name,
            entryId: updatedEntry.id,
            clockOutTime: updatedEntry.clockOut
          });
        }
      }

      return clockOutResults;
    });

    return NextResponse.json({
      success: true,
      message: `${results.length} workers sent on break`,
      data: {
        shiftId,
        workersAffected: results.length,
        workers: results
      }
    });

  } catch (error) {
    console.error('Error starting break for workers:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
