import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { WorkerStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const shiftId = params.id;
    const { assignmentId } = await request.json();

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const assignmentToClaim = await prisma.assignedPersonnel.findFirst({
      where: {
        id: assignmentId,
        shiftId,
        status: WorkerStatus.UpForGrabs,
      },
    });

    if (!assignmentToClaim) {
      return NextResponse.json({ error: 'This shift is no longer available' }, { status: 404 });
    }

    // Check if user is already assigned to this shift in another role
    const existingAssignment = await prisma.assignedPersonnel.findFirst({
      where: {
        shiftId,
        userId: user.id,
      },
    });

    if (existingAssignment) {
      return NextResponse.json({ error: 'You are already assigned to this shift' }, { status: 400 });
    }

    // Assign the user to the shift
    const updatedAssignment = await prisma.assignedPersonnel.update({
      where: { id: assignmentToClaim.id },
      data: {
        userId: user.id,
        status: WorkerStatus.Assigned,
      },
    });

    return NextResponse.json(updatedAssignment);

  } catch (error) {
    console.error('Error claiming shift:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}