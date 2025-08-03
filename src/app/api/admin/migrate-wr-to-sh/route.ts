import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// POST /api/admin/migrate-wr-to-sh - Migrate WR roles to SH and update requirements
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('🔍 Starting WR → SH migration...');

    // Step 1: Find all assigned personnel with WR role
    const wrAssignments = await prisma.assignedPersonnel.findMany({
      where: {
        roleCode: 'WR'
      },
      include: {
        shift: {
          select: {
            id: true,
            date: true,
            requiredStagehands: true,
            job: {
              select: {
                name: true,
                company: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (wrAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No WR assignments found. Migration not needed.',
        data: {
          personnelUpdated: 0,
          shiftsUpdated: 0,
          wrAssignments: []
        }
      });
    }

    // Group by shift to calculate new requirements
    const shiftCounts = new Map<string, {
      shiftId: string;
      wrCount: number;
      currentShCount: number;
      newShCount: number;
      shiftInfo: any;
    }>();
    
    wrAssignments.forEach(assignment => {
      const shiftId = assignment.shift.id;
      if (!shiftCounts.has(shiftId)) {
        shiftCounts.set(shiftId, {
          shiftId,
          wrCount: 0,
          currentShCount: assignment.shift.requiredStagehands,
          newShCount: assignment.shift.requiredStagehands,
          shiftInfo: assignment.shift
        });
      }
      const count = shiftCounts.get(shiftId)!;
      count.wrCount++;
      count.newShCount = count.currentShCount + count.wrCount;
    });

    // Execute the migration in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const results = {
        personnelUpdated: 0,
        shiftsUpdated: 0,
        errors: [] as string[]
      };

      // Step 1: Update all WR assignments to SH
      try {
        const personnelUpdateResult = await tx.assignedPersonnel.updateMany({
          where: {
            roleCode: 'WR'
          },
          data: {
            roleCode: 'SH'
          }
        });
        
        results.personnelUpdated = personnelUpdateResult.count;
        console.log(`✅ Updated ${results.personnelUpdated} personnel assignments`);
      } catch (error) {
        const errorMsg = `Failed to update personnel: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }

      // Step 2: Update shift requirements
      for (const [shiftId, counts] of shiftCounts) {
        try {
          await tx.shift.update({
            where: { id: shiftId },
            data: {
              requiredStagehands: counts.newShCount
            }
          });
          
          results.shiftsUpdated++;
          console.log(`✅ Updated shift ${shiftId}: SH required ${counts.currentShCount} → ${counts.newShCount}`);
        } catch (error) {
          const errorMsg = `Failed to update shift ${shiftId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      return results;
    });

    // Verification
    const remainingWR = await prisma.assignedPersonnel.count({
      where: { roleCode: 'WR' }
    });

    // Prepare response data
    const migrationSummary = Array.from(shiftCounts.values()).map(counts => ({
      shiftId: counts.shiftId,
      date: counts.shiftInfo.date,
      jobName: counts.shiftInfo.job.name,
      companyName: counts.shiftInfo.job.company.name,
      wrCount: counts.wrCount,
      previousShRequired: counts.currentShCount,
      newShRequired: counts.newShCount
    }));

    const personnelSummary = wrAssignments.map(assignment => ({
      userId: assignment.userId,
      userName: assignment.user.name,
      shiftId: assignment.shiftId,
      shiftDate: assignment.shift.date,
      jobName: assignment.shift.job.name,
      oldRole: 'WR',
      newRole: 'SH'
    }));

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${result.personnelUpdated} WR assignments to SH and updated ${result.shiftsUpdated} shift requirements`,
      data: {
        personnelUpdated: result.personnelUpdated,
        shiftsUpdated: result.shiftsUpdated,
        remainingWRAssignments: remainingWR,
        errors: result.errors,
        migrationSummary,
        personnelSummary
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/migrate-wr-to-sh - Preview what would be migrated
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Find all assigned personnel with WR role
    const wrAssignments = await prisma.assignedPersonnel.findMany({
      where: {
        roleCode: 'WR'
      },
      include: {
        shift: {
          select: {
            id: true,
            date: true,
            requiredStagehands: true,
            job: {
              select: {
                name: true,
                company: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (wrAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No WR assignments found',
        data: {
          wrAssignments: [],
          affectedShifts: [],
          totalPersonnelToUpdate: 0,
          totalShiftsToUpdate: 0
        }
      });
    }

    // Group by shift
    const shiftCounts = new Map<string, {
      shiftId: string;
      wrCount: number;
      currentShCount: number;
      newShCount: number;
      shiftInfo: any;
    }>();
    
    wrAssignments.forEach(assignment => {
      const shiftId = assignment.shift.id;
      if (!shiftCounts.has(shiftId)) {
        shiftCounts.set(shiftId, {
          shiftId,
          wrCount: 0,
          currentShCount: assignment.shift.requiredStagehands,
          newShCount: assignment.shift.requiredStagehands,
          shiftInfo: assignment.shift
        });
      }
      const count = shiftCounts.get(shiftId)!;
      count.wrCount++;
      count.newShCount = count.currentShCount + count.wrCount;
    });

    const preview = {
      wrAssignments: wrAssignments.map(assignment => ({
        userId: assignment.userId,
        userName: assignment.user.name,
        shiftId: assignment.shiftId,
        shiftDate: assignment.shift.date,
        jobName: assignment.shift.job.name,
        companyName: assignment.shift.job.company.name,
        currentRole: 'WR',
        newRole: 'SH'
      })),
      affectedShifts: Array.from(shiftCounts.values()).map(counts => ({
        shiftId: counts.shiftId,
        date: counts.shiftInfo.date,
        jobName: counts.shiftInfo.job.name,
        companyName: counts.shiftInfo.job.company.name,
        wrCount: counts.wrCount,
        currentShRequired: counts.currentShCount,
        newShRequired: counts.newShCount
      })),
      totalPersonnelToUpdate: wrAssignments.length,
      totalShiftsToUpdate: shiftCounts.size
    };

    return NextResponse.json({
      success: true,
      message: `Found ${wrAssignments.length} WR assignments across ${shiftCounts.size} shifts`,
      data: preview
    });

  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      {
        error: 'Failed to preview migration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
