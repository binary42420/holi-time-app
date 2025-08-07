import { prisma } from '@/lib/prisma';
import { User } from '@prisma/client';
import { UserRole } from '@/lib/types';
import * as bcrypt from 'bcryptjs';

interface UserContext {
  id: string;
  role: UserRole;
}

/**
 * Checks if a user has Crew Chief management permissions for a specific shift.
 * This is true if the user is an Admin, Staff, or is assigned to the shift
 * with the role code 'CC' (Crew Chief).
 *
 * @param user The user object of the user performing the action.
 * @param shiftId The ID of the shift to check permissions for.
 * @returns {Promise<boolean>} True if the user has management permissions, false otherwise.
 */
export async function canCrewChiefManageShift(user: UserContext, shiftId: string): Promise<boolean> {
  // Admins and Staff always have permission.
  if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
    return true;
  }

  // Only users with the CrewChief role can have this special permission.
  if (user.role !== UserRole.CrewChief) {
    return false;
  }

  // Check if the user is assigned to this specific shift as a Crew Chief ('CC').
  const assignment = await prisma.assignedPersonnel.findFirst({
    where: {
      shiftId: shiftId,
      userId: user.id,
      roleCode: 'CC', // The specific role code for a crew chief on a shift
    },
  });

  return !!assignment;
}

/**
 * Checks if a crew chief user is assigned to a specific shift as a worker.
 * This allows crew chiefs who are assigned to the shift to sign client approvals.
 *
 * @param user The user object of the user performing the action.
 * @param shiftId The ID of the shift to check assignment for.
 * @returns {Promise<boolean>} True if the crew chief is assigned to the shift, false otherwise.
 */
export async function isCrewChiefAssignedToShift(user: UserContext, shiftId: string): Promise<boolean> {
  // Only crew chiefs can use this function
  if (user.role !== UserRole.CrewChief) {
    return false;
  }

  // Check if the user is assigned to this specific shift with any role code
  const assignment = await prisma.assignedPersonnel.findFirst({
    where: {
      shiftId: shiftId,
      userId: user.id,
    },
  });

  return !!assignment;
}

// The functions below were restored to fix build errors.
// It appears they were removed from this file while still being used
// in other parts of the application.

// Helper to check if we're in a build environment
function isBuildTime(): boolean {
  return !!process.env.npm_lifecycle_event?.includes('build');
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  avatarUrl?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function getUserByEmail(email: string) {
  if (isBuildTime()) {
    return null;
  }
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: any) {
  if (isBuildTime()) {
    return null;
  }
  const { password, ...rest } = data;
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { ...rest, passwordHash },
  });
}

export async function refreshUserData(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user;
}

export function hasAnyRole(user: AuthenticatedUser | User, roles: UserRole[]): boolean {
  if (!user) {
    return false;
  }
  return roles.includes(user.role);
}

export function verifySignatureRequest(signature: string, data: any): boolean {
    // This is a placeholder.
    return true;
}
