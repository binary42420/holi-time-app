import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

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

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    const where: any = {
      date: {
        gte: new Date(today),
        lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000),
      },
    };

    if (user.role === UserRole.CrewChief) {
      where.assignedPersonnel = {
        some: {
          userId: user.id,
          roleCode: 'CC',
        },
      };
    } else if (user.role === UserRole.Staff || user.role === UserRole.Employee) {
      where.assignedPersonnel = {
        some: {
          userId: user.id,
        },
      };
    } else if (user.role === UserRole.CompanyUser && user.companyId) {
      where.job = {
        companyId: user.companyId,
      };
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        job: {
          select: {
            name: true,
            company: {
              select: { name: true },
            },
          },
        },
        _count: {
          select: {
            assignedPersonnel: {
              where: { isPlaceholder: false },
            },
          },
        },
        assignedPersonnel: {
          where: { roleCode: 'CC' },
          select: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const transformedShifts = shifts.map(shift => ({
        id: shift.id,
        jobId: shift.jobId,
        jobName: shift.job?.name || 'Unknown Job',
        clientName: shift.job?.company?.name || 'Unknown Client',
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.job?.company?.name || 'Unknown Location',
        requestedWorkers: shift.requestedWorkers ?? 1,
        assignedCount: shift._count.assignedPersonnel,
        crewChiefId: shift.assignedPersonnel[0]?.user?.id,
        crewChiefName: shift.assignedPersonnel[0]?.user?.name || '',
        status: shift.status || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      shifts: transformedShifts,
    });

  } catch (error) {
    console.error('Error getting today\'s shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
