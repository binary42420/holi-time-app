import { prisma } from '@/lib/prisma';
import { Prisma, UserRole, ShiftStatus, JobStatus } from '@prisma/client';
import { serverCache, cacheKeys, cacheTags } from '@/lib/cache-server';

interface QueryOptions {
  useCache?: boolean;
  cacheTime?: number;
  tags?: string[];
}

export class DatabaseQueryService {
  private static instance: DatabaseQueryService;

  static getInstance(): DatabaseQueryService {
    if (!DatabaseQueryService.instance) {
      DatabaseQueryService.instance = new DatabaseQueryService();
    }
    return DatabaseQueryService.instance;
  }

  private async executeWithCache<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const { useCache = true, cacheTime = 5 * 60 * 1000, tags = [] } = options;

    if (!useCache) {
      return queryFn();
    }

    const cached = serverCache.get<T>(key);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    const result = await queryFn();
    serverCache.set(key, result, cacheTime, tags);
    return result;
  }

  // Optimized shift queries
  async getShiftsOptimized(filters: {
    userId?: string;
    userRole?: UserRole;
    companyId?: string;
    status?: string;
    date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const cacheKey = `shifts-optimized-${JSON.stringify(filters)}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const { userId, userRole, companyId, status, date, search, page = 1, limit = 50 } = filters;
        
        // Build optimized where clause
        const where: Prisma.ShiftWhereInput = {};
        
        // Role-based filtering with optimized queries
        if (userRole === UserRole.CompanyUser && companyId) {
          where.job = { companyId };
        } else if (userRole === UserRole.CrewChief && userId) {
          where.assignedPersonnel = { 
            some: { 
              userId, 
              roleCode: 'CC',
              status: { not: 'NoShow' }
            } 
          };
        } else if ((userRole === UserRole.Staff || userRole === UserRole.Employee) && userId) {
          where.assignedPersonnel = { 
            some: { 
              userId,
              status: { not: 'NoShow' }
            } 
          };
        }

        // Additional filters
        if (status && status !== 'all') {
          const statusMap: Record<string, ShiftStatus> = {
            'Upcoming': ShiftStatus.Pending,
            'Active': ShiftStatus.Active,
            'In Progress': ShiftStatus.InProgress,
            'Completed': ShiftStatus.Completed,
            'Cancelled': ShiftStatus.Cancelled,
          };
          where.status = statusMap[status];
        }

        // Date filtering with optimized queries
        if (date && date !== 'all') {
          const now = new Date();
          let startDate: Date, endDate: Date;
          
          switch (date) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
              break;
            case 'tomorrow':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
              endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
              break;
            case 'this_week': {
              const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
              startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
              endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
              break;
            }
            case 'this_month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
              break;
            default:
              startDate = new Date(date);
              endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          }
          
          where.date = { gte: startDate, lt: endDate };
        }

        // Search optimization
        if (search) {
          where.OR = [
            { job: { name: { contains: search, mode: 'insensitive' } } },
            { job: { company: { name: { contains: search, mode: 'insensitive' } } } },
            { location: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        // Optimized select with minimal data
        const select = {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          location: true,
          description: true,
          requiredCrewChiefs: true,
          requiredStagehands: true,
          requiredForkOperators: true,
          requiredReachForkOperators: true,
          requiredRiggers: true,
          requiredGeneralLaborers: true,
          job: {
            select: {
              id: true,
              name: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assignedPersonnel: {
            select: {
              id: true,
              roleCode: true,
              status: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          timesheets: {
            select: {
              id: true,
              status: true,
            },
          },
        };

        // Execute optimized query with transaction
        const [shifts, total] = await prisma.$transaction([
          prisma.shift.findMany({
            where,
            select,
            orderBy: [
              { date: 'desc' },
              { startTime: 'asc' }
            ],
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.shift.count({ where }),
        ]);

        return {
          shifts,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
        };
      },
      { 
        useCache: true, 
        cacheTime: 2 * 60 * 1000, // 2 minutes for shifts
        tags: [cacheTags.shifts, cacheTags.assignments] 
      }
    );
  }

  // Optimized job queries
  async getJobsOptimized(filters: {
    companyId?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
    userId?: string; // Add userId to filters
  }) {
    const cacheKey = `jobs-optimized-${JSON.stringify(filters)}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const { companyId, status, search, sortBy = 'recentShifts', limit = 100, userId } = filters;
        
        const where: Prisma.JobWhereInput = {};
        
        if (status && status !== 'all') {
          where.status = status as JobStatus;
        }
        
        if (companyId && companyId !== 'all') {
          where.companyId = companyId;
        }

        if (userId) {
          // Filter jobs by shifts assigned to the user
          where.shifts = {
            some: {
              assignedPersonnel: {
                some: {
                  userId: userId,
                  status: { not: 'NoShow' }
                }
              }
            }
          };
        }
        
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { company: { name: { contains: search, mode: 'insensitive' } } },
          ];
        }

        const orderBy = sortBy === 'recentShifts'
          ? [{ updatedAt: 'desc' as const }, { createdAt: 'desc' as const }]
          : [{ createdAt: 'desc' as const }];

        const jobs = await prisma.job.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
            location: true,
            createdAt: true,
            updatedAt: true,
            company: {
              select: {
                id: true,
                name: true,
                company_logo_url: true,
              },
            },
            shifts: {
              select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                status: true,
                requiredCrewChiefs: true,
                requiredStagehands: true,
                requiredForkOperators: true,
                requiredReachForkOperators: true,
                requiredRiggers: true,
                requiredGeneralLaborers: true,
                assignedPersonnel: {
                  select: {
                    id: true,
                    userId: true,
                    roleCode: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                timesheets: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
              orderBy: { date: 'desc' },
              take: 3,
            },
            _count: {
              select: {
                shifts: true,
              },
            },
          },
          orderBy,
          take: limit,
        });

        // Calculate fulfillment efficiently
        const jobsWithFulfillment = jobs.map(job => {
          const recentShifts = job.shifts.map(shift => {
            const required = (shift.requiredCrewChiefs ?? 0) +
                           (shift.requiredStagehands ?? 0) +
                           (shift.requiredForkOperators ?? 0) +
                           (shift.requiredReachForkOperators ?? 0) +
                           (shift.requiredRiggers ?? 0) +
                           (shift.requiredGeneralLaborers ?? 0);
            // Only count assignments that have actual users assigned
            const assigned = shift.assignedPersonnel.filter(p => p.user && p.userId).length;
            return { 
              ...shift, 
              fulfillment: `${assigned}/${required}`,
              fulfillmentPercentage: required > 0 ? Math.round((assigned / required) * 100) : 100
            };
          });
          
          return { 
            ...job, 
            recentShifts,
            totalShifts: job._count.shifts
          };
        });

        return jobsWithFulfillment;
      },
      { 
        useCache: true, 
        cacheTime: 5 * 60 * 1000, // 5 minutes for jobs
        tags: [cacheTags.jobs, cacheTags.shifts] 
      }
    );
  }

  // Optimized user queries
  async getUsersOptimized(filters: {
    role?: UserRole;
    companyId?: string;
    isActive?: boolean;
    excludeCompanyUsers?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
    fetchAll?: boolean;
  }) {
    const cacheKey = `users-optimized-${JSON.stringify(filters)}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const { 
          role, 
          companyId, 
          isActive = true, 
          excludeCompanyUsers = false,
          search,
          page = 1, 
          pageSize = 20, 
          fetchAll = false 
        } = filters;
        
        const where: Prisma.UserWhereInput = { isActive };
        
        if (role) {
          where.role = role;
        }
        
        if (companyId) {
          where.companyId = companyId;
        }

        // Exclude CompanyUsers if requested
        if (excludeCompanyUsers) {
          where.role = { not: UserRole.CompanyUser };
        }

        // Add search functionality
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }

        const select = {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          companyId: true,
          crew_chief_eligible: true,
          fork_operator_eligible: true,
          certifications: true,
          performance: true,
          location: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        };

        if (fetchAll) {
          const users = await prisma.user.findMany({
            where,
            select,
            orderBy: { name: 'asc' },
          });
          
          return {
            users,
            total: users.length,
            pages: 1,
            currentPage: 1,
          };
        }

        const [users, total] = await prisma.$transaction([
          prisma.user.findMany({
            where,
            select,
            orderBy: { name: 'asc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          prisma.user.count({ where }),
        ]);

        return {
          users,
          total,
          pages: Math.ceil(total / pageSize),
          currentPage: page,
        };
      },
      { 
        useCache: true, 
        cacheTime: 10 * 60 * 1000, // 10 minutes for users
        tags: ['users'] 
      }
    );
  }

  // Dashboard data optimization
  async getCompanyDashboardOptimized(companyId: string) {
    const cacheKey = `company-dashboard-${companyId}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Use aggregation queries for better performance
        const [
          activeJobsCount,
          upcomingShiftsCount,
          completedShiftsCount,
          todayShiftsCount,
          weekShiftsCount,
          monthShiftsCount,
          recentJobs,
          upcomingShifts,
        ] = await prisma.$transaction([
          // Active jobs count
          prisma.job.count({
            where: { 
              companyId, 
              status: { in: ['Active', 'Pending'] }
            },
          }),
          
          // Upcoming shifts count
          prisma.shift.count({
            where: {
              job: { companyId },
              status: { in: ['Pending', 'Active'] },
              date: { gte: startOfToday },
            },
          }),
          
          // Completed shifts count
          prisma.shift.count({
            where: {
              job: { companyId },
              status: 'Completed',
            },
          }),
          
          // Today's shifts count
          prisma.shift.count({
            where: {
              job: { companyId },
              date: {
                gte: startOfToday,
                lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
              },
            },
          }),
          
          // This week's shifts count
          prisma.shift.count({
            where: {
              job: { companyId },
              date: { gte: startOfWeek },
            },
          }),
          
          // This month's shifts count
          prisma.shift.count({
            where: {
              job: { companyId },
              date: { gte: startOfMonth },
            },
          }),
          
          // Recent jobs
          prisma.job.findMany({
            where: { companyId },
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
              _count: {
                select: {
                  shifts: true,
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
          }),
          
          // Upcoming shifts
          prisma.shift.findMany({
            where: {
              job: { companyId },
              status: { in: ['Pending', 'Active'] },
              date: { gte: startOfToday },
            },
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
              status: true,
              location: true,
              job: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  assignedPersonnel: true,
                },
              },
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
            take: 5,
          }),
        ]);

        return {
          activeJobsCount,
          upcomingShiftsCount,
          completedShiftsCount,
          todayShiftsCount,
          weekShiftsCount,
          monthShiftsCount,
          recentJobs,
          upcomingShifts,
          lastUpdated: new Date().toISOString(),
        };
      },
      { 
        useCache: true, 
        cacheTime: 3 * 60 * 1000, // 3 minutes for dashboard
        tags: [cacheTags.jobs, cacheTags.shifts] 
      }
    );
  }

  // Clear cache for specific entities
  invalidateCache(tags: string[]) {
    tags.forEach(tag => serverCache.invalidateByTag(tag));
  }
}

export const dbQueryService = DatabaseQueryService.getInstance();