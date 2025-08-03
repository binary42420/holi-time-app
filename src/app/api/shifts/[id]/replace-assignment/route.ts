import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/middleware'
import { canCrewChiefManageShift } from '@/lib/auth'

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

    const { id: shiftId } = await params

    const hasPermission = await canCrewChiefManageShift(user, shiftId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to replace workers on this shift.' }, { status: 403 });
    }
    
    const body = await request.json()
    const { assignmentId, newUserId, roleCode } = body

    console.log('Replace assignment request:', { shiftId, assignmentId, newUserId, roleCode })

    if (!assignmentId || !newUserId || !roleCode) {
      return NextResponse.json(
        { error: 'Assignment ID, new user ID, and role code are required' },
        { status: 400 }
      )
    }

    // Check if the new user is already assigned to this shift
    const existingAssignment = await prisma.assignedPersonnel.findFirst({
      where: {
        shiftId,
        userId: newUserId
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this shift' },
        { status: 400 }
      );
    }

    // Check if this is a placeholder assignment (client-side generated)
    if (assignmentId.startsWith('placeholder-')) {
      // For placeholder assignments, just create a new assignment
      const newAssignment = await prisma.assignedPersonnel.create({
        data: {
          shiftId,
          userId: newUserId,
          roleCode,
          status: 'Assigned'
        },
        include: {
          user: true,
          timeEntries: true
        },
      });

      console.log('Created new assignment for placeholder:', newAssignment.id);
      return NextResponse.json({ 
        success: true, 
        assignment: newAssignment,
        action: 'created'
      });
    }

    // For real assignments, replace the existing one
    const result = await prisma.$transaction(async (tx) => {
      // Get the existing assignment to preserve any time entries
      const existingAssignment = await tx.assignedPersonnel.findUnique({
        where: { id: assignmentId },
        include: { timeEntries: true }
      });

      if (!existingAssignment) {
        throw new Error('Assignment not found');
      }

      // If there are time entries, we can't replace the assignment
      if (existingAssignment.timeEntries.length > 0) {
        throw new Error('Cannot replace assignment with existing time entries');
      }

      // Delete the old assignment
      await tx.assignedPersonnel.delete({
        where: { id: assignmentId }
      });

      // Create the new assignment
      const newAssignment = await tx.assignedPersonnel.create({
        data: {
          shiftId,
          userId: newUserId,
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

    console.log('Replaced assignment successfully:', result.id);
    return NextResponse.json({ 
      success: true, 
      assignment: result,
      action: 'replaced'
    });

  } catch (error) {
    console.error('Error replacing assignment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
