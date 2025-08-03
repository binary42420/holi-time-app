import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { UserRole } from '@prisma/client';
import { canCrewChiefManageShift } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: shiftId } = params;

    const hasPermission = await canCrewChiefManageShift(user, shiftId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to end this shift.' }, { status: 403 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: 'Completed',
        endTime: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shift ended successfully',
    });
  } catch (error) {
    console.error('Error ending employee shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
