import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params
    const body = await request.json()
    const { employeeId, roleCode, roleOnShift } = body

    console.log('Assignment request:', { shiftId, employeeId, roleCode, roleOnShift })

    if (!employeeId || !roleCode || !roleOnShift) {
      console.error('Missing required fields:', { employeeId, roleCode, roleOnShift })
      return NextResponse.json(
        { error: 'Employee ID, role code, and role on shift are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: employeeId },
    });

    if (!user || !['Staff', 'CrewChief', 'Admin'].includes(user.role)) {
      console.error('Employee user not found for user ID:', employeeId);
      return NextResponse.json(
        { error: 'Employee user not found' },
        { status: 404 }
      );
    }
    const actualEmployeeId = user.id;

    const existingAssignment = await prisma.assignedPersonnel.findFirst({
      where: {
        shiftId,
        userId: actualEmployeeId,
      },
    });

    console.log('Existing assignment check:', existingAssignment);

    if (existingAssignment) {
      console.error('Employee already assigned:', { shiftId, actualEmployeeId })
      return NextResponse.json(
        { error: 'Employee is already assigned to this shift' },
        { status: 400 }
      )
    }

    const shiftCheck = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shiftCheck) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    // CONFLICT CHECKING DISABLED - PROCEEDING WITH ASSIGNMENT
    console.log('Conflict checking disabled - proceeding with assignment');

    const result = await prisma.assignedPersonnel.create({
      data: {
        shiftId,
        userId: actualEmployeeId,
        roleCode,
        isPlaceholder: false,
      },
      select: { id: true },
    });

    const assignmentId = result.id;

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignmentId,
        shiftId,
        employeeId: actualEmployeeId,
        userId: employeeId,
        roleOnShift,
        roleCode,
        status: 'Clocked Out'
      }
    })

  } catch (error) {
    console.error('Error assigning worker to shift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
