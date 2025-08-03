import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WorkerStatus } from '@prisma/client';

export async function GET() {
  try {
    const upForGrabsAssignments = await prisma.assignedPersonnel.findMany({
      where: {
        status: WorkerStatus.UpForGrabs,
      },
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: {
        shift: {
          startTime: 'asc',
        },
      },
    });

    return NextResponse.json(upForGrabsAssignments);
  } catch (error) {
    console.error('Error fetching up-for-grabs shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}