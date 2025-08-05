#!/usr/bin/env node

/**
 * IMMEDIATE DATABASE FIX - With Connection String
 */

import { PrismaClient } from '@prisma/client';

// Set the database URL
process.env.DATABASE_URL = 'postgresql://holitime-user:myDBpassWord1%21@35.235.75.173:5432/holitime';

const prisma = new PrismaClient();

async function main() {
  console.log('🚨 EMERGENCY DATABASE FIX - RUNNING NOW');
  console.log('=======================================');
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Step 1: Quick diagnosis
    console.log('\n📊 Quick diagnosis...');
    const totalShifts = await prisma.shift.count();
    console.log(`📈 Total shifts: ${totalShifts}`);

    if (totalShifts === 0) {
      console.log('❌ No shifts found! This is the main issue.');
      return;
    }

    // Step 2: Fix shifts with time entries
    console.log('\n🔧 Aligning shifts with time entries...');
    
    const shiftsWithTimeEntries = await prisma.shift.findMany({
      include: {
        assignedPersonnel: {
          include: {
            timeEntries: {
              orderBy: { clockIn: 'asc' }
            }
          }
        },
        job: {
          select: { name: true }
        }
      }
    });

    let alignedCount = 0;
    let processedCount = 0;

    for (const shift of shiftsWithTimeEntries) {
      processedCount++;
      
      // Show progress
      if (processedCount % 10 === 0) {
        console.log(`  📊 Processed ${processedCount}/${shiftsWithTimeEntries.length} shifts...`);
      }

      // Collect all time entries
      const allTimeEntries = [];
      for (const personnel of shift.assignedPersonnel) {
        allTimeEntries.push(...personnel.timeEntries);
      }

      if (allTimeEntries.length === 0) {
        // Check if current times are reasonable
        const currentStart = new Date(shift.startTime);
        const currentEnd = new Date(shift.endTime);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        let needsUpdate = false;
        let newStartTime = currentStart;
        let newEndTime = currentEnd;
        
        // Fix obviously wrong dates
        if (currentStart < oneYearAgo || currentStart > oneYearFromNow) {
          newStartTime = new Date();
          newStartTime.setHours(8, 0, 0, 0);
          needsUpdate = true;
        }
        
        if (currentEnd < oneYearAgo || currentEnd > oneYearFromNow || currentEnd <= newStartTime) {
          newEndTime = new Date(newStartTime);
          newEndTime.setHours(newStartTime.getHours() + 8);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await prisma.shift.update({
            where: { id: shift.id },
            data: {
              startTime: newStartTime,
              endTime: newEndTime,
              updatedAt: new Date()
            }
          });
          
          alignedCount++;
        }
        continue;
      }

      // Find earliest clock-in and latest clock-out
      const clockInTimes = allTimeEntries
        .filter(entry => entry.clockIn)
        .map(entry => new Date(entry.clockIn))
        .sort((a, b) => a.getTime() - b.getTime());

      const clockOutTimes = allTimeEntries
        .filter(entry => entry.clockOut)
        .map(entry => new Date(entry.clockOut))
        .sort((a, b) => b.getTime() - a.getTime());

      if (clockInTimes.length === 0) {
        continue;
      }

      const earliestClockIn = clockInTimes[0];
      const latestClockOut = clockOutTimes.length > 0 ? clockOutTimes[0] : null;

      let newStartTime = earliestClockIn;
      let newEndTime = latestClockOut;

      if (!newEndTime) {
        newEndTime = new Date(newStartTime);
        newEndTime.setHours(newStartTime.getHours() + 8);
      }

      // Check if alignment is needed (more than 1 minute difference)
      const currentStart = new Date(shift.startTime);
      const currentEnd = new Date(shift.endTime);
      
      const startDiff = Math.abs(currentStart.getTime() - newStartTime.getTime());
      const endDiff = Math.abs(currentEnd.getTime() - newEndTime.getTime());
      
      if (startDiff > 60000 || endDiff > 60000) {
        await prisma.shift.update({
          where: { id: shift.id },
          data: {
            startTime: newStartTime,
            endTime: newEndTime,
            updatedAt: new Date()
          }
        });

        alignedCount++;
      }
    }

    // Step 3: Fix any null dates
    console.log('\n🛠️  Fixing null dates...');
    const now = new Date();
    const defaultEnd = new Date(now);
    defaultEnd.setHours(now.getHours() + 8);
    
    const nullDateFix = await prisma.shift.updateMany({
      where: {
        OR: [
          { startTime: null },
          { endTime: null }
        ]
      },
      data: {
        startTime: now,
        endTime: defaultEnd
      }
    });

    // Step 4: Summary
    console.log('\n📊 FIX SUMMARY:');
    console.log(`✅ Total shifts processed: ${totalShifts}`);
    console.log(`🔧 Shifts aligned: ${alignedCount}`);
    console.log(`🛠️  Null dates fixed: ${nullDateFix.count}`);
    
    console.log('\n🎉 DATABASE FIX COMPLETED SUCCESSFULLY!');
    console.log('📱 Your app should now show all shifts correctly!');
    console.log('🌐 Check: https://holitime-438323004618.us-west2.run.app');

  } catch (error) {
    console.error('❌ Database fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(console.error);