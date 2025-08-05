#!/usr/bin/env node

/**
 * DELETE BAD SHIFTS - Handles foreign keys properly
 */

import { PrismaClient } from '@prisma/client';

// Set the database URL
process.env.DATABASE_URL = 'postgresql://holitime-user:myDBpassWord1%21@35.235.75.173:5432/holitime';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  DELETING BAD SHIFTS WITH PROPER CASCADE');
  console.log('==========================================');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Find bad shifts first
    const badShifts = await prisma.shift.findMany({
      where: {
        OR: [
          { date: { gt: new Date('2026-01-01') } },
          { startTime: { gt: new Date('2026-01-01') } },
          { endTime: { gt: new Date('2026-01-01') } },
          { date: { lt: new Date('2024-01-01') } }
        ]
      },
      include: {
        job: { select: { name: true } }
      }
    });

    console.log(`🔍 Found ${badShifts.length} shifts with bad dates:`);
    badShifts.forEach((shift, index) => {
      console.log(`  ${index + 1}. ${shift.job?.name || 'Unknown'} - ${shift.date} (${shift.startTime} to ${shift.endTime})`);
    });

    if (badShifts.length === 0) {
      console.log('✅ No bad shifts found!');
      return;
    }

    console.log('\n🗑️  Deleting shifts and related records...');

    let deletedCount = 0;
    
    // Delete each shift individually (Prisma handles cascades properly)
    for (const shift of badShifts) {
      try {
        // Delete the shift - this should cascade to related records
        await prisma.shift.delete({
          where: { id: shift.id }
        });
        
        deletedCount++;
        console.log(`  ✅ Deleted shift: ${shift.job?.name || 'Unknown'} (${shift.id})`);
      } catch (error) {
        console.log(`  ❌ Failed to delete shift ${shift.id}: ${error.message}`);
        
        // Manual cleanup if cascade fails
        try {
          // Delete related records manually
          await prisma.timeEntry.deleteMany({
            where: {
              assignedPersonnel: {
                shiftId: shift.id
              }
            }
          });
          
          await prisma.crewChiefPermission.deleteMany({
            where: {
              assignedPersonnel: {
                shiftId: shift.id
              }
            }
          });
          
          await prisma.timesheetEntry.deleteMany({
            where: {
              timesheet: {
                shiftId: shift.id
              }
            }
          });
          
          await prisma.timesheet.deleteMany({
            where: { shiftId: shift.id }
          });
          
          await prisma.assignedPersonnel.deleteMany({
            where: { shiftId: shift.id }
          });
          
          // Now delete the shift
          await prisma.shift.delete({
            where: { id: shift.id }
          });
          
          deletedCount++;
          console.log(`  ✅ Manually deleted shift: ${shift.job?.name || 'Unknown'} (${shift.id})`);
        } catch (manualError) {
          console.log(`  ❌ Manual deletion also failed for ${shift.id}: ${manualError.message}`);
        }
      }
    }

    console.log(`\n📊 DELETION SUMMARY:`);
    console.log(`🗑️  Shifts deleted: ${deletedCount}/${badShifts.length}`);
    
    // Verify remaining shifts
    const remainingShifts = await prisma.shift.count();
    console.log(`📈 Remaining shifts: ${remainingShifts}`);
    
    console.log('\n🎉 BAD SHIFTS CLEANUP COMPLETED!');
    console.log('📱 Your app should now show only valid shifts');

  } catch (error) {
    console.error('❌ Deletion failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);