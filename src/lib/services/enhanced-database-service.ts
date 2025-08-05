import { prisma } from '@/lib/prisma';
import { Prisma, UserRole, ShiftStatus, JobStatus } from '@prisma/client';
import { serverCache, cacheKeys, cacheTags } from '@/lib/cache-server';

interface QueryOptions {
  useCache?: boolean;
  cacheTime?: number;
  tags?: string[];
  timeout?: number;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

interface QueryMetrics {
  queryTime: number;
  cacheHit: boolean;
  resultCount: number;
}

export class EnhancedDatabaseService {
  private static instance: EnhancedDatabaseService;
  private queryMetrics: Map<string, QueryMetrics[]> = new Map();

  static getInstance(): EnhancedDatabaseService {
    if (!EnhancedDatabaseService.instance) {
      EnhancedDatabaseService.instance = new EnhancedDatabaseService();
    }
    return EnhancedDatabaseService.instance;
  }

  private async executeWithCache<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const { useCache = true, cacheTime = 5 * 60 * 1000, tags = [], timeout = 30000 } = options;

    if (!useCache) {
      const result = await this.executeWithTimeout(queryFn, timeout);
      this.recordMetrics(key, Date.now() - startTime, false, this.getResultCount(result));
      return result;
    }

    const cached = serverCache.get<T>(key);
    if (cached && !cached.isStale) {
      this.recordMetrics(key, Date.now() - startTime, true, this.getResultCount(cached.data));
      return cached.data;
    }

    const result = await this.executeWithTimeout(queryFn, timeout);
    serverCache.set(key, result, cacheTime, tags);
    this.recordMetrics(key, Date.now() - startTime, false, this.getResultCount(result));
    return result;
  }

  private async executeWithTimeout<T>(queryFn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
  }

  private getResultCount(result: any): number {
    if (Array.isArray(result)) return result.length;
    if (result && typeof result === 'object' && 'total' in result) return result.total;
    return 1;
  }

  private recordMetrics(key: string, queryTime: number, cacheHit: boolean, resultCount: number) {
    if (!this.queryMetrics.has(key)) {
      this.queryMetrics.set(key, []);
    }
    const metrics = this.queryMetrics.get(key)!;
    metrics.push({ queryTime, cacheHit, resultCount });
    
    // Keep only last 100 metrics per query
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }

  // Enhanced shifts query with better includes and cursor pagination
  async getShiftsOptimized(filters: {
    userId?: string;
    userRole?: UserRole;
    companyId?: string;
    status?: string;
    date?: string;
    search?: string;
    jobId?: string;
    pagination?: PaginationOptions;
  }) {
    const { pagination = {} } = filters;
    const { page = 1, limit = 50, cursor } = pagination;
    const cacheKey = `shifts-enhanced-${JSON.stringify({ ...filters, pagination })}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const { userId, userRole, companyId, status, date, search, jobId } = filters;
        
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
        if (jobId) where.jobId = jobId;
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

        // Date filtering
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

        // Enhanced select with proper includes to prevent N+1
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
          requestedWorkers: true,
          job: {
            select: {
              id: true,
              name: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  company_logo_url: true,
                },
              },
            },
          },
          assignedPersonnel: {
            select: {
              id: true,
              userId: true,
              roleCode: true,
              status: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarData: true,
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

        // Use cursor-based pagination for better performance on large datasets
        const findManyOptions: Prisma.ShiftFindManyArgs = {
          where,
          select,
          orderBy: [
            { date: 'desc' },
            { startTime: 'asc' }
          ],
          take: limit,
        };

        if (cursor) {
          findManyOptions.cursor = { id: cursor };
          findManyOptions.skip = 1; // Skip the cursor
        } else {
          findManyOptions.skip = (page - 1) * limit;
        }

        // Execute optimized query with transaction for consistency
        const [shifts, total] = await prisma.$transaction([
          prisma.shift.findMany(findManyOptions),
          prisma.shift.count({ where }),
        ]);

        // Transform data to include avatar URLs
        const transformedShifts = shifts.map(shift => ({
          ...shift,
          assignedPersonnel: shift.assignedPersonnel.map(assignment => ({
            ...assignment,
            user: assignment.user ? {
              ...assignment.user,
              avatarUrl: assignment.user.avatarData ? `/api/users/${assignment.user.id}/avatar/image` : null,
            } : null,
          })),
        }));

        return {
          shifts: transformedShifts,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          hasNextPage: shifts.length === limit,
          nextCursor: shifts.length === limit ? shifts[shifts.length - 1].id : null,
        };
      },
      { 
        useCache: true, 
        cacheTime: 2 * 60 * 1000, // 2 minutes for shifts
        tags: [cacheTags.shifts, cacheTags.assignments],
        timeout: 15000 // 15 second timeout
      }
    );
  }

  // Enhanced jobs query with better aggregation
  async getJobsOptimized(filters: {
    companyId?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    userId?: string;
    pagination?: PaginationOptions;
  }) {
    const { pagination = {} } = filters;
    const { limit = 100, cursor } = pagination;
    const cacheKey = `jobs-enhanced-${JSON.stringify({ ...filters, pagination })}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const { companyId, status, search, sortBy = 'recentShifts', userId } = filters;
        
        const where: Prisma.JobWhereInput = {};
        
        if (status && status !== 'all') {
          where.status = status as JobStatus;
        }
        
        if (companyId && companyId !== 'all') {
          where.companyId = companyId;
        }

        if (userId) {
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

        // Build shifts where clause for user filtering
        const shiftsWhere: Prisma.ShiftWhereInput = userId ? {
          assignedPersonnel: {
            some: {
              userId: userId,
              status: { not: 'NoShow' }
            }
          }
        } : {};

        const findManyOptions: Prisma.JobFindManyArgs = {
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
              where: shiftsWhere,
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
                requestedWorkers: true,
                assignedPersonnel: {
                  select: {
                    id: true,
                    userId: true,
                    roleCode: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        avatarData: true,
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
                shifts: userId ? {
                  where: shiftsWhere
                } : true,
              },
            },
          },
          orderBy,
          take: limit,
        };

        if (cursor) {
          findManyOptions.cursor = { id: cursor };
          findManyOptions.skip = 1;
        }

        const jobs = await prisma.job.findMany(findManyOptions);

        // Calculate fulfillment efficiently and transform avatar data
        const jobsWithFulfillment = jobs.map(job => {
          const recentShifts = job.shifts.map(shift => {
            const required = (shift.requiredCrewChiefs ?? 0) +
                           (shift.requiredStagehands ?? 0) +
                           (shift.requiredForkOperators ?? 0) +
                           (shift.requiredReachForkOperators ?? 0) +
                           (shift.requiredRiggers ?? 0) +
                           (shift.requiredGeneralLaborers ?? 0);
            const assigned = shift.assignedPersonnel.filter(p => p.userId).length;
            const requested = required || shift.requestedWorkers || 0;
            
            const transformedAssignments = shift.assignedPersonnel.map(assignment => ({
              ...assignment,
              user: assignment.user ? {
                ...assignment.user,
                avatarUrl: assignment.user.avatarData ? `/api/users/${assignment.user.id}/avatar/image` : null,
              } : null,
            }));
            
            return { 
              ...shift, 
              assignedPersonnel: transformedAssignments,
              fulfillment: `${assigned}/${requested}`,
              fulfillmentPercentage: requested > 0 ? Math.round((assigned / requested) * 100) : 100,
              totalRequired: requested,
              totalAssigned: assigned
            };
          });
          
          return { 
            ...job, 
            recentShifts,
            totalShifts: job._count.shifts,
            hasNextPage: jobs.length === limit,
            nextCursor: jobs.length === limit ? jobs[jobs.length - 1].id : null,
          };
        });

        return jobsWithFulfillment;
      },
      { 
        useCache: true, 
        cacheTime: 5 * 60 * 1000, // 5 minutes for jobs
        tags: [cacheTags.jobs, cacheTags.shifts],
        timeout: 20000 // 20 second timeout
      }
    );
  }

  // Enhanced users query with better pagination
  async getUsersOptimized(filters: {
    role?: UserRole;
    companyId?: string;
    isActive?: boolean;
    excludeCompanyUsers?: boolean;
    search?: string;
    pagination?: PaginationOptions;
    fetchAll?: boolean;
  }) {
    const { pagination = {} } = filters;
    const { page = 1, pageSize = 20, cursor } = pagination;
    const cacheKey = `users-enhanced-${JSON.stringify({ ...filters, pagination })}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const { 
          role, 
          companyId, 
          isActive = true, 
          excludeCompanyUsers = false,
          search,
          fetchAll = false 
        } = filters;
        
        const where: Prisma.UserWhereInput = { isActive };
        
        if (role) {
          where.role = role;
        }
        
        if (companyId) {
          where.companyId = companyId;
        }

        if (excludeCompanyUsers) {
          where.role = { not: UserRole.CompanyUser };
        }

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
          OSHA_10_Certifications: true,
          certifications: true,
          performance: true,
          avatarData: true,
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
          
          const usersWithAvatarUrl = users.map(user => ({
            ...user,
            avatarUrl: user.avatarData 
              ? `/api/users/${user.id}/avatar/image`
              : null,
          }));
          
          return {
            users: usersWithAvatarUrl,
            total: users.length,
            pages: 1,
            currentPage: 1,
            hasNextPage: false,
            nextCursor: null,
          };
        }

        const findManyOptions: Prisma.UserFindManyArgs = {
          where,
          select,
          orderBy: { name: 'asc' },
          take: pageSize,
        };

        if (cursor) {
          findManyOptions.cursor = { id: cursor };
          findManyOptions.skip = 1;
        } else {
          findManyOptions.skip = (page - 1) * pageSize;
        }

        const [users, total] = await prisma.$transaction([
          prisma.user.findMany(findManyOptions),
          prisma.user.count({ where }),
        ]);

        const usersWithAvatarUrl = users.map(user => ({
          ...user,
          avatarUrl: user.avatarData 
            ? `/api/users/${user.id}/avatar/image`
            : null,
        }));

        return {
          users: usersWithAvatarUrl,
          total,
          pages: Math.ceil(total / pageSize),
          currentPage: page,
          hasNextPage: users.length === pageSize,
          nextCursor: users.length === pageSize ? users[users.length - 1].id : null,
        };
      },
      { 
        useCache: true, 
        cacheTime: 10 * 60 * 1000, // 10 minutes for users
        tags: ['users'],
        timeout: 10000 // 10 second timeout
      }
    );
  }

  // Get query performance metrics
  getQueryMetrics(queryKey?: string) {
    if (queryKey) {
      return this.queryMetrics.get(queryKey) || [];
    }
    
    const allMetrics: Record<string, any> = {};
    for (const [key, metrics] of this.queryMetrics.entries()) {
      const avgQueryTime = metrics.reduce((sum, m) => sum + m.queryTime, 0) / metrics.length;
      const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length;
      const avgResultCount = metrics.reduce((sum, m) => sum + m.resultCount, 0) / metrics.length;
      
      allMetrics[key] = {
        totalQueries: metrics.length,
        avgQueryTime: Math.round(avgQueryTime),
        cacheHitRate: Math.round(cacheHitRate * 100),
        avgResultCount: Math.round(avgResultCount),
        lastQuery: metrics[metrics.length - 1],
      };
    }
    
    return allMetrics;
  }

  // Clear cache for specific entities
  invalidateCache(tags: string[]) {
    tags.forEach(tag => serverCache.invalidateByTag(tag));
  }

  // Clear all metrics
  clearMetrics() {
    this.queryMetrics.clear();
  }
}

export const enhancedDbService = EnhancedDatabaseService.getInstance();