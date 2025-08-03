import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTimeEntrySchema = z.object({
  clockIn: z.string().optional(),
  clockOut: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const timeEntryId = params.id;
  const body = await request.json();

  const validation = updateTimeEntrySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  const { clockIn, clockOut } = validation.data;

  if (!clockIn && !clockOut) {
    return NextResponse.json({ error: 'At least one field to update must be provided' }, { status: 400 });
  }

  try {
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    const getUpdatedDate = (newTime: string, existingDate: Date): Date => {
        const [hours, minutes] = newTime.split(':').map(Number);
        const updatedDate = new Date(existingDate);
        updatedDate.setHours(hours, minutes, 0, 0);
        return updatedDate;
    }

    const dataToUpdate: { clockIn?: Date; clockOut?: Date | null } = {};

    if (clockIn) {
        dataToUpdate.clockIn = getUpdatedDate(clockIn, existingEntry.clockIn);
    }

    if (clockOut) {
        if (clockOut === '') {
            dataToUpdate.clockOut = null;
        } else {
            const baseDate = existingEntry.clockOut || existingEntry.clockIn;
            dataToUpdate.clockOut = getUpdatedDate(clockOut, baseDate);
        }
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Failed to update time entry:', error);
    return NextResponse.json({ error: 'Failed to update time entry' }, { status: 500 });
  }
}