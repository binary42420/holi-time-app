import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { TimesheetStatus, UserRole } from '@prisma/client';
import { canCrewChiefManageShift } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = params
    const { notes } = await req.json()

    const timesheet = await prisma.timesheet.findUnique({ where: { id } });

    if (!timesheet) {
      return new NextResponse("Timesheet not found", { status: 404 })
    }
    
    const hasPermission = await canCrewChiefManageShift(user, timesheet.shiftId);
    if (!hasPermission) {
        return new NextResponse("Insufficient permissions", { status: 403 });
    }

    if (timesheet.status !== 'PENDING_MANAGER_APPROVAL') {
      return new NextResponse("Timesheet is not awaiting final approval", { status: 400 })
    }

    const updatedTimesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        manager_approved_at: new Date(),
        manager_notes: notes || null,
        managerApprovedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet,
      message: 'Timesheet has been approved successfully.'
    })
  } catch (error) {
    console.error("[TIMESHEET_FINALIZE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
