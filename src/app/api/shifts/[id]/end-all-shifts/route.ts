import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params

    console.log(`End all shifts request:`, { shiftId })

    // Get all assigned personnel for this shift
    const assignedPersonnelResult = await prisma.assignedPersonnel.findMany({
      where: {
        shiftId,
        NOT: {
          status: 'Shift Ended', // This status is not in the schema
        },
      },
      select: { id: true, status: true },
    });

    if (assignedPersonnelResult.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active workers to end shifts for',
      });
    }

    for (const personnel of assignedPersonnelResult) {
      await prisma.timeEntry.updateMany({
        where: {
          assignedPersonnelId: personnel.id,
          clockOut: null,
        },
        data: {
          clockOut: new Date(),
          isActive: false,
        },
      });

      await prisma.assignedPersonnel.update({
        where: { id: personnel.id },
        data: { status: 'Shift Ended' }, // This status is not in the schema
      });
    }

    return NextResponse.json({
      success: true,
      message: `Ended shifts for ${assignedPersonnelResult.length} workers`,
    });

  } catch (error) {
    console.error('Error ending all shifts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
