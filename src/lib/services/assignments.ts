import { prisma } from '../prisma';
import type { AssignedPersonnel as PrismaAssignedPersonnel, TimeEntry as PrismaTimeEntry, User } from '@prisma/client';

interface AssignedPersonnel extends PrismaAssignedPersonnel {
  user: {
    name: string | null;
    image: string | null;
  };
  time_entries: PrismaTimeEntry[];
}

export async function getShiftAssignments(shiftId: string): Promise<any[]> {
  return prisma.assignedPersonnel.findMany({
    where: { shiftId },
    include: {
      user: {
        select: {
          name: true
        }
      },
      timeEntries: {
        orderBy: {
          entry_number: 'asc'
        }
      }
    },
    orderBy: {
      user: {
        name: 'asc'
      }
    }
  });
}

export async function ensureCrewChiefAssignment(
  shiftId: string,
  crewChiefId: string  
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.assignedPersonnel.findFirst({
      where: {
        shiftId,
        userId: crewChiefId,
        roleCode: 'CC'
      }
    });

    if (existing) return existing.id;

    const assignment = await tx.assignedPersonnel.create({
      data: {
        shiftId,
        userId: crewChiefId,
        roleCode: 'CC'
      }
    });

    return assignment.id;
  });
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.deleteMany({ where: { assignedPersonnelId: assignmentId } });
    await tx.assignedPersonnel.delete({ where: { id: assignmentId } });
  });
}
