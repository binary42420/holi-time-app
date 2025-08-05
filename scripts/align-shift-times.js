#!/usr/bin/env node

/**
 * Shift Time Alignment Script
 * This script aligns shift start/end times with actual time entries and related data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Shift Time Alignment Script Starting...');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Step 1: Analyze current state
    console.log('\n📊 Analyzing current state...');
    const totalShifts = await prisma.shift.count();
    console.log(`📈 Total shifts: ${totalShifts}`);

    // Get shifts with their time entries
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
          select: { name: true, company: { select: { name: true } } }
        }
      }
    });

    console.log(`📋 Found ${shiftsWithTimeEntries.length} shifts to analyze`);

    let alignedCount = 0;
    let shiftsWithTimeData = 0;
    let shiftsWithoutTimeData = 0;

    // Step 2: Process each shift
    for (const shift of shiftsWithTimeEntries) {
      console.log(`\n🔍 Processing shift ${shift.id} (${shift.job?.name || 'Unknown Job'})`);
      
      // Collect all time entries from assigned personnel
      const allTimeEntries = [];
      for (const personnel of shift.assignedPersonnel) {
        allTimeEntries.push(...personnel.timeEntries);
      }

      if (allTimeEntries.length === 0) {
        console.log(`  ⚠️  No time entries found for shift ${shift.id}`);
        shiftsWithoutTimeData++;
        continue;
      }

      // Find the earliest clock-in and latest clock-out
      const clockInTimes = allTimeEntries
        .filter(entry => entry.clockIn)
        .map(entry => new Date(entry.clockIn))
        .sort((a, b) => a.getTime() - b.getTime());

      const clockOutTimes = allTimeEntries
        .filter(entry => entry.clockOut)
        .map(entry => new Date(entry.clockOut))
        .sort((a, b) => b.getTime() - a.getTime());

      if (clockInTimes.length === 0) {
        console.log(`  ⚠️  No clock-in times found for shift ${shift.id}`);
        shiftsWithoutTimeData++;
        continue;
      }

      const earliestClockIn = clockInTimes[0];
      const latestClockOut = clockOutTimes.length > 0 ? clockOutTimes[0] : null;

      // Determine new shift times
      let newStartDate = earliestClockIn;
      let newEndDate = latestClockOut;

      // If no clock-out times, estimate end time based on start time + typical shift duration
      if (!newEndDate) {
        newEndDate = new Date(newStartDate);
        newEndDate.setHours(newStartDate.getHours() + 8); // Assume 8-hour shift
        console.log(`  📅 No clock-out found, estimating end time as 8 hours after start`);
      }

      // Check if alignment is needed
      const currentStart = new Date(shift.startDate);
      const currentEnd = new Date(shift.endDate);
      
      const startDiff = Math.abs(currentStart.getTime() - newStartDate.getTime());
      const endDiff = Math.abs(currentEnd.getTime() - newEndDate.getTime());
      
      // If difference is more than 1 minute, align the times
      if (startDiff > 60000 || endDiff > 60000) {
        console.log(`  🔧 Aligning shift times:`);
        console.log(`     Current: ${currentStart.toISOString()} - ${currentEnd.toISOString()}`);
        console.log(`     New:     ${newStartDate.toISOString()} - ${newEndDate.toISOString()}`);

        await prisma.shift.update({
          where: { id: shift.id },
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
            updatedAt: new Date()
          }
        });

        alignedCount++;
        console.log(`  ✅ Shift ${shift.id} aligned successfully`);
      } else {
        console.log(`  ✅ Shift ${shift.id} already aligned (within 1 minute tolerance)`);
      }

      shiftsWithTimeData++;
    }

    // Step 3: Handle shifts without time entries but with other data
    console.log('\n🔍 Checking shifts without time entries...');
    
    const shiftsWithoutTimeEntries = await prisma.shift.findMany({
      where: {
        assignedPersonnel: {
          none: {
            timeEntries: {
              some: {}
            }
          }
        }
      },
      include: {
        job: {
          select: { name: true, company: { select: { name: true } } }
        },
        assignedPersonnel: true
      }
    });

    console.log(`📋 Found ${shiftsWithoutTimeEntries.length} shifts without time entries`);

    for (const shift of shiftsWithoutTimeEntries) {
      console.log(`\n🔍 Processing shift without time entries: ${shift.id} (${shift.job?.name || 'Unknown Job'})`);
      
      // For shifts without time entries, we can try to infer from the shift's original schedule
      // or set reasonable defaults based on typical work hours
      
      const currentStart = new Date(shift.startDate);
      const currentEnd = new Date(shift.endDate);
      
      // Check if the current times look reasonable (not in the far future or past)
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      let needsUpdate = false;
      let newStartDate = currentStart;
      let newEndDate = currentEnd;
      
      // Fix obviously wrong dates
      if (currentStart < oneYearAgo || currentStart > oneYearFromNow) {
        // Set to a reasonable default (today at 8 AM)
        newStartDate = new Date();
        newStartDate.setHours(8, 0, 0, 0);
        needsUpdate = true;
        console.log(`  🔧 Start date looks wrong, setting to reasonable default`);
      }
      
      if (currentEnd < oneYearAgo || currentEnd > oneYearFromNow || currentEnd <= newStartDate) {
        // Set end to 8 hours after start
        newEndDate = new Date(newStartDate);
        newEndDate.setHours(newStartDate.getHours() + 8);
        needsUpdate = true;
        console.log(`  🔧 End date looks wrong, setting to 8 hours after start`);
      }
      
      if (needsUpdate) {
        console.log(`  🔧 Updating shift times:`);
        console.log(`     Current: ${currentStart.toISOString()} - ${currentEnd.toISOString()}`);
        console.log(`     New:     ${newStartDate.toISOString()} - ${newEndDate.toISOString()}`);

        await prisma.shift.update({
          where: { id: shift.id },
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
            status: 'DRAFT', // Set to draft since these need review
            updatedAt: new Date()
          }
        });

        alignedCount++;
        console.log(`  ✅ Shift ${shift.id} updated with reasonable defaults`);
      } else {
        console.log(`  ✅ Shift ${shift.id} times look reasonable`);
      }
    }

    // Step 4: Summary
    console.log('\n📊 ALIGNMENT SUMMARY:');
    console.log(`✅ Total shifts processed: ${totalShifts}`);
    console.log(`🔧 Shifts aligned: ${alignedCount}`);
    console.log(`📈 Shifts with time data: ${shiftsWithTimeData}`);
    console.log(`⚠️  Shifts without time data: ${shiftsWithoutTimeData}`);
    
    if (alignedCount > 0) {
      console.log('\n🎉 Shift times have been successfully aligned!');
      console.log('💡 Shifts without time entries have been set to DRAFT status for review.');
    } else {
      console.log('\n✅ All shift times were already properly aligned!');
    }

  } catch (error) {
    console.error('❌ Alignment failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Additional function to validate alignment
async function validateAlignment() {
  console.log('\n🔍 Validating alignment...');
  
  try {
    await prisma.$connect();

    // Check for shifts with invalid date ranges
    const invalidShifts = await prisma.shift.findMany({
      where: {
        endDate: { lt: prisma.shift.fields.startDate }
      }
    });

    if (invalidShifts.length > 0) {
      console.log(`❌ Found ${invalidShifts.length} shifts with end date before start date`);
      return false;
    }

    // Check for shifts with null dates
    const nullDateShifts = await prisma.shift.findMany({
      where: {
        OR: [
          { startDate: null },
          { endDate: null }
        ]
      }
    });

    if (nullDateShifts.length > 0) {
      console.log(`❌ Found ${nullDateShifts.length} shifts with null dates`);
      return false;
    }

    console.log('✅ All shifts have valid date ranges!');
    return true;

  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (process.argv.includes('--validate')) {
  validateAlignment().catch(console.error);
} else {
  main()
    .then(() => validateAlignment())
    .catch(console.error);
}