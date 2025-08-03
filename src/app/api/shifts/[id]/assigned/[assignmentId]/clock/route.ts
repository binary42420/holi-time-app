import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: shiftId, assignmentId } = await params
    const body = await request.json()
    const { action } = body

    console.log(`Clock ${action} request - FIXED:`, { shiftId, assignmentId, action })

    if (!action || !['clock_in', 'clock_out'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be clock_in or clock_out' },
        { status: 400 }
      )
    }



    if (action === 'clock_in') {
      const result = await prisma.timeEntry.create({
        data: {
          assignedPersonnelId: assignmentId,
          clockIn: new Date(),
        },
      });

      await prisma.assignedPersonnel.update({
        where: { id: assignmentId },
        data: { status: 'ClockedIn' },
      });

      return NextResponse.json({ success: true, timeEntry: result });
    } else if (action === 'clock_out') {
      const activeEntry = await prisma.timeEntry.findFirst({
        where: {
          assignedPersonnelId: assignmentId,
          clockOut: null,
        },
        orderBy: { clockIn: 'desc' },
      });

      if (!activeEntry) {
        return NextResponse.json(
          { error: 'No active time entry found to clock out' },
          { status: 400 }
        )
      }

      const result = await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: { clockOut: new Date() },
      });

      await prisma.assignedPersonnel.update({
        where: { id: assignmentId },
        data: { status: 'ClockedOut' },
      });

      return NextResponse.json({ success: true, timeEntry: result });
    }

  } catch (error) {
    console.error('Error processing clock action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
