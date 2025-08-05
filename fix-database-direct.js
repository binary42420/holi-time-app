#!/usr/bin/env node

/**
 * Direct Database Fix Script - No API needed
 * This script connects directly to the database and fixes shift times
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚨 EMERGENCY DATABASE FIX - DIRECT CONNECTION');
  console.log('==============================================');
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Step 1: Diagnose current state
    console.log('\n📊 Diagnosing current state...');
    const totalShifts = await prisma.shift.count();
    console.log(`📈 Total shifts: ${totalShifts}`);

    if (totalShifts === 0) {
      console.log('❌ No shifts found! This is the main issue.');
      return;
    }

    // Get sample shifts
    const sampleShifts = await prisma.shift.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: { name: true, company: { select: { name: true } } }
        },
        assignedPersonnel: {
          include: {
            timeEntries: true
          }
        }
      }
    });

    console.log(`📋 Sample shifts found: ${sampleShifts.length}`);
    sampleShifts.forEach((shift, index) => {
      console.log(`  ${index + 1}. ${shift.job?.name || 'Unknown Job'}`);
      console.log(`     Start: ${shift.startTime}, End: ${shift.endTime}`);
      console.log(`     Personnel: ${shift.assignedPersonnel.length}, Time entries: ${shift.assignedPersonnel.reduce((sum, p) => sum + p.timeEntries.length, 0)}`);
    });

    // Step 2: Fix shifts with time entries
    console.log('\n🔧 Step 2: Aligning shifts with time entries...');
    
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
    let shiftsWithTimeData = 0;
    let shiftsWithoutTimeData = 0;

    for (const shift of shiftsWithTimeEntries) {
      // Collect all time entries
      const allTimeEntries = [];
      for (const personnel of shift.assignedPersonnel) {
        allTimeEntries.push(...personnel.timeEntries);
      }

      if (allTimeEntries.length === 0) {
        shiftsWithoutTimeData++;
        
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
          console.log(`  🔧 Fixed shift ${shift.id} (${shift.job?.name || 'Unknown'})`);
          console.log(`     Old: ${currentStart.toISOString()} - ${currentEnd.toISOString()}`);
          console.log(`     New: ${newStartTime.toISOString()} - ${newEndTime.toISOString()}`);
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
        shiftsWithoutTimeData++;
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
        console.log(`  🔧 Aligned shift ${shift.id} (${shift.job?.name || 'Unknown'})`);
        console.log(`     Old: ${currentStart.toISOString()} - ${currentEnd.toISOString()}`);
        console.log(`     New: ${newStartTime.toISOString()} - ${newEndTime.toISOString()}`);
      }

      shiftsWithTimeData++;
    }

    // Step 3: Summary
    console.log('\n📊 ALIGNMENT SUMMARY:');
    console.log(`✅ Total shifts processed: ${totalShifts}`);
    console.log(`🔧 Shifts aligned: ${alignedCount}`);
    console.log(`📈 Shifts with time data: ${shiftsWithTimeData}`);
    console.log(`⚠️  Shifts without time data: ${shiftsWithoutTimeData}`);
    
    if (alignedCount > 0) {
      console.log('\n🎉 Shift times have been successfully aligned!');
      console.log('📱 Your app should now show the correct shifts.');
    } else {
      console.log('\n✅ All shift times were already properly aligned!');
    }

    // Step 4: Final verification
    console.log('\n🔍 Final verification...');
    const finalShiftCount = await prisma.shift.count();
    console.log(`📈 Final shift count: ${finalShiftCount}`);
    
    // Check for any remaining bad dates
    const badDates = await prisma.shift.findMany({
      where: {
        OR: [
          { startTime: null },
          { endTime: null }
        ]
      }
    });
    
    if (badDates.length > 0) {
      console.log(`⚠️  Found ${badDates.length} shifts with null dates - fixing now...`);
      
      const now = new Date();
      const defaultEnd = new Date(now);
      defaultEnd.setHours(now.getHours() + 8);
      
      await prisma.shift.updateMany({
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
      
      console.log('✅ Fixed null dates');
    } else {
      console.log('✅ No null dates found');
    }

    console.log('\n🎉 DATABASE FIX COMPLETED SUCCESSFULLY!');
    console.log('📱 Check your app: https://holitime-438323004618.us-west2.run.app');

  } catch (error) {
    console.error('❌ Database fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(console.error);