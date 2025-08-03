import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';

async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
            job: {
              select: {
                name: true,
                company: {
                  select: {
                    name: true
                  }
                }
              }
            },
            assignedPersonnel: {
              select: {
                id: true,
                roleCode: true,
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                timeEntries: {
                  select: {
                    id: true,
                    clockIn: true,
                    clockOut: true,
                    breakStart: true,
                    breakEnd: true,
                    entryNumber: true,
                    notes: true
                  },
                  orderBy: {
                    entryNumber: 'asc'
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions
    const canView = await checkViewPermissions(user, timesheet);
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json(timesheet);

  } catch (error) {
    console.error('Error getting timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timesheet' },
      { status: 500 }
    );
  }
}

async function checkViewPermissions(user: any, timesheet: any) {
  const isAdmin = user.role === 'Admin';
  const isCompanyUser = user.role === 'CompanyUser' && user.companyId === timesheet.shift?.job?.companyId;
  const isAssignedCrewChief = user.role === 'CrewChief' && timesheet.shift?.assignedPersonnel.some(p => p.userId === user.id && p.roleCode === 'CC');
  
  return isAdmin || isCompanyUser || isAssignedCrewChief;
}
