import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: shiftId, assignmentId } = await params

    console.log(`DEBUG: Unassigning worker - shiftId: ${shiftId}, assignmentId: ${assignmentId} - NEW VERSION`)

    // Check if this is a placeholder assignment (client-side generated)
    if (assignmentId.startsWith('placeholder-')) {
      console.log('DEBUG: Attempting to delete placeholder assignment, returning success')
      return NextResponse.json({
        success: true,
        message: 'Placeholder assignment cannot be deleted'
      })
    }

    // First, let's see all assignments for this shift before deletion
    const allAssignments = await prisma.assignedPersonnel.findMany({
      where: { shiftId },
      select: { id: true, userId: true, roleCode: true },
    })
    console.log('DEBUG: All assignments before deletion:', allAssignments)

    // Check if the assignment exists and belongs to the shift
    const assignmentCheck = await prisma.assignedPersonnel.findFirst({
      where: {
        id: assignmentId,
        shiftId,
      },
    })

    console.log('DEBUG: Assignment check result:', assignmentCheck)

    if (!assignmentCheck) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check if there are any time entries for this assignment
    const timeEntriesCheck = await prisma.timeEntry.count({
      where: { assignedPersonnelId: assignmentId },
    })

    const hasTimeEntries = timeEntriesCheck > 0
    console.log(`DEBUG: Has time entries: ${hasTimeEntries}`)

    if (hasTimeEntries) {
      // Check if the worker is currently clocked in
      const activeTimeEntry = await prisma.timeEntry.findFirst({
        where: {
          assignedPersonnelId: assignmentId,
          isActive: true,
        },
      })

      if (activeTimeEntry) {
        return NextResponse.json(
          { error: 'Cannot unassign worker who is currently clocked in. Please clock them out first.' },
          { status: 400 }
        )
      }

      // If they have time entries but are not currently clocked in, allow unassignment
      // but warn that time entries will be preserved
      console.log(`DEBUG: Worker has time entries but is not currently clocked in. Allowing unassignment.`)
    }

    const deleteResult = await prisma.assignedPersonnel.delete({
      where: { id: assignmentId },
    });

    console.log(`DEBUG: Delete result - rows affected: ${deleteResult ? 1 : 0}`);

    const allAssignmentsAfter = await prisma.assignedPersonnel.findMany({
      where: { shiftId },
      select: { id: true, userId: true, roleCode: true },
    });
    console.log('DEBUG: All assignments after deletion:', allAssignmentsAfter);

    return NextResponse.json({
      success: true,
      message: 'Worker unassigned successfully'
    })

  } catch (error) {
    console.error('Error unassigning worker from shift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
