import { prisma } from '../prisma';
import { User as PrismaUser, UserRole } from '@prisma/client';
import { User } from 'next-auth';
import { hasAnyRole } from '../auth';

export async function getAllEmployees(user: User): Promise<Partial<PrismaUser>[]> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to view all employees');
  }
  return prisma.user.findMany({
    where: {
      role: {
        in: [UserRole.Staff, UserRole.CrewChief],
      },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

export async function getEmployeeById(
  user: User,
  id: string
): Promise<Partial<PrismaUser> | null> {
  if (
    !hasAnyRole(user, [UserRole.Admin]) &&
    user.id !== id
  ) {
    throw new Error('Not authorized to view this employee');
  }
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      certifications: true,
      performance: true,
      location: true,
    },
  });
}

export async function createEmployee(
  user: User,
  data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    companyId?: string;
    certifications?: string[];
    performance?: number;
    location?: string;
  }
): Promise<PrismaUser> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to create an employee');
  }
  return prisma.user.create({
    data,
  });
}

export async function updateEmployee(
  user: User,
  id: string,
  data: Partial<PrismaUser>
): Promise<PrismaUser> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to update an employee');
  }
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function deleteEmployee(
  user: User,
  id: string
): Promise<PrismaUser> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to delete an employee');
  }
  return prisma.user.delete({
    where: { id },
  });
}

export async function getEmployeesByLocation(
  user: User,
  location: string
): Promise<Partial<PrismaUser>[]> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to view employees by location');
  }
  return prisma.user.findMany({
    where: {
      location,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

export async function getEmployeesWithCertifications(
  user: User,
  certifications: string[]
): Promise<Partial<PrismaUser>[]> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to view employees by certification');
  }
  return prisma.user.findMany({
    where: {
      certifications: {
        hasSome: certifications,
      },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      certifications: true,
    },
    orderBy: {
      performance: 'desc',
    },
  });
}
