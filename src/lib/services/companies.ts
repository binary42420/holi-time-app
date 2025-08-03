import { prisma } from '../prisma';
import { Prisma, Company, UserRole, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { hasAnyRole } from '../auth';

export async function getAllCompanies(user: User): Promise<Partial<Company>[]> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to view all companies');
  }
  return prisma.company.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company_logo_url: true, // Include company_logo_url
      _count: {
        select: { users: true, jobs: true },
      },
    },
  });
}

export async function getCompanyById(id: string): Promise<Partial<Company> | null> {
  return prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      jobs: {
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      },
    },
  });
}

export async function createCompany(
  user: User,
  data: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
  }
): Promise<Company> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to create a company');
  }
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const company = await tx.company.create({
      data: {
        name: data.name,
        address: data.address,
        email: data.email,
        phone: data.phone,
      },
    });

    // Generate a secure, random password for the new company user
    const temporaryPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    await tx.user.create({
      data: {
        name: data.contact_name,
        email: data.contact_email,
        passwordHash: hashedPassword,
        role: UserRole.CompanyUser,
        companyId: company.id,
      },
    });

    return company;
  });
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  return prisma.company.update({
    where: { id },
    data,
  });
}

export async function deleteCompany(user: User, id: string): Promise<void> {
  if (!hasAnyRole(user, [UserRole.Admin])) {
    throw new Error('Not authorized to delete a company');
  }
  // The cascading delete rule in the schema will handle deleting related users.
  await prisma.company.delete({ where: { id } });
}

export async function getCompanyDashboardData(companyId: string) {
  const activeJobsCount = await prisma.job.count({
    where: {
      companyId,
      status: 'Active' 
    }
  });

  const upcomingShiftsCount = await prisma.shift.count({
    where: {
      job: { companyId },
      date: { gte: new Date() }
    }
  });

  const completedShiftsCount = await prisma.shift.count({
    where: {
      job: { companyId },
      date: { lt: new Date() }
    }
  });

  const recentJobs = await prisma.job.findMany({
    where: { companyId },
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 3
  });

  const upcomingShifts = await prisma.shift.findMany({
    where: {
      job: { companyId },
      date: { gte: new Date() }
    },
    include: {
      job: { include: { company: { select: { name: true } } } }
    },
    orderBy: { date: 'asc' },
    take: 3
  });

  // Convert Date objects to ISO strings
  const serializedUpcomingShifts = upcomingShifts.map(shift => ({
    ...shift,
    date: shift.date.toISOString(),
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString(),
    startTime: shift.startTime.toISOString()
  }));

  const serializedRecentJobs = recentJobs.map(job => ({
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startDate: job.startDate.toISOString(),
    endDate: job.endDate?.toISOString()
  }));

  return {
    activeJobsCount,
    upcomingShiftsCount,
    completedShiftsCount,
    recentJobs: serializedRecentJobs,
    upcomingShifts: serializedUpcomingShifts
  };
}
