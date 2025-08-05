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
    return NextResponse.json({ error: 'Crew Chief ID is required' }, { status: 400 });
  }

  try {
    const activeShifts = await prisma.shift.findMany({
      where: {
        assignedPersonnel: {
          some: {
            userId: id,
            roleCode: 'CC',
          },
        },
        status: {
          in: ['InProgress', 'Active', 'Pending'],
        },
      },
      include: {
        job: {
          include: {
            company: true,
          },
        },
        assignedPersonnel: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarData: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json({
      activeShifts,
    });
  } catch (error) {
    console.error(`Error fetching crew chief dashboard data for ${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuthApi(
  handler,
  (role: UserRole) => role === 'Admin' || role === 'CrewChief'
);
