import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// POST /api/shifts/[id]/master-end-shift - End shift for all active workers
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
            timeEntries: true,
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

    // Find workers who have active shifts (have time entries and not already ended)
    const activeWorkers = shift.assignedPersonnel.filter(worker => 
      worker.timeEntries.length > 0
    );

    if (activeWorkers.length === 0) {
      return NextResponse.json(
        { error: 'No workers have active shifts to end' },
        { status: 400 }
      );
    }

    // Use transaction to end all active worker shifts
    const results = await prisma.$transaction(async (tx) => {
      const endShiftResults = [];

      for (const worker of activeWorkers) {
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
          where: { id: worker.id },
          data: {
            status: 'ShiftEnded'
          }
        });

        endShiftResults.push({
          workerId: worker.id,
          workerName: worker.user.name,
          status: updatedWorker.status,
          hadActiveEntry: !!activeEntry
        });
      }

      return endShiftResults;
    });

    return NextResponse.json({
      success: true,
      message: `${results.length} worker shifts ended`,
      data: {
        shiftId,
        workersAffected: results.length,
        workers: results
      }
    });

  } catch (error) {
    console.error('Error ending worker shifts:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
