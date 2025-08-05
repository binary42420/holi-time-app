#!/usr/bin/env node

/**
 * Emergency Database Fix Script
 * This script will diagnose and fix issues with the shifts table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚨 Emergency Database Fix Script Starting...');
  
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check shifts table
    console.log('\n📊 Checking shifts table...');
    const shiftsCount = await prisma.shift.count();
    console.log(`📈 Total shifts in database: ${shiftsCount}`);

    if (shiftsCount === 0) {
      console.log('❌ No shifts found! This might be the issue.');
    }

    // Get sample shifts to see the data structure
    console.log('\n🔍 Checking recent shifts...');
    const recentShifts = await prisma.shift.findMany({
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

    console.log(`📋 Found ${recentShifts.length} recent shifts:`);
    recentShifts.forEach((shift, index) => {
      console.log(`  ${index + 1}. ${shift.job?.name || 'Unknown Job'} - ${shift.startDate} to ${shift.endDate}`);
      console.log(`     Status: ${shift.status}, Personnel: ${shift.assignedPersonnel.length}`);
    });

    // Check for date issues
    console.log('\n📅 Checking for date-related issues...');
    const shiftsWithBadDates = await prisma.shift.findMany({
      where: {
        OR: [
          { startDate: null },
          { endDate: null },
          { startDate: { gt: new Date('2030-01-01') } }, // Future dates that might be wrong
          { endDate: { lt: new Date('2020-01-01') } }    // Very old dates that might be wrong
        ]
      }
    });

    if (shiftsWithBadDates.length > 0) {
      console.log(`⚠️  Found ${shiftsWithBadDates.length} shifts with potentially bad dates:`);
      shiftsWithBadDates.forEach((shift, index) => {
        console.log(`  ${index + 1}. ID: ${shift.id}, Start: ${shift.startDate}, End: ${shift.endDate}`);
      });
    }

    // Check jobs table
    console.log('\n🏢 Checking jobs table...');
    const jobsCount = await prisma.job.count();
    console.log(`📈 Total jobs in database: ${jobsCount}`);

    // Check companies table
    console.log('\n🏭 Checking companies table...');
    const companiesCount = await prisma.company.count();
    console.log(`📈 Total companies in database: ${companiesCount}`);

    // Check users table
    console.log('\n👥 Checking users table...');
    const usersCount = await prisma.user.count();
    console.log(`📈 Total users in database: ${usersCount}`);

    console.log('\n✅ Database diagnostic completed!');

  } catch (error) {
    console.error('❌ Database diagnostic failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-fix function
async function autoFix() {
  console.log('\n🔧 Starting auto-fix procedures...');
  
  try {
    await prisma.$connect();

    // Fix 1: Update shifts with null dates to reasonable defaults
    console.log('🔧 Fixing shifts with null dates...');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const fixedNullDates = await prisma.shift.updateMany({
      where: {
        OR: [
          { startDate: null },
          { endDate: null }
        ]
      },
      data: {
        startDate: now,
        endDate: tomorrow,
        status: 'DRAFT' // Set to draft so they can be properly configured
      }
    });

    if (fixedNullDates.count > 0) {
      console.log(`✅ Fixed ${fixedNullDates.count} shifts with null dates`);
    }

    // Fix 2: Update shifts with end date before start date
    console.log('🔧 Fixing shifts with invalid date ranges...');
    const invalidDateShifts = await prisma.shift.findMany({
      where: {
        endDate: { lt: prisma.shift.fields.startDate }
      }
    });

    for (const shift of invalidDateShifts) {
      const newEndDate = new Date(shift.startDate);
      newEndDate.setHours(newEndDate.getHours() + 8); // Add 8 hours

      await prisma.shift.update({
        where: { id: shift.id },
        data: {
          endDate: newEndDate,
          status: 'DRAFT'
        }
      });
    }

    if (invalidDateShifts.length > 0) {
      console.log(`✅ Fixed ${invalidDateShifts.length} shifts with invalid date ranges`);
    }

    // Fix 3: Ensure all shifts have proper status
    console.log('🔧 Fixing shifts with invalid status...');
    const fixedStatus = await prisma.shift.updateMany({
      where: {
        status: { notIn: ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }
      },
      data: {
        status: 'DRAFT'
      }
    });

    if (fixedStatus.count > 0) {
      console.log(`✅ Fixed ${fixedStatus.count} shifts with invalid status`);
    }

    console.log('✅ Auto-fix completed successfully!');

  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (process.argv.includes('--fix')) {
  main().then(() => autoFix()).catch(console.error);
} else {
  main().catch(console.error);
}