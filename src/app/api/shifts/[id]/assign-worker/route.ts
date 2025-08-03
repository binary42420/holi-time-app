import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/middleware'
import { canCrewChiefManageShift } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: shiftId } = await params

    const hasPermission = await canCrewChiefManageShift(user, shiftId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to assign workers to this shift.' }, { status: 403 });
    }

    const body = await request.json()
    const { userId, roleCode, replaceAssignmentId } = body;

    console.log('assign-worker API called:', { shiftId, userId, roleCode, replaceAssignmentId });

    if (!userId || !roleCode) {
      return NextResponse.json({ error: 'User ID and Role Code are required' }, { status: 400 });
    }

    // Check if user is already assigned to this shift
    const existingAssignment = await prisma.assignedPersonnel.findFirst({
      where: {
        shiftId,
        userId
      }
    });

    if (existingAssignment) {
      return NextResponse.json({ error: 'User is already assigned to this shift' }, { status: 400 });
    }

    // If replaceAssignmentId is provided, replace that assignment
    if (replaceAssignmentId && !replaceAssignmentId.startsWith('placeholder-')) {
      const result = await prisma.$transaction(async (tx) => {
        // Get the existing assignment to check for time entries
        const existingAssignment = await tx.assignedPersonnel.findUnique({
          where: { id: replaceAssignmentId },
          include: { timeEntries: true }
        });

        if (!existingAssignment) {
          throw new Error('Assignment to replace not found');
        }

        // If there are time entries, we can't replace the assignment
        if (existingAssignment.timeEntries.length > 0) {
          throw new Error('Cannot replace assignment with existing time entries');
        }

        // Delete the old assignment
        await tx.assignedPersonnel.delete({
          where: { id: replaceAssignmentId }
        });

        // Create the new assignment
        const newAssignment = await tx.assignedPersonnel.create({
          data: {
            shiftId,
            userId,
            roleCode,
            status: 'Assigned'
          },
          include: {
            user: true,
            timeEntries: true
          },
        });

        return newAssignment;
      });

      console.log('Worker assignment replaced successfully:', result.id);
      return NextResponse.json({ success: true, assignment: result, action: 'replaced' });
    }

    // Create new assignment (original behavior)
    const newAssignment = await prisma.assignedPersonnel.create({
      data: {
        shiftId,
        userId,
        roleCode,
        status: 'Assigned'
      },
      include: {
        user: true,
        timeEntries: true
      },
    });

    console.log('Worker assigned successfully:', newAssignment.id);
    return NextResponse.json({ success: true, assignment: newAssignment, action: 'created' });

  } catch (error) {
    console.error('Error assigning worker to shift:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
