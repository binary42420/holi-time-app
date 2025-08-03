import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// POST /api/admin/fix-seed-data - Fix seed data issues
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('🔧 Starting seed data fix...');

    const results = {
      wrAssignmentsFound: 0,
      wrAssignmentsConverted: 0,
      shiftsUpdated: 0,
      crewChiefsCreated: 0,
      errors: [] as string[]
    };

    await prisma.$transaction(async (tx) => {
      // Step 1: Find WR assignments
      const wrAssignments = await tx.assignedPersonnel.findMany({
        where: { roleCode: 'WR' },
        include: {
          shift: {
            select: { id: true, date: true }
          },
          user: {
            select: { name: true }
          }
        }
      });

      results.wrAssignmentsFound = wrAssignments.length;
      console.log(`Found ${wrAssignments.length} WR assignments to convert`);

      if (wrAssignments.length > 0) {
        // Step 2: Convert WR to SH
        const updateResult = await tx.assignedPersonnel.updateMany({
          where: { roleCode: 'WR' },
          data: { roleCode: 'SH' }
        });

        results.wrAssignmentsConverted = updateResult.count;
        console.log(`Converted ${updateResult.count} WR assignments to SH`);

        // Step 3: Update shift requirements
        // Group WR assignments by shift
        const shiftCounts = new Map<string, number>();
        wrAssignments.forEach(assignment => {
          const count = shiftCounts.get(assignment.shiftId) || 0;
          shiftCounts.set(assignment.shiftId, count + 1);
        });

        // Update each affected shift
        for (const [shiftId, wrCount] of shiftCounts) {
          const shift = await tx.shift.findUnique({
            where: { id: shiftId },
            select: { requiredStagehands: true }
          });

          if (shift) {
            await tx.shift.update({
              where: { id: shiftId },
              data: {
                requiredStagehands: (shift.requiredStagehands || 0) + wrCount
              }
            });
            results.shiftsUpdated++;
          }
        }
      }

      // Step 4: Ensure all shifts have at least 1 crew chief required
      await tx.shift.updateMany({
        where: {
          OR: [
            { requiredCrewChiefs: null },
            { requiredCrewChiefs: { lt: 1 } }
          ]
        },
        data: { requiredCrewChiefs: 1 }
      });

      // Step 5: Find shifts without crew chief assignments
      const shiftsWithoutCC = await tx.shift.findMany({
        where: {
          assignedPersonnel: {
            none: { roleCode: 'CC' }
          }
        },
        select: { id: true }
      });

      if (shiftsWithoutCC.length > 0) {
        // Find an available crew chief
        const availableCrewChief = await tx.user.findFirst({
          where: {
            role: { in: ['Admin', 'CrewChief'] }
          },
          select: { id: true, name: true }
        });

        if (availableCrewChief) {
          // Create crew chief assignments for shifts that don't have them
          const crewChiefAssignments = shiftsWithoutCC.map(shift => ({
            shiftId: shift.id,
            userId: availableCrewChief.id,
            roleCode: 'CC',
            status: 'Assigned'
          }));

          const createResult = await tx.assignedPersonnel.createMany({
            data: crewChiefAssignments,
            skipDuplicates: true
          });

          results.crewChiefsCreated = createResult.count;
          console.log(`Created ${createResult.count} crew chief assignments`);
        }
      }
    });

    // Verification
    const verification = {
      remainingWR: await prisma.assignedPersonnel.count({
        where: { roleCode: 'WR' }
      }),
      totalSH: await prisma.assignedPersonnel.count({
        where: { roleCode: 'SH' }
      }),
      shiftsWithoutCC: await prisma.shift.count({
        where: {
          assignedPersonnel: {
            none: { roleCode: 'CC' }
          }
        }
      })
    };

    return NextResponse.json({
      success: true,
      message: 'Seed data fixed successfully',
      results,
      verification
    });

  } catch (error) {
    console.error('Seed data fix error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fix seed data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/fix-seed-data - Preview what needs to be fixed
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const issues = {
      wrAssignments: await prisma.assignedPersonnel.count({
        where: { roleCode: 'WR' }
      }),
      shiftsWithoutCC: await prisma.shift.count({
        where: {
          assignedPersonnel: {
            none: { roleCode: 'CC' }
          }
        }
      }),
      shiftsWithLowCCRequirement: await prisma.shift.count({
        where: {
          OR: [
            { requiredCrewChiefs: null },
            { requiredCrewChiefs: { lt: 1 } }
          ]
        }
      })
    };

    const sampleWRAssignments = await prisma.assignedPersonnel.findMany({
      where: { roleCode: 'WR' },
      include: {
        user: { select: { name: true } },
        shift: {
          select: {
            date: true,
            job: {
              select: {
                name: true,
                company: { select: { name: true } }
              }
            }
          }
        }
      },
      take: 5
    });

    return NextResponse.json({
      success: true,
      issues,
      sampleWRAssignments: sampleWRAssignments.map(assignment => ({
        id: assignment.id,
        workerName: assignment.user.name,
        shiftDate: assignment.shift.date,
        jobName: assignment.shift.job.name,
        companyName: assignment.shift.job.company.name,
        currentRole: assignment.roleCode
      })),
      needsFix: issues.wrAssignments > 0 || issues.shiftsWithoutCC > 0 || issues.shiftsWithLowCCRequirement > 0
    });

  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      {
        error: 'Failed to preview seed data issues',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
