import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let jobsQuery: any = {
      include: {
        company: {
          select: {
            id: true,
            name: true,
            company_logo_url: true,
          },
        },
        shifts: {
          include: {
            assignedPersonnel: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    };

    // Role-based filtering for jobs
    if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
      // Admin: 3 jobs with most recent shift activity (regardless of personal assignment)
      // No additional filtering needed - they can see all jobs
    } else if (user.role === UserRole.CrewChief || user.role === UserRole.Employee) {
      // Crew Chief/Employee: 3 jobs with most recent shift activity where they had any worker assignment
      jobsQuery.where = {
        shifts: {
          some: {
            assignedPersonnel: {
              some: {
                userId: user.id,
              },
            },
          },
        },
      };
    } else if (user.role === UserRole.CompanyUser) {
      // Company users see only their company's jobs
      if (!user.companyId) {
        return NextResponse.json({ success: true, jobs: [] });
      }
      jobsQuery.where = {
        companyId: user.companyId,
      };
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const jobs = await prisma.job.findMany(jobsQuery);

    // Sort jobs by most recent shift activity and take top 3
    const jobsWithActivity = jobs.map(job => {
      const mostRecentShift = job.shifts.length > 0 ? job.shifts[0] : null;
      const lastActivity = mostRecentShift 
        ? new Date(mostRecentShift.date).getTime()
        : new Date(job.createdAt).getTime();

      // Calculate job statistics
      const totalShifts = job.shifts.length;
      const completedShifts = job.shifts.filter(s => s.status === 'Completed').length;
      const activeShifts = job.shifts.filter(s => 
        s.status === 'Active' || s.status === 'InProgress'
      ).length;
      const upcomingShifts = job.shifts.filter(s => 
        new Date(s.date) > new Date() && s.status === 'Pending'
      ).length;

      // Get unique workers assigned to this job
      const uniqueWorkers = new Set();
      job.shifts.forEach(shift => {
        shift.assignedPersonnel.forEach(ap => {
          uniqueWorkers.add(ap.userId);
        });
      });

      // Determine job status based on shifts
      let jobStatus = 'Planning';
      if (totalShifts > 0) {
        if (activeShifts > 0) {
          jobStatus = 'Active';
        } else if (completedShifts === totalShifts) {
          jobStatus = 'Completed';
        } else if (upcomingShifts > 0) {
          jobStatus = 'Scheduled';
        }
      }

      return {
        id: job.id,
        name: job.name,
        description: job.description,
        location: job.location,
        status: jobStatus,
        company: job.company,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        lastActivity,
        mostRecentShift,
        stats: {
          totalShifts,
          completedShifts,
          activeShifts,
          upcomingShifts,
          uniqueWorkers: uniqueWorkers.size,
        },
        recentShifts: job.shifts.slice(0, 3), // Include 3 most recent shifts
      };
    });

    // Sort by last activity (most recent first) and take top 3
    const recentJobs = jobsWithActivity
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      jobs: recentJobs,
      meta: {
        total: recentJobs.length,
        userRole: user.role,
        hasPersonalAssignments: user.role === UserRole.CrewChief || user.role === UserRole.Employee,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard jobs:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}