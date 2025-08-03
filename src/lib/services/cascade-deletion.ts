import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

export interface DeletionResult {
  success: boolean;
  message: string;
  deletedCounts: {
    timeEntries?: number;
    assignedPersonnel?: number;
    shifts?: number;
    jobs?: number;
    clientCompanies?: number;
    crewChiefPermissions?: number;
    users?: number;
  };
  error?: string;
}

/**
 * Delete a client company and all associated data in proper cascade order
 */
export async function deleteClientCompanyCascade(companyId: string, deletedByUserId: string): Promise<DeletionResult> {
  const deletedCounts: DeletionResult['deletedCounts'] = {};

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const company = await tx.company.findUnique({ where: { id: companyId } });
      if (!company) {
        throw new Error('Company not found');
      }
      const companyName = company.name;

      const jobs = await tx.job.findMany({ where: { companyId } });
      const jobIds = jobs.map((j: { id: string }) => j.id);
      if (jobIds.length > 0) {
        const shifts = await tx.shift.findMany({ where: { jobId: { in: jobIds } } });
        const shiftIds = shifts.map((s: { id: string }) => s.id);
        if (shiftIds.length > 0) {
          const assignedPersonnel = await tx.assignedPersonnel.findMany({ where: { shiftId: { in: shiftIds } } });
          const assignedPersonnelIds = assignedPersonnel.map((ap: { id: string }) => ap.id);
          if (assignedPersonnelIds.length > 0) {
            const timeEntries = await tx.timeEntry.deleteMany({ where: { assignedPersonnelId: { in: assignedPersonnelIds } } });
            deletedCounts.timeEntries = timeEntries.count;
          }
          const deletedAssignedPersonnel = await tx.assignedPersonnel.deleteMany({ where: { shiftId: { in: shiftIds } } });
          deletedCounts.assignedPersonnel = deletedAssignedPersonnel.count;
        }
        const deletedShifts = await tx.shift.deleteMany({ where: { jobId: { in: jobIds } } });
        deletedCounts.shifts = deletedShifts.count;
      }
      const deletedJobs = await tx.job.deleteMany({ where: { companyId } });
      deletedCounts.jobs = deletedJobs.count;

      const updatedUsers = await tx.user.updateMany({
        where: { companyId },
        data: { companyId: null },
      });
      deletedCounts.users = updatedUsers.count;

      await tx.company.delete({ where: { id: companyId } });
      deletedCounts.clientCompanies = 1;

      // Assuming an audit log model exists
      // await tx.auditLog.create({
      //   data: {
      //     action: 'DELETE_CASCADE',
      //     entityType: 'client_company',
      //     entityId: companyId,
      //     entityName: companyName,
      //     performedBy: deletedByUserId,
      //     details: JSON.stringify(deletedCounts),
      //   },
      // });
    });

    return {
      success: true,
      message: `Successfully deleted client company and all associated data`,
      deletedCounts,
    };
  } catch (error) {
    console.error('Error in client company cascade deletion:', error);
    return {
      success: false,
      message: 'Failed to delete client company',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a job and all associated data in proper cascade order
 */
export async function deleteJobCascade(jobId: string, deletedByUserId: string): Promise<DeletionResult> {
  const deletedCounts: DeletionResult['deletedCounts'] = {};

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job) {
        throw new Error('Job not found');
      }
      const jobName = job.name;

      const shifts = await tx.shift.findMany({ where: { jobId } });
      const shiftIds = shifts.map((s: { id: string }) => s.id);

      if (shiftIds.length > 0) {
        const assignedPersonnel = await tx.assignedPersonnel.findMany({ where: { shiftId: { in: shiftIds } } });
        const assignedPersonnelIds = assignedPersonnel.map((ap: { id: string }) => ap.id);

        if (assignedPersonnelIds.length > 0) {
          const timeEntries = await tx.timeEntry.deleteMany({ where: { assignedPersonnelId: { in: assignedPersonnelIds } } });
          deletedCounts.timeEntries = timeEntries.count;

          const deletedAssignedPersonnel = await tx.assignedPersonnel.deleteMany({ where: { id: { in: assignedPersonnelIds } } });
          deletedCounts.assignedPersonnel = deletedAssignedPersonnel.count;
        }

        const permissions = await tx.crewChiefPermission.deleteMany({
          where: {
            permissionType: 'shift',
            targetId: { in: shiftIds },
          },
        });
        deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + permissions.count;

        const deletedShifts = await tx.shift.deleteMany({ where: { id: { in: shiftIds } } });
        deletedCounts.shifts = deletedShifts.count;
      }

      const jobPermissions = await tx.crewChiefPermission.deleteMany({
        where: {
          permissionType: 'job',
          targetId: jobId,
        },
      });
      deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + jobPermissions.count;

      const deletedJob = await tx.job.delete({ where: { id: jobId } });
      deletedCounts.jobs = 1;

      // Log the deletion
      // await tx.auditLog.create({
      //   data: {
      //     action: 'DELETE_CASCADE',
      //     entityType: 'job',
      //     entityId: jobId,
      //     entityName: jobName,
      //     performedBy: deletedByUserId,
      //     details: JSON.stringify(deletedCounts),
      //   },
      // });
    });

    return {
      success: true,
      message: `Successfully deleted job and all associated data`,
      deletedCounts
    };
  } catch (error) {
    console.error('Error in job cascade deletion:', error);
    return {
      success: false,
      message: 'Failed to delete job',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a shift and all associated data in proper cascade order
 */
export async function deleteShiftCascade(shiftId: string, deletedByUserId: string): Promise<DeletionResult> {
    const deletedCounts: DeletionResult['deletedCounts'] = {};

    try {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const shift = await tx.shift.findUnique({
                where: { id: shiftId },
                include: { job: true },
            });

            if (!shift) {
                throw new Error('Shift not found');
            }
            const shiftName = `${shift.job.name} - ${shift.date} ${shift.startTime}`;

            const assignedPersonnel = await tx.assignedPersonnel.findMany({ where: { shiftId } });
            const assignedPersonnelIds = assignedPersonnel.map((ap: { id: string }) => ap.id);

            if (assignedPersonnelIds.length > 0) {
                const timeEntries = await tx.timeEntry.deleteMany({ where: { assignedPersonnelId: { in: assignedPersonnelIds } } });
                deletedCounts.timeEntries = timeEntries.count;

                const deletedAssignedPersonnel = await tx.assignedPersonnel.deleteMany({ where: { id: { in: assignedPersonnelIds } } });
                deletedCounts.assignedPersonnel = deletedAssignedPersonnel.count;
            }

            const permissions = await tx.crewChiefPermission.deleteMany({
                where: {
                    permissionType: 'shift',
                    targetId: shiftId,
                },
            });
            deletedCounts.crewChiefPermissions = permissions.count;

            const deletedShift = await tx.shift.delete({ where: { id: shiftId } });
            deletedCounts.shifts = 1;

            // Log the deletion
            // await tx.auditLog.create({
            //     data: {
            //         action: 'DELETE_CASCADE',
            //         entityType: 'shift',
            //         entityId: shiftId,
            //         entityName: shiftName,
            //         performedBy: deletedByUserId,
            //         details: JSON.stringify(deletedCounts),
            //     },
            // });
        });

        return {
            success: true,
            message: `Successfully deleted shift and all associated data`,
            deletedCounts
        };

    } catch (error) {
        console.error('Error in shift cascade deletion:', error);
        return {
            success: false,
            message: 'Failed to delete shift',
            deletedCounts: {},
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}


/**
 * Get deletion impact summary before performing cascade deletion
 */
export async function getDeletionImpact(entityType: 'client' | 'job' | 'shift', entityId: string) {
  try {
    const impact = {
      timeEntries: 0,
      assignedPersonnel: 0,
      shifts: 0,
      jobs: 0,
      crewChiefPermissions: 0,
      users: 0
    };

    if (entityType === 'client') {
        const jobs = await prisma.job.findMany({ where: { companyId: entityId }, select: { id: true } });
        const jobIds = jobs.map((j: { id: string }) => j.id);
        
        const shifts = await prisma.shift.findMany({ where: { jobId: { in: jobIds } }, select: { id: true } });
        const shiftIds = shifts.map((s: { id: string }) => s.id);

        const assignedPersonnel = await prisma.assignedPersonnel.findMany({ where: { shiftId: { in: shiftIds } }, select: { id: true } });
        const assignedPersonnelIds = assignedPersonnel.map((ap: { id: string }) => ap.id);

        impact.jobs = jobIds.length;
        impact.shifts = shiftIds.length;
        impact.assignedPersonnel = assignedPersonnelIds.length;
        impact.timeEntries = await prisma.timeEntry.count({ where: { assignedPersonnelId: { in: assignedPersonnelIds } } });
        impact.users = await prisma.user.count({ where: { companyId: entityId } });
        // This is a simplification. A precise count of permissions would require a more complex query.
        impact.crewChiefPermissions = await prisma.crewChiefPermission.count({
            where: {
                OR: [
                    { permissionType: 'client', targetId: entityId },
                    { permissionType: 'job', targetId: { in: jobIds } },
                    { permissionType: 'shift', targetId: { in: shiftIds } },
                ]
            }
        });

    } else if (entityType === 'job') {
        const shifts = await prisma.shift.findMany({ where: { jobId: entityId }, select: { id: true } });
        const shiftIds = shifts.map((s: { id: string }) => s.id);

        const assignedPersonnel = await prisma.assignedPersonnel.findMany({ where: { shiftId: { in: shiftIds } }, select: { id: true } });
        const assignedPersonnelIds = assignedPersonnel.map((ap: { id: string }) => ap.id);

        impact.jobs = 1;
        impact.shifts = shiftIds.length;
        impact.assignedPersonnel = assignedPersonnelIds.length;
        impact.timeEntries = await prisma.timeEntry.count({ where: { assignedPersonnelId: { in: assignedPersonnelIds } } });
        impact.crewChiefPermissions = await prisma.crewChiefPermission.count({
            where: {
                OR: [
                    { permissionType: 'job', targetId: entityId },
                    { permissionType: 'shift', targetId: { in: shiftIds } },
                ]
            }
        });

    } else if (entityType === 'shift') {
        const assignedPersonnel = await prisma.assignedPersonnel.findMany({ where: { shiftId: entityId }, select: { id: true } });
        const assignedPersonnelIds = assignedPersonnel.map((ap: { id: string }) => ap.id);

        impact.shifts = 1;
        impact.assignedPersonnel = assignedPersonnelIds.length;
        impact.timeEntries = await prisma.timeEntry.count({ where: { assignedPersonnelId: { in: assignedPersonnelIds } } });
        impact.crewChiefPermissions = await prisma.crewChiefPermission.count({ where: { permissionType: 'shift', targetId: entityId } });
    }

    return impact;
  } catch (error) {
    console.error('Error getting deletion impact:', error);
    return {
      timeEntries: 0,
      assignedPersonnel: 0,
      shifts: 0,
      jobs: 0,
      crewChiefPermissions: 0,
      users: 0
    };
  }
}
