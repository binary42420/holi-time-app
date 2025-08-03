import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get assigned personnel with their time entries
    const shiftId = await params.then(p => p.id);



    // First get the regular assigned personnel
    const result = await prisma.assignedPersonnel.findMany({
      where: { shiftId },
      include: {
        user: true,
        timeEntries: {
          orderBy: { entryNumber: 'asc' },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const crewChiefResult = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignedPersonnel: {
          where: { roleCode: 'CC' },
          include: { user: true },
        },
      },
    });



    const assignedPersonnel = result.map((ap: any) => {
      const timeEntries = ap.timeEntries.map((te: any) => ({ ...te, isActive: te.clockIn != null && te.clockOut == null }));
      let status = 'not_started';
      const hasActiveEntry = timeEntries.some((entry: any) => entry.isActive);
      if (hasActiveEntry) {
        status = 'Clocked In';
      } else if (timeEntries.length > 0) {
        status = 'Clocked Out';
      }
      return {
        id: ap.id,
        employeeId: ap.userId,
        employeeName: ap.user.name,
        employeeAvatar: ap.user.avatarUrl,
        roleOnShift: ap.roleCode, // role_on_shift is not in the schema
        roleCode: ap.roleCode,
        status,
        timeEntries,
      };
    });

    // Add crew chief as a special assignment if one exists and not already in assigned personnel
    if (crewChiefResult?.assignedPersonnel[0]) {
      const crewChief = crewChiefResult.assignedPersonnel[0];
      const existingCrewChief = assignedPersonnel.find((ap: any) => ap.employeeId === crewChief.userId);

      if (!existingCrewChief) {
        try {
          const newAssignment = await prisma.assignedPersonnel.create({
            data: {
              shiftId,
              userId: crewChief.userId,
              roleCode: 'CC',
            },
            include: {
              user: true,
              timeEntries: true,
            },
          });

          const timeEntries = newAssignment.timeEntries.map((te: any) => ({ ...te, isActive: te.clockIn != null && te.clockOut == null }));
          let status = 'Clocked Out';
          if (timeEntries.some((e: any) => e.isActive)) {
            status = 'Clocked In';
          }

          assignedPersonnel.unshift({
            id: newAssignment.id,
            employeeId: newAssignment.userId,
            employeeName: newAssignment.user.name,
            employeeAvatar: newAssignment.user.avatarUrl,
            roleOnShift: 'Crew Chief',
            roleCode: 'CC',
            status,
            timeEntries,
          });
        } catch (error) {
          console.error('Error adding crew chief to assigned personnel:', error);
        }
      }
    }

    console.log('Final assigned personnel response:', assignedPersonnel);

    return NextResponse.json({
      success: true,
      assignedPersonnel,
    });
  } catch (error) {
    console.error('Error getting assigned personnel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
