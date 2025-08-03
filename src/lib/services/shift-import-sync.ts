import { prisma } from '@/lib/prisma';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import type { RoleCode } from '@/lib/types';

interface ImportedWorkerData {
  userId: string;
  roleCode: RoleCode;
  clockInTime?: string;
  clockOutTime?: string;
  entryNumber?: number;
}

interface ShiftImportData {
  shiftId: string;
  workers: ImportedWorkerData[];
}

/**
 * Synchronizes worker requirements and assignments from imported shift data
 * This function automatically:
 * 1. Updates worker requirements based on imported worker counts
 * 2. Creates assigned personnel entries
 * 3. Maps clock in/out times to time entries
 * 4. Ensures crew chief requirement is always 1
 */
export async function syncShiftFromImportData(importData: ShiftImportData) {
  const { shiftId, workers } = importData;

  try {
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate worker requirements from imported data
      const workerCounts = calculateWorkerRequirements(workers);
      
      // 2. Update or create worker requirements
      await updateWorkerRequirements(tx, shiftId, workerCounts);
      
      // 3. Create assigned personnel entries
      const assignedPersonnel = await createAssignedPersonnel(tx, shiftId, workers);
      
      // 4. Create time entries for workers with clock data
      await createTimeEntries(tx, workers, assignedPersonnel);
      
      return {
        workerRequirements: workerCounts,
        assignedPersonnel,
        timeEntriesCreated: workers.filter(w => w.clockInTime || w.clockOutTime).length
      };
    });

    console.log(`Successfully synced shift ${shiftId} with ${workers.length} workers`);
    return result;

  } catch (error) {
    console.error(`Error syncing shift ${shiftId}:`, error);
    throw new Error(`Failed to sync shift data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate worker requirements based on imported worker data
 */
function calculateWorkerRequirements(workers: ImportedWorkerData[]): Record<RoleCode, number> {
  const counts: Record<RoleCode, number> = {
    'CC': 1, // Always fixed at 1
    'SH': 0,
    'FO': 0,
    'RFO': 0,
    'RG': 0,
    'GL': 0
  };

  // Count workers by role
  workers.forEach(worker => {
    if (worker.roleCode in counts) {
      // Crew chief is always 1, don't increment beyond that
      if (worker.roleCode === 'CC') {
        counts['CC'] = 1;
      } else {
        counts[worker.roleCode]++;
      }
    }
  });

  return counts;
}

/**
 * Update worker requirements in the database
 */
async function updateWorkerRequirements(
  tx: any, 
  shiftId: string, 
  workerCounts: Record<RoleCode, number>
) {
  // Delete existing worker requirements for this shift
  await tx.workerRequirement.deleteMany({
    where: { shiftId }
  });

  // Create new worker requirements
  const requirements = Object.entries(workerCounts).map(([roleCode, count]) => ({
    shiftId,
    roleCode: roleCode as RoleCode,
    roleName: ROLE_DEFINITIONS[roleCode as RoleCode].name,
    requiredCount: count,
    color: ROLE_DEFINITIONS[roleCode as RoleCode].roleColor
  }));

  await tx.workerRequirement.createMany({
    data: requirements
  });

  return requirements;
}

/**
 * Create assigned personnel entries for imported workers
 */
async function createAssignedPersonnel(
  tx: any,
  shiftId: string,
  workers: ImportedWorkerData[]
) {
  // Delete existing assigned personnel for this shift
  await tx.assignedPersonnel.deleteMany({
    where: { shiftId }
  });

  // Create new assigned personnel entries
  const assignedPersonnelData = workers.map(worker => ({
    shiftId,
    userId: worker.userId,
    roleCode: worker.roleCode,
    status: 'Assigned' as const,
    assignedAt: new Date()
  }));

  const assignedPersonnel = await tx.assignedPersonnel.createMany({
    data: assignedPersonnelData,
    skipDuplicates: true
  });

  // Fetch the created records with their IDs
  const createdPersonnel = await tx.assignedPersonnel.findMany({
    where: { shiftId },
    include: {
      user: {
        select: { id: true, name: true }
      }
    }
  });

  return createdPersonnel;
}

/**
 * Create time entries for workers with clock data
 */
async function createTimeEntries(
  tx: any,
  workers: ImportedWorkerData[],
  assignedPersonnel: any[]
) {
  const timeEntries = [];

  for (const worker of workers) {
    if (!worker.clockInTime && !worker.clockOutTime) {
      continue; // Skip workers without time data
    }

    // Find the assigned personnel record for this worker
    const personnel = assignedPersonnel.find(ap => 
      ap.userId === worker.userId && ap.roleCode === worker.roleCode
    );

    if (!personnel) {
      console.warn(`No assigned personnel found for worker ${worker.userId} with role ${worker.roleCode}`);
      continue;
    }

    // Create time entry
    const timeEntryData: any = {
      assignedPersonnelId: personnel.id,
      entryNumber: worker.entryNumber || 1,
      isActive: false // Imported entries are typically completed
    };

    if (worker.clockInTime) {
      timeEntryData.clockIn = new Date(worker.clockInTime);
    }

    if (worker.clockOutTime) {
      timeEntryData.clockOut = new Date(worker.clockOutTime);
    } else if (worker.clockInTime) {
      // If only clock in time is provided, mark as active
      timeEntryData.isActive = true;
    }

    const timeEntry = await tx.timeEntry.create({
      data: timeEntryData
    });

    timeEntries.push(timeEntry);
  }

  return timeEntries;
}

/**
 * Validate imported worker data
 */
export function validateImportedWorkerData(workers: any[]): ImportedWorkerData[] {
  const validatedWorkers: ImportedWorkerData[] = [];
  const errors: string[] = [];

  workers.forEach((worker, index) => {
    try {
      // Validate required fields
      if (!worker.userId || typeof worker.userId !== 'string') {
        errors.push(`Worker ${index + 1}: Invalid or missing userId`);
        return;
      }

      if (!worker.roleCode || !Object.keys(ROLE_DEFINITIONS).includes(worker.roleCode)) {
        errors.push(`Worker ${index + 1}: Invalid or missing roleCode. Must be one of: ${Object.keys(ROLE_DEFINITIONS).join(', ')}`);
        return;
      }

      // Validate time formats if provided
      if (worker.clockInTime && isNaN(Date.parse(worker.clockInTime))) {
        errors.push(`Worker ${index + 1}: Invalid clockInTime format`);
        return;
      }

      if (worker.clockOutTime && isNaN(Date.parse(worker.clockOutTime))) {
        errors.push(`Worker ${index + 1}: Invalid clockOutTime format`);
        return;
      }

      // Validate entry number
      if (worker.entryNumber && (!Number.isInteger(worker.entryNumber) || worker.entryNumber < 1)) {
        errors.push(`Worker ${index + 1}: entryNumber must be a positive integer`);
        return;
      }

      validatedWorkers.push({
        userId: worker.userId,
        roleCode: worker.roleCode as RoleCode,
        clockInTime: worker.clockInTime,
        clockOutTime: worker.clockOutTime,
        entryNumber: worker.entryNumber || 1
      });

    } catch (error) {
      errors.push(`Worker ${index + 1}: Validation error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Validation errors:\n${errors.join('\n')}`);
  }

  return validatedWorkers;
}

/**
 * Helper function to ensure crew chief requirement
 */
export function ensureCrewChiefRequirement(workers: ImportedWorkerData[]): ImportedWorkerData[] {
  const hasCrewChief = workers.some(worker => worker.roleCode === 'CC');
  
  if (!hasCrewChief) {
    console.warn('No crew chief found in imported data. A crew chief assignment will need to be added manually.');
  }

  return workers;
}

/**
 * Get worker requirements summary from imported data
 */
export function getWorkerRequirementsSummary(workers: ImportedWorkerData[]): {
  total: number;
  byRole: Record<RoleCode, number>;
  hasCrewChief: boolean;
} {
  const byRole = calculateWorkerRequirements(workers);
  const total = Object.values(byRole).reduce((sum, count) => sum + count, 0);
  const hasCrewChief = byRole['CC'] > 0;

  return {
    total,
    byRole,
    hasCrewChief
  };
}
