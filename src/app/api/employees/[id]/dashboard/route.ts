import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthApi } from '@/lib/auth-api';
import { UserRole } from '@prisma/client';

type RequestContext = {
  params: {
    id: string;
  };
};

async function handler(req: Request, { params }: RequestContext) {
  const { id } = params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  try {
    const upcomingShifts = await prisma.shift.findMany({
      where: {
        assignedPersonnel: {
          some: {
            userId: id,
          },
        },
        status: {
          in: ['Pending', 'Active'],
        },
        date: {
          gte: new Date(), // Only fetch shifts from today onwards
        },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        job: {
          select: {
            id: true,
            name: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 5,
    });

    return NextResponse.json({
      upcomingShifts,
    });
  } catch (error) {
    console.error(`Error fetching employee dashboard data for ${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuthApi(
  handler,
  (role: UserRole) => role === 'Admin' || role === 'Staff' || role === 'CrewChief' || role === 'Employee'
);
