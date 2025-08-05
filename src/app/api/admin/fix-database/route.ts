import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 Emergency Database Fix API called');
    
    // Get the action from the request
    const { action } = await request.json();
    
    if (action === 'diagnose') {
      return await diagnoseDatabase();
    } else if (action === 'fix') {
      return await fixDatabase();
    } else if (action === 'align-times') {
      return await alignShiftTimes();
    } else {
      return NextResponse.json({ error: 'Invalid action. Use: diagnose, fix, or align-times' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Database fix API error:', error);
    return NextResponse.json({ 
      error: 'Database fix failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function diagnoseDatabase() {
  const results = {
    connection: false,
    shifts: { count: 0, recent: [], badDates: [] },
    jobs: { count: 0 },
    companies: { count: 0 },
    users: { count: 0 }
  };

  try {
    // Test connection
    await prisma.$connect();
    results.connection = true;

    // Check shifts
    results.shifts.count = await prisma.shift.count();
    
    results.shifts.recent = await prisma.shift.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: { name: true, company: { select: { name: true } } }
        },
        assignedPersonnel: {
          select: { id: true }
        }
      }
    });

    // Check for bad dates
    results.shifts.badDates = await prisma.shift.findMany({
      where: {
        OR: [
          { startTime: null },
          { endTime: null },
          { startTime: { gt: new Date('2030-01-01') } },
          { endTime: { lt: new Date('2020-01-01') } }
        ]
      },
      select: { id: true, startTime: true, endTime: true, status: true }
    });

    // Check other tables
    results.jobs.count = await prisma.job.count();
    results.companies.count = await prisma.company.count();
    results.users.count = await prisma.user.count();

    return NextResponse.json({ 
      success: true, 
      message: 'Database diagnosis completed',
      results 
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Diagnosis failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      results 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

async function fixDatabase() {
  const fixes = {
    nullDates: 0,
    invalidRanges: 0,
    invalidStatus: 0
  };

  try {
    await prisma.$connect();

    // Fix 1: Null dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const fixedNullDates = await prisma.shift.updateMany({
      where: {
        OR: [
          { startTime: null },
          { endTime: null }
        ]
      },
      data: {
        startTime: now,
        endTime: tomorrow,
        status: 'Pending'
      }
    });
    fixes.nullDates = fixedNullDates.count;

    // Fix 2: Invalid date ranges - find shifts where endTime is before startTime
    const invalidDateShifts = await prisma.shift.findMany({
      where: {
        AND: [
          { startTime: { not: null } },
          { endTime: { not: null } }
        ]
      }
    });

    const actuallyInvalidShifts = invalidDateShifts.filter(shift => 
      new Date(shift.endTime).getTime() < new Date(shift.startTime).getTime()
    );

    for (const shift of actuallyInvalidShifts) {
      const newEndTime = new Date(shift.startTime);
      newEndTime.setHours(newEndTime.getHours() + 8);

      await prisma.shift.update({
        where: { id: shift.id },
        data: {
          endTime: newEndTime,
          status: 'Pending'
        }
      });
    }
    fixes.invalidRanges = actuallyInvalidShifts.length;

    // Fix 3: Invalid status
    const fixedStatus = await prisma.shift.updateMany({
      where: {
        status: { notIn: ['Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'] }
      },
      data: {
        status: 'Pending'
      }
    });
    fixes.invalidStatus = fixedStatus.count;

    return NextResponse.json({ 
      success: true, 
      message: 'Database fixes applied successfully',
      fixes 
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Fix failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      fixes 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

async function alignShiftTimes() {
  const results = {
    totalShifts: 0,
    alignedShifts: 0,
    shiftsWithTimeData: 0,
    shiftsWithoutTimeData: 0,
    details: []
  };

  try {
    await prisma.$connect();

    // Get all shifts with their time entries
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

    results.totalShifts = shiftsWithTimeEntries.length;

    for (const shift of shiftsWithTimeEntries) {
      // Collect all time entries from assigned personnel
      const allTimeEntries = [];
      for (const personnel of shift.assignedPersonnel) {
        allTimeEntries.push(...personnel.timeEntries);
      }

      if (allTimeEntries.length === 0) {
        results.shiftsWithoutTimeData++;
        
        // Handle shifts without time entries - set reasonable defaults if dates are wrong
        const currentStart = new Date(shift.startTime);
        const currentEnd = new Date(shift.endTime);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        let needsUpdate = false;
        let newStartTime = currentStart;
        let newEndTime = currentEnd;
        
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
              status: 'Pending',
              updatedAt: new Date()
            }
          });
          
          results.alignedShifts++;
          results.details.push({
            shiftId: shift.id,
            jobName: shift.job?.name || 'Unknown',
            action: 'Set reasonable defaults (no time entries)',
            oldStart: currentStart.toISOString(),
            oldEnd: currentEnd.toISOString(),
            newStart: newStartTime.toISOString(),
            newEnd: newEndTime.toISOString()
          });
        }
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
        results.shiftsWithoutTimeData++;
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

        results.alignedShifts++;
        results.details.push({
          shiftId: shift.id,
          jobName: shift.job?.name || 'Unknown',
          action: 'Aligned with time entries',
          oldStart: currentStart.toISOString(),
          oldEnd: currentEnd.toISOString(),
          newStart: newStartTime.toISOString(),
          newEnd: newEndTime.toISOString()
        });
      }

      results.shiftsWithTimeData++;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Shift times aligned successfully',
      results 
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Alignment failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      results 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Database Fix API', 
    usage: 'POST with { "action": "diagnose" }, { "action": "fix" }, or { "action": "align-times" }' 
  });
}