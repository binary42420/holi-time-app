import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthApi } from '@/lib/auth-api';
import { TimeEntry, AssignedPersonnel, User, UserRole } from '@prisma/client';

const getWorkerStatus = (timeEntries: TimeEntry[], shiftStatus: string) => {
  if (shiftStatus === 'Completed' || shiftStatus === 'Cancelled') return 'shift_ended';

  const lastEntry = timeEntries.sort((a, b) => b.entryNumber - a.entryNumber)[0];

  if (!lastEntry) return 'not_started';
  if (lastEntry.isActive) return 'Clocked In';
  
  return 'Clocked Out';
};

type RequestContext = {
  params: {
    id: string;
  };
};

type AssignedPersonnelWithDetails = AssignedPersonnel & { user: User, timeEntries: TimeEntry[] };

async function handler(req: Request, { params }: RequestContext) {
  const { id } = params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            company: true,
          },
        },
        assignedPersonnel: {
          include: {
            user: true,
            timeEntries: {
              orderBy: {
                entryNumber: 'asc',
              },
            },
          },
        },
        timesheet: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const assignedPersonnelWithStatus = shift.assignedPersonnel?.map((p: AssignedPersonnelWithDetails) => ({
      ...p,
      status: getWorkerStatus(p.timeEntries, shift.status),
    }));

    return NextResponse.json({ ...shift, assignedPersonnel: assignedPersonnelWithStatus });
  } catch (error) {
    console.error(`Error fetching shift ${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuthApi(
  handler,
  (role: UserRole) => role === 'Admin'
);
