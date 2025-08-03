import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params
    const body = await request.json()
    const { employeeId } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get the current shift's date and time
    const currentShiftResult = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { date: true, startTime: true, endTime: true },
    });

    if (!currentShiftResult) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const currentShift = currentShiftResult;
    const shiftDate = currentShift.date
    const startTime = currentShift.start_time
    const endTime = currentShift.end_time

    // Check for conflicting assignments on the same date (simplified - no client info needed)
    const conflictResult = await prisma.assignedPersonnel.findMany({
      where: {
        userId: employeeId,
        shift: {
          date: shiftDate,
          id: { not: shiftId },
          OR: [
            {
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
            {
              startTime: { gte: startTime, lt: endTime },
            },
            {
              endTime: { gt: startTime, lte: endTime },
            },
          ],
        },
      },
      include: {
        shift: true,
      },
    });

    const conflicts = conflictResult.map(conflict => ({
      shiftId: conflict.shift.id,
      startTime: conflict.shift.startTime,
      endTime: conflict.shift.endTime,
      roleOnShift: conflict.roleCode,
    }));

    return NextResponse.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts
    })

  } catch (error) {
    console.error('Error checking time conflicts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
