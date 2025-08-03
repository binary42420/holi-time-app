import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let where = {};

    // Filter based on user role
    if (user.role === 'CompanyUser') {
      where = {
        status: 'Submitted',
        shift: { job: { companyId: user.companyId } },
      };
    } else if (user.role === 'Admin') {
      where = {
        status: { in: ['Submitted', 'Approved'] },
      };
    } else {
      return NextResponse.json({ timesheets: [] });
    }

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        shift: {
          include: {
            job: { include: { company: true } },
            _count: { select: { assignedPersonnel: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      timesheets: timesheets.map((t: any) => ({
        id: t.id,
        status: t.status,
        submittedAt: t.createdAt,
        companyApprovedAt: t.companyApprovedAt,
        managerApprovedAt: t.managerApprovedAt,
        shiftId: t.shiftId,
        shiftDate: t.shift.date,
        location: t.shift.location,
        jobName: t.shift.job.name,
        companyName: t.shift.job.company.name,
        workerCount: t.shift._count.assignedPersonnel,
      })),
    });
  } catch (error) {
    console.error('Error getting pending timesheets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
