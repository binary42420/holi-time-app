import { prisma } from '../prisma';
import { Job, Prisma, UserRole, JobStatus, User } from '@prisma/client';
import { hasAnyRole } from '../auth';

// Define a type for the job with its relations
export type JobWithDetails = Prisma.JobGetPayload<{
  include: {
    company: true;
    shifts: {
      include: {
        assignedPersonnel: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

export type JobForList = Prisma.JobGetPayload<{
  select: {
    id: true;
    name: true;
    status: true;
    startDate: true;
    endDate: true;
    company: {
      select: {
        name: true;
      };
    };
  };
}>;

export async function getAllJobs(user: User): Promise<JobForList[]> {
  if (!hasAnyRole(user, [UserRole.Admin, UserRole.Staff, UserRole.CrewChief])) {
    throw new Error('Not authorized to view all jobs');
  }
  return prisma.job.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getJobById(
  user: User,
  id: string
): Promise<JobWithDetails | null> {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: true,
      shifts: {
        orderBy: {
          date: 'asc',
        },
        include: {
          assignedPersonnel: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!job) return null;

  if (
    !hasAnyRole(user, [UserRole.Admin]) &&
    user.companyId !== job.companyId
  ) {
    throw new Error('Not authorized to view this job');
  }

  return job;
}

export async function getJobsByCompanyId(id: string): Promise<JobForList[]> {
  return prisma.job.findMany({
    where: { companyId: id },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateJob(
  user: User,
  id: string,
  data: {
    name?: string;
    description?: string | null;
    companyId?: string;
    status?: string;
    isCompleted?: boolean;
  }
): Promise<JobWithDetails> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new Error('Job not found');

  if (
    !hasAnyRole(user, [UserRole.Admin]) &&
    user.companyId !== job.companyId
  ) {
    throw new Error('Not authorized to update this job');
  }

  const { companyId, status, isCompleted, ...restData } = data;
  return prisma.job.update({
    where: { id },
    data: { 
      ...restData, 
      ...(status && { status: status as JobStatus }),
      ...(typeof isCompleted === 'boolean' && { isCompleted }),
    },
    include: {
      company: true,
      shifts: {
        include: {
          assignedPersonnel: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
}
export async function deleteJob(user: User, id: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new Error('Job not found');

  if (
    !hasAnyRole(user, [UserRole.Admin]) &&
    user.companyId !== job.companyId
  ) {
    throw new Error('Not authorized to delete this job');
  }

  await prisma.job.delete({
    where: { id },
  });
}

export async function createJob(
  user: User,
  data: {
    name: string;
    description?: string;
    companyId: string;
    startDate?: Date;
  }
): Promise<Job> {
  if (
    !hasAnyRole(user, [UserRole.Admin]) &&
    user.companyId !== data.companyId
  ) {
    throw new Error('Not authorized to create a job for this company');
  }
  return prisma.job.create({
    data: {
      name: data.name,
      description: data.description,
      companyId: data.companyId,
      startDate: data.startDate,
    },
  });
}
