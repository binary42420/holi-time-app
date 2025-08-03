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

    // Get jobs with their most recent activity (shifts)
    const result = await prisma.job.findMany({
      include: {
        company: true,
        shifts: {
          select: {
            date: true,
            status: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
      take: 100, // Fetch more to sort in-app
    });

    const sortedJobs = result.sort((a, b) => {
      const lastActivityA = a.shifts.length > 0 ? new Date(a.shifts[0].date).getTime() : new Date(a.createdAt).getTime();
      const lastActivityB = b.shifts.length > 0 ? new Date(b.shifts[0].date).getTime() : new Date(b.createdAt).getTime();
      return lastActivityB - lastActivityA;
    });

    const jobs = sortedJobs.slice(0, 50).map(job => {
      const shiftCount = job.shifts.length;
      const upcomingShifts = job.shifts.filter(s => new Date(s.date) >= new Date()).length;
      const activeShifts = job.shifts.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length;
      const lastActivity = job.shifts.length > 0 ? new Date(Math.max(...job.shifts.map(s => new Date(s.date).getTime()))) : job.createdAt;
      
      let status = 'Planning';
      if (shiftCount > 0) {
        if (job.shifts.every(s => s.status === 'Completed')) {
          status = 'Completed';
        } else if (job.shifts.some(s => s.status === 'InProgress' || s.status === 'Pending')) {
          status = 'Active';
        }
      }

      return {
        id: job.id,
        name: job.name,
        description: job.description,
        companyId: job.companyId,
        companyName: job.company.name,
        status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        shiftCount,
        lastActivity,
        upcomingShifts,
        activeShifts,
        lastActivityType: job.shifts.length > 0 ? 'shift' : 'created',
      };
    });

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Error getting recent jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
