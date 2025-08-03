import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const markNoShowSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

// POST /api/shifts/[id]/mark-no-show - Mark a worker as no show
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
    const validation = markNoShowSchema.safeParse(body);
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

    const worker = shift.assignedPersonnel[0];
    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found in this shift' },
        { status: 404 }
      );
    }

    // Check if worker has already started their shift
    if (worker.timeEntries.length > 0) {
      return NextResponse.json(
        { error: 'Cannot mark as no-show - worker has already started their shift' },
        { status: 400 }
      );
    }

    // Check if worker is already marked as no show
    if (worker.status === 'NoShow') {
      return NextResponse.json(
        { error: 'Worker is already marked as no show' },
        { status: 400 }
      );
    }

    // Update worker status to no show
    const updatedWorker = await prisma.assignedPersonnel.update({
      where: { id: workerId },
      data: {
        status: 'NoShow'
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${updatedWorker.user.name} has been marked as no show`,
      data: {
        workerId,
        workerName: updatedWorker.user.name,
        status: updatedWorker.status
      }
    });

  } catch (error) {
    console.error('Error marking worker as no show:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
