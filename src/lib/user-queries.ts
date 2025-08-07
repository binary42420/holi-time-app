import { prisma } from './prisma';

/**
 * Safe user query selections that exclude large fields like avatarData
 * to prevent session bloat and performance issues
 */

// Basic user fields for session/auth purposes (minimal data)
export const basicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  isActive: true,
} as const;

// Extended user fields for profile/management purposes (excludes large binary data)
export const extendedUserSelect = {
  ...basicUserSelect,
  crew_chief_eligible: true,
  fork_operator_eligible: true,
  OSHA_10_Certifications: true,
  certifications: true,
  performance: true,
  location: true,
  phone: true,
  // Still excludes avatarData to prevent large payloads
} as const;

// Full user fields (only use when absolutely necessary)
export const fullUserSelect = {
  ...extendedUserSelect,
  avatarData: true,
  passwordHash: true,
} as const;

/**
 * Get user by ID with basic fields (safe for session data)
 */
export async function getUserBasic(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: basicUserSelect,
  });
}

/**
 * Get user by email with basic fields (safe for session data)
 */
export async function getUserBasicByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: basicUserSelect,
  });
}

/**
 * Get user by ID with extended fields (safe for most operations)
 */
export async function getUserExtended(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: extendedUserSelect,
  });
}

/**
 * Get user by email with extended fields (safe for most operations)
 */
export async function getUserExtendedByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: extendedUserSelect,
  });
}

/**
 * Get user avatar data only (for avatar serving endpoints)
 */
export async function getUserAvatarData(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatarData: true,
    },
  });
}

/**
 * Check if user exists and is active (minimal query)
 */
export async function isUserActiveById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { isActive: true },
  });
  return user?.isActive ?? false;
}

/**
 * Check if user exists and is active by email (minimal query)
 */
export async function isUserActiveByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { isActive: true },
  });
  return user?.isActive ?? false;
}