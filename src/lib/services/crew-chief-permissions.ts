import { prisma } from '@/lib/prisma';

export async function checkCrewChiefPermission(userId: string, shiftId: string): Promise<{ hasPermission: boolean }> {
  const permission = await prisma.crewChiefPermission.findFirst({
    where: {
      permissionType: 'shift',
      targetId: shiftId,
      assignedPersonnel: {
        userId: userId,
      },
    },
  });

  return { hasPermission: !!permission };
}