/**
 * Migration script to convert WR (non-existent role) to SH (Stage Hand)
 * and update the requiredStagehands count for affected shifts
 */

import { prisma } from '../src/lib/prisma';

interface ShiftWorkerCount {
  shiftId: string;
  wrCount: number;
  currentShCount: number;
  newShCount: number;
}

async function migrateWRToSH() {
  console.log('🔍 Starting migration: WR → SH');
  console.log('=====================================');

  try {
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
      console.log('✅ No WR assignments found. Migration not needed.');
      return;
    }

    console.log(`📊 Found ${wrAssignments.length} WR assignments to migrate:`);
    
    // Group by shift to calculate new requirements
    const shiftCounts = new Map<string, ShiftWorkerCount>();
    
    wrAssignments.forEach(assignment => {
      const shiftId = assignment.shift.id;
      if (!shiftCounts.has(shiftId)) {
        shiftCounts.set(shiftId, {
          shiftId,
          wrCount: 0,
          currentShCount: assignment.shift.requiredStagehands,
          newShCount: assignment.shift.requiredStagehands
        });
      }
      const count = shiftCounts.get(shiftId)!;
      count.wrCount++;
      count.newShCount = count.currentShCount + count.wrCount;
    });

    // Display what will be changed
    console.log('\n📋 Migration Summary:');
    console.log('---------------------');
    
    for (const assignment of wrAssignments) {
      console.log(`👤 ${assignment.user.name} (${assignment.roleCode} → SH)`);
      console.log(`   📅 Shift: ${assignment.shift.date.toISOString().split('T')[0]}`);
      console.log(`   🏢 Job: ${assignment.shift.job.name} (${assignment.shift.job.company.name})`);
      console.log('');
    }

    console.log('\n📊 Shift Requirement Updates:');
    console.log('------------------------------');
    
    for (const [shiftId, counts] of Array.from(shiftCounts)) {
      const shift = wrAssignments.find(a => a.shift.id === shiftId)?.shift;
      console.log(`📅 ${shift?.date.toISOString().split('T')[0]} - ${shift?.job.name}`);
      console.log(`   Current SH required: ${counts.currentShCount}`);
      console.log(`   WR assignments to convert: ${counts.wrCount}`);
      console.log(`   New SH required: ${counts.newShCount}`);
      console.log('');
    }

    // Confirm before proceeding
    console.log('⚠️  This will make the following changes:');
    console.log(`   • Update ${wrAssignments.length} assigned personnel records (WR → SH)`);
    console.log(`   • Update ${shiftCounts.size} shift requirement records`);
    console.log('');

    // Execute the migration in a transaction
    console.log('🚀 Executing migration...');
    
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
      for (const [shiftId, counts] of Array.from(shiftCounts)) {
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

    // Final summary
    console.log('\n🎉 Migration Complete!');
    console.log('======================');
    console.log(`✅ Personnel updated: ${result.personnelUpdated}`);
    console.log(`✅ Shifts updated: ${result.shiftsUpdated}`);
    
    if (result.errors.length > 0) {
      console.log(`❌ Errors encountered: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`   • ${error}`));
    }

    // Verification
    console.log('\n🔍 Verification:');
    console.log('----------------');
    
    const remainingWR = await prisma.assignedPersonnel.count({
      where: { roleCode: 'WR' }
    });
    
    console.log(`Remaining WR assignments: ${remainingWR}`);
    
    if (remainingWR === 0) {
      console.log('✅ All WR assignments successfully converted to SH');
    } else {
      console.log('⚠️  Some WR assignments may not have been converted');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  migrateWRToSH()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateWRToSH };
