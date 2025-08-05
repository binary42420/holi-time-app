#!/usr/bin/env node

/**
 * VERIFY DATABASE FIX
 */

import { PrismaClient } from '@prisma/client';

// Set the database URL
process.env.DATABASE_URL = 'postgresql://holitime-user:myDBpassWord1%21@35.235.75.173:5432/holitime';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFYING DATABASE FIX');
  console.log('=========================');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check total shifts
    const totalShifts = await prisma.shift.count();
    console.log(`📈 Total shifts: ${totalShifts}`);

    // Check recent shifts
    const recentShifts = await prisma.shift.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
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

    console.log('\n📋 Recent shifts (showing alignment results):');
    recentShifts.forEach((shift, index) => {
      const timeEntries = shift.assignedPersonnel.reduce((sum, p) => sum + p.timeEntries.length, 0);
      console.log(`${index + 1}. ${shift.job?.name || 'Unknown Job'} (${shift.job?.company?.name || 'Unknown Company'})`);
      console.log(`   Start: ${new Date(shift.startTime).toLocaleString()}`);
      console.log(`   End: ${new Date(shift.endTime).toLocaleString()}`);
      console.log(`   Personnel: ${shift.assignedPersonnel.length}, Time entries: ${timeEntries}`);
      console.log(`   Status: ${shift.status}, Updated: ${new Date(shift.updatedAt).toLocaleString()}`);
      console.log('');
    });

    // Check for any problematic dates
    const badDates = await prisma.shift.findMany({
      where: {
        OR: [
          { startTime: null },
          { endTime: null }
        ]
      }
    });

    if (badDates.length > 0) {
      console.log(`⚠️  Found ${badDates.length} shifts with null dates`);
    } else {
      console.log('✅ No null dates found');
    }

    // Check for invalid date ranges
    const allShifts = await prisma.shift.findMany({
      select: { id: true, startTime: true, endTime: true, job: { select: { name: true } } }
    });

    const invalidRanges = allShifts.filter(shift => 
      new Date(shift.endTime).getTime() < new Date(shift.startTime).getTime()
    );

    if (invalidRanges.length > 0) {
      console.log(`⚠️  Found ${invalidRanges.length} shifts with invalid date ranges`);
      invalidRanges.forEach(shift => {
        console.log(`   - ${shift.job?.name || 'Unknown'}: ${shift.startTime} to ${shift.endTime}`);
      });
    } else {
      console.log('✅ All date ranges are valid');
    }

    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log('📱 Your shifts should now be visible in the app');
    console.log('🌐 Check: https://holitime-438323004618.us-west2.run.app');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);