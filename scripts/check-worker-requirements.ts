/**
 * Script to check worker requirements in the database
 * This helps debug why the selectors are reverting to 0
 */

import { prisma } from '../src/lib/prisma';

async function checkWorkerRequirements() {
  console.log('🔍 Checking Worker Requirements in Database');
  console.log('==========================================');

  try {
    // Get all shifts with their worker requirements
    const shifts = await prisma.shift.findMany({
      select: {
        id: true,
        date: true,
        requiredCrewChiefs: true,
        requiredStagehands: true,
        requiredForkOperators: true,
        requiredReachForkOperators: true,
        requiredRiggers: true,
        requiredGeneralLaborers: true,
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
      },
      orderBy: {
        date: 'desc'
      },
      take: 10 // Show last 10 shifts
    });

    if (shifts.length === 0) {
      console.log('❌ No shifts found in database');
      return;
    }

    console.log(`📊 Found ${shifts.length} shifts (showing last 10):`);
    console.log('');

    shifts.forEach((shift, index) => {
      console.log(`${index + 1}. Shift ID: ${shift.id}`);
      console.log(`   📅 Date: ${shift.date.toISOString().split('T')[0]}`);
      console.log(`   🏢 Job: ${shift.job.name} (${shift.job.company.name})`);
      console.log(`   👥 Worker Requirements:`);
      console.log(`      • Crew Chiefs: ${shift.requiredCrewChiefs ?? 'NULL'}`);
      console.log(`      • Stagehands: ${shift.requiredStagehands ?? 'NULL'}`);
      console.log(`      • Fork Operators: ${shift.requiredForkOperators ?? 'NULL'}`);
      console.log(`      • Reach Fork Operators: ${shift.requiredReachForkOperators ?? 'NULL'}`);
      console.log(`      • Riggers: ${shift.requiredRiggers ?? 'NULL'}`);
      console.log(`      • General Laborers: ${shift.requiredGeneralLaborers ?? 'NULL'}`);
      console.log('');
    });

    // Check for shifts with non-zero requirements
    const shiftsWithRequirements = shifts.filter(shift => 
      (shift.requiredCrewChiefs && shift.requiredCrewChiefs > 0) ||
      (shift.requiredStagehands && shift.requiredStagehands > 0) ||
      (shift.requiredForkOperators && shift.requiredForkOperators > 0) ||
      (shift.requiredReachForkOperators && shift.requiredReachForkOperators > 0) ||
      (shift.requiredRiggers && shift.requiredRiggers > 0) ||
      (shift.requiredGeneralLaborers && shift.requiredGeneralLaborers > 0)
    );

    console.log(`📈 Shifts with non-zero requirements: ${shiftsWithRequirements.length}`);
    
    if (shiftsWithRequirements.length > 0) {
      console.log('');
      console.log('🎯 Shifts with actual requirements:');
      shiftsWithRequirements.forEach((shift, index) => {
        console.log(`${index + 1}. ${shift.id} - ${shift.date.toISOString().split('T')[0]}`);
        const requirements: string[] = [];
        if (shift.requiredCrewChiefs) requirements.push(`CC: ${shift.requiredCrewChiefs}`);
        if (shift.requiredStagehands) requirements.push(`SH: ${shift.requiredStagehands}`);
        if (shift.requiredForkOperators) requirements.push(`FO: ${shift.requiredForkOperators}`);
        if (shift.requiredReachForkOperators) requirements.push(`RFO: ${shift.requiredReachForkOperators}`);
        if (shift.requiredRiggers) requirements.push(`RG: ${shift.requiredRiggers}`);
        if (shift.requiredGeneralLaborers) requirements.push(`GL: ${shift.requiredGeneralLaborers}`);
        console.log(`   Requirements: ${requirements.join(', ')}`);
      });
    }

    // Check for NULL vs 0 values
    console.log('');
    console.log('🔍 NULL vs 0 Analysis:');
    const nullCounts = {
      requiredCrewChiefs: 0,
      requiredStagehands: 0,
      requiredForkOperators: 0,
      requiredReachForkOperators: 0,
      requiredRiggers: 0,
      requiredGeneralLaborers: 0
    };

    const zeroCounts = {
      requiredCrewChiefs: 0,
      requiredStagehands: 0,
      requiredForkOperators: 0,
      requiredReachForkOperators: 0,
      requiredRiggers: 0,
      requiredGeneralLaborers: 0
    };

    shifts.forEach(shift => {
      Object.keys(nullCounts).forEach(key => {
        const value = shift[key as keyof typeof shift];
        if (value === null || value === undefined) {
          nullCounts[key as keyof typeof nullCounts]++;
        } else if (value === 0) {
          zeroCounts[key as keyof typeof zeroCounts]++;
        }
      });
    });

    console.log('NULL values:');
    Object.entries(nullCounts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count} shifts`);
    });

    console.log('Zero values:');
    Object.entries(zeroCounts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count} shifts`);
    });

    // Test a specific shift if provided
    const testShiftId = process.argv[2];
    if (testShiftId) {
      console.log('');
      console.log(`🎯 Testing specific shift: ${testShiftId}`);
      console.log('=====================================');
      
      const testShift = await prisma.shift.findUnique({
        where: { id: testShiftId },
        select: {
          id: true,
          date: true,
          requiredCrewChiefs: true,
          requiredStagehands: true,
          requiredForkOperators: true,
          requiredReachForkOperators: true,
          requiredRiggers: true,
          requiredGeneralLaborers: true,
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
      });

      if (testShift) {
        console.log(`✅ Found shift: ${testShift.job.name} on ${testShift.date.toISOString().split('T')[0]}`);
        console.log('Current worker requirements:');
        console.log(`  • Crew Chiefs: ${testShift.requiredCrewChiefs ?? 'NULL'}`);
        console.log(`  • Stagehands: ${testShift.requiredStagehands ?? 'NULL'}`);
        console.log(`  • Fork Operators: ${testShift.requiredForkOperators ?? 'NULL'}`);
        console.log(`  • Reach Fork Operators: ${testShift.requiredReachForkOperators ?? 'NULL'}`);
        console.log(`  • Riggers: ${testShift.requiredRiggers ?? 'NULL'}`);
        console.log(`  • General Laborers: ${testShift.requiredGeneralLaborers ?? 'NULL'}`);
      } else {
        console.log(`❌ Shift ${testShiftId} not found`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking worker requirements:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  checkWorkerRequirements()
    .then(() => {
      console.log('\n✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

export { checkWorkerRequirements };
