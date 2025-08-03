import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: shiftId, assignmentId } = await params

    console.log(`End shift request:`, { shiftId, assignmentId })



    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        assignedPersonnelId: assignmentId,
        clockOut: null,
      },
      orderBy: { entryNumber: 'desc' },
    });

    if (activeEntry) {
      await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: { clockOut: new Date(), isActive: false },
      });
    }

    await prisma.assignedPersonnel.update({
      where: { id: assignmentId },
      data: { status: 'Shift Ended' }, // This status is not in the schema
    });

    return NextResponse.json({
      success: true,
      message: 'Shift ended successfully'
    })

  } catch (error) {
    console.error('Error ending shift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
