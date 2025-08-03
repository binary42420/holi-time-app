import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { canCrewChiefManageShift } from '@/lib/auth';

const clockOutSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

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

    const { id: shiftId } = await params;

    const hasPermission = await canCrewChiefManageShift(user, shiftId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to clock out workers for this shift.' }, { status: 403 });
    }
    const body = await request.json();

    // Validate request body
    const validation = clockOutSchema.safeParse(body);
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

    // Get worker with active time entry and user info
    const worker = await prisma.assignedPersonnel.findUnique({
      where: { id: workerId },
      include: {
        timeEntries: {
          where: { isActive: true }
        },
        user: {
          select: { id: true, name: true }
        }
      }
    });

    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    const activeEntry = worker.timeEntries[0];
    if (!activeEntry) {
      return NextResponse.json(
        { error: 'No active clock-in found for this employee' },
        { status: 400 }
      );
    }

    // Validate clock out time is after clock in
    const clockInTime = new Date(activeEntry.clockIn);
    const now = new Date();

    if (now <= clockInTime) {
      return NextResponse.json(
        { error: 'Clock out time must be after clock in time' },
        { status: 400 }
      );
    }

    // Check for minimum work period (e.g., 1 minute to prevent accidental clicks)
    const minWorkPeriodMs = 1 * 60 * 1000; // 1 minute
    if (now.getTime() - clockInTime.getTime() < minWorkPeriodMs) {
      return NextResponse.json(
        { error: 'Minimum work period of 1 minute required' },
        { status: 400 }
      );
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const timeEntry = await tx.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          clockOut: now,
          isActive: false,
        },
      });

      // Update worker status to clocked out (on break)
      await tx.assignedPersonnel.update({
        where: { id: workerId },
        data: { status: 'ClockedOut' },
      });

      return timeEntry;
    });

    return NextResponse.json({
      success: true,
      message: `${worker.user.name} clocked out successfully (Entry ${activeEntry.entryNumber})`,
      data: {
        timeEntryId: result.id,
        entryNumber: activeEntry.entryNumber,
        clockInTime: result.clockIn,
        clockOutTime: result.clockOut,
        workerName: worker.user.name,
        duration: Math.round((result.clockOut!.getTime() - result.clockIn.getTime()) / (1000 * 60)) // minutes
      }
    });
    } catch (error) {
      console.error('Error clocking out employee:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
}
