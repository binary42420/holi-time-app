import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { UserRole, TimesheetStatus } from '@prisma/client';

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

    let where: any = {};
    const now = new Date();
    const past72Hours = new Date(now.getTime() - (72 * 60 * 60 * 1000));

    // Role-based filtering for timesheets
    if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
      // Admin Dashboard: All pending timesheets + completed timesheets from past 72 hours
      where = {
        OR: [
          {
            status: {
              in: [TimesheetStatus.PENDING_COMPANY_APPROVAL, TimesheetStatus.PENDING_MANAGER_APPROVAL]
            }
          },
          {
            status: TimesheetStatus.COMPLETED,
            updatedAt: {
              gte: past72Hours
            }
          }
        ]
      };
    } else if (user.role === UserRole.CrewChief) {
      // Crew Chief Dashboard: Only pending timesheets for shifts where they were assigned as crew chief
      where = {
        status: {
          in: [TimesheetStatus.PENDING_COMPANY_APPROVAL, TimesheetStatus.PENDING_MANAGER_APPROVAL]
        },
        shift: {
          assignedPersonnel: {
            some: {
              userId: user.id,
              roleCode: 'CC' // Crew Chief role code
            }
          }
        }
      };
    } else if (user.role === UserRole.Employee) {
      // Employee Dashboard: No timesheet section - return empty array
      return NextResponse.json({
        success: true,
        timesheets: [],
        message: 'Employees do not have access to timesheet management'
      });
    } else if (user.role === UserRole.CompanyUser) {
      // Company users see pending timesheets for their company
      if (!user.companyId) {
        return NextResponse.json({ success: true, timesheets: [] });
      }
      where = {
        status: {
          in: [TimesheetStatus.PENDING_COMPANY_APPROVAL, TimesheetStatus.PENDING_MANAGER_APPROVAL]
        },
        shift: {
          job: {
            companyId: user.companyId
          }
        }
      };
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                    company_logo_url: true,
                  },
                },
              },
            },
            assignedPersonnel: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    // Explicitly exclude avatarData and other large fields
                  },
                },
              },
            },
          },
        },
        entries: true,
      },
      orderBy: [
        {
          status: 'asc', // Pending first
        },
        {
          submittedAt: 'desc', // Most recent submissions first
        },
        {
          createdAt: 'desc', // Fallback to creation date
        },
      ],
    });

    // Add permission flags for each timesheet
    const timesheetsWithPermissions = timesheets.map(timesheet => {
      const isFinalized = timesheet.status === TimesheetStatus.COMPLETED;
      const isCrewChiefForShift = timesheet.shift.assignedPersonnel.some(
        ap => ap.userId === user.id && ap.roleCode === 'CC'
      );
      
      let canModify = false;
      let canApprove = false;
      
      if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
        canModify = true;
        canApprove = true;
      } else if (user.role === UserRole.CrewChief && isCrewChiefForShift && !isFinalized) {
        canModify = true;
        canApprove = false; // Crew chiefs can modify but not approve
      } else if (user.role === UserRole.CompanyUser && !isFinalized) {
        canModify = false;
        canApprove = timesheet.status === TimesheetStatus.PENDING_COMPANY_APPROVAL;
      }

      return {
        ...timesheet,
        permissions: {
          canModify,
          canApprove,
          canView: true,
          isFinalized,
          userRole: user.role,
          isCrewChiefForShift,
        },
      };
    });

    return NextResponse.json({
      success: true,
      timesheets: timesheetsWithPermissions,
      meta: {
        total: timesheetsWithPermissions.length,
        pending: timesheetsWithPermissions.filter(t => 
          t.status === TimesheetStatus.PENDING_COMPANY_APPROVAL || 
          t.status === TimesheetStatus.PENDING_MANAGER_APPROVAL
        ).length,
        completed: timesheetsWithPermissions.filter(t => 
          t.status === TimesheetStatus.COMPLETED
        ).length,
        userRole: user.role,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard timesheets:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}