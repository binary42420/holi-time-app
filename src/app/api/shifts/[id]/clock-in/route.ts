import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { canCrewChiefManageShift } from '@/lib/auth';

const clockInSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  entryNumber: z.number().int().min(1).max(3).optional().default(1),
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
      return NextResponse.json({ error: 'You do not have permission to clock in workers for this shift.' }, { status: 403 });
    }
    const body = await request.json();

    // Validate request body
    const validation = clockInSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { workerId, entryNumber } = validation.data;

    // Get the assigned personnel record with existing time entries and shift info
    const assignedPersonnelResult = await prisma.assignedPersonnel.findUnique({
      where: { id: workerId },
      include: {
        timeEntries: {
          orderBy: { entryNumber: 'desc' }
        },
        user: {
          select: { id: true, name: true }
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            date: true,
            status: true
          }
        }
      },
    });

    if (!assignedPersonnelResult) {
      return NextResponse.json(
        { error: 'Worker not found on this shift' },
        { status: 404 }
      );
    }

    const assignedPersonnel = assignedPersonnelResult;

    // Check if worker is marked as no show or shift ended
    if (assignedPersonnel.status === 'NoShow') {
      return NextResponse.json(
        { error: 'Cannot clock in a worker marked as no show' },
        { status: 400 }
      );
    }

    if (assignedPersonnel.status === 'ShiftEnded') {
      return NextResponse.json(
        { error: 'Cannot clock in - worker shift has already ended' },
        { status: 400 }
      );
    }

    // Check if there's already an active entry
    const activeEntry = assignedPersonnel.timeEntries.find(entry => entry.isActive);
    if (activeEntry) {
      return NextResponse.json(
        { error: 'Employee is already clocked in' },
        { status: 400 }
      );
    }

    // Check for maximum entries (3)
    if (assignedPersonnel.timeEntries.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum time entries (3) reached for this shift' },
        { status: 400 }
      );
    }

    // NOTE: Time validation is DISABLED - workers can clock in at any time
    // This allows for early arrivals, late starts, emergency coverage, etc.
    // No validation against shift.startTime or shift.endTime is performed

    // Determine the entry number to use
    const finalEntryNumber = entryNumber || (assignedPersonnel.timeEntries.length + 1);

    // Check if the specified entry number already exists
    const existingEntry = assignedPersonnel.timeEntries.find(entry => entry.entryNumber === finalEntryNumber);
    if (existingEntry) {
      return NextResponse.json(
        { error: `Entry number ${finalEntryNumber} already exists for this worker` },
        { status: 400 }
      );
    }

    // Use transaction for atomicity
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const timeEntry = await tx.timeEntry.create({
        data: {
          assignedPersonnelId: workerId,
          entryNumber: finalEntryNumber,
          clockIn: now,
          isActive: true,
        },
      });

      await tx.assignedPersonnel.update({
        where: { id: workerId },
        data: { status: 'ClockedIn' },
      });

      return timeEntry;
    });

    return NextResponse.json({
      success: true,
      message: `${assignedPersonnel.user.name} clocked in successfully (Entry ${finalEntryNumber})`,
      data: {
        timeEntryId: result.id,
        entryNumber: finalEntryNumber,
        clockInTime: result.clockIn,
        workerName: assignedPersonnel.user.name
      }
    });
  } catch (error) {
    console.error('Error clocking in employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
