import { QueryClient } from '@tanstack/react-query';
import { apiService } from './api';
import { getAvatarService } from './avatar-service';

/**
 * Enhanced Performance Service with intelligent caching and prefetching
 */
export class EnhancedPerformanceService {
  private queryClient: QueryClient;
  private prefetchQueue: Set<string> = new Set();
  private backgroundInterval: any = null;
  private performanceMetrics: Map<string, number> = new Map();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.startBackgroundOptimization();
  }

  /**
   * Smart prefetch based on user behavior and role
   */
  async smartPrefetch(userRole: string, currentPage: string, userId?: string): Promise<void> {
    const startTime = Date.now();
    console.log(`🧠 Smart prefetching for ${userRole} on ${currentPage}...`);

    const prefetchTasks: Promise<void>[] = [];

    // Always prefetch critical data
    prefetchTasks.push(this.prefetchCriticalData());

    // Role-based prefetching
    switch (userRole) {
      case 'Admin':
        prefetchTasks.push(
          this.prefetchAdminData(),
          this.prefetchAllUserAvatars()
        );
        break;
      case 'CrewChief':
        prefetchTasks.push(
          this.prefetchCrewChiefData(),
          this.prefetchTeamAvatars()
        );
        break;
      case 'Staff':
        prefetchTasks.push(this.prefetchStaffData());
        break;
    }

    // Page-specific prefetching
    switch (currentPage) {
      case '/shifts':
        prefetchTasks.push(
          this.prefetchShiftsPageData(),
          this.prefetchShiftUserAvatars()
        );
        break;
      case '/profile':
        if (userId) {
          prefetchTasks.push(this.prefetchProfileData(userId));
        }
        break;
      case '/admin/employees':
        prefetchTasks.push(this.prefetchEmployeeData());
        break;
    }

    // Execute all prefetch tasks
    const results = await Promise.allSettled(prefetchTasks);
    const failed = results.filter(r => r.status === 'rejected').length;
    
    const duration = Date.now() - startTime;
    this.recordMetric('smartPrefetch', duration);

    console.log(`✅ Smart prefetch completed in ${duration}ms (${failed} failed)`);
  }

  /**
   * Prefetch critical data that's needed on every page
   */
  private async prefetchCriticalData(): Promise<void> {
    const criticalQueries = [
      {
        queryKey: ['shifts', { date: 'today' }],
        queryFn: () => apiService.getShifts({ date: 'today' }),
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
      {
        queryKey: ['shifts', { date: 'tomorrow' }],
        queryFn: () => apiService.getShifts({ date: 'tomorrow' }),
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    ];

    await Promise.allSettled(
      criticalQueries.map(query => this.queryClient.prefetchQuery(query))
    );
  }

  /**
   * Prefetch data for admin users
   */
  private async prefetchAdminData(): Promise<void> {
    const adminQueries = [
      {
        queryKey: ['users', { page: 1, pageSize: 50 }],
        queryFn: () => apiService.getUsers({ page: 1, pageSize: 50 }),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['companies'],
        queryFn: () => apiService.getCompanies(),
        staleTime: 15 * 60 * 1000,
      },
      {
        queryKey: ['jobs', { page: 1, pageSize: 50 }],
        queryFn: () => apiService.getJobs({ page: 1, pageSize: 50 }),
        staleTime: 10 * 60 * 1000,
      },
    ];

    await Promise.allSettled(
      adminQueries.map(query => this.queryClient.prefetchQuery(query))
    );
  }

  /**
   * Prefetch data for crew chiefs
   */
  private async prefetchCrewChiefData(): Promise<void> {
    const crewChiefQueries = [
      {
        queryKey: ['shifts', { status: 'Upcoming' }],
        queryFn: () => apiService.getShifts({ status: 'Upcoming' }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['shifts', { status: 'In Progress' }],
        queryFn: () => apiService.getShifts({ status: 'In Progress' }),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['users', { role: 'Staff' }],
        queryFn: () => apiService.getUsers({ role: 'Staff' }),
        staleTime: 10 * 60 * 1000,
      },
    ];

    await Promise.allSettled(
      crewChiefQueries.map(query => this.queryClient.prefetchQuery(query))
    );
  }

  /**
   * Prefetch data for staff users
   */
  private async prefetchStaffData(): Promise<void> {
    const staffQueries = [
      {
        queryKey: ['shifts', { date: 'this_week' }],
        queryFn: () => apiService.getShifts({ date: 'this_week' }),
        staleTime: 10 * 60 * 1000,
      },
    ];

    await Promise.allSettled(
      staffQueries.map(query => this.queryClient.prefetchQuery(query))
    );
  }

  /**
   * Prefetch shifts page specific data
   */
  private async prefetchShiftsPageData(): Promise<void> {
    const shiftsPageQueries = [
      {
        queryKey: ['shifts', { date: 'this_week' }],
        queryFn: () => apiService.getShifts({ date: 'this_week' }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['shifts', { status: 'Upcoming' }],
        queryFn: () => apiService.getShifts({ status: 'Upcoming' }),
        staleTime: 5 * 60 * 1000,
      },
    ];

    await Promise.allSettled(
      shiftsPageQueries.map(query => this.queryClient.prefetchQuery(query))
    );
  }

  /**
   * Prefetch profile page data
   */
  private async prefetchProfileData(userId: string): Promise<void> {
    const avatarService = getAvatarService(this.queryClient);
    
    await Promise.allSettled([
      this.queryClient.prefetchQuery({
        queryKey: ['users', userId],
        queryFn: () => apiService.getUserById(userId),
        staleTime: 5 * 60 * 1000,
      }),
      avatarService.prefetchAvatar(userId),
    ]);
  }

  /**
   * Prefetch employee data for admin pages
   */
  private async prefetchEmployeeData(): Promise<void> {
    const avatarService = getAvatarService(this.queryClient);
    
    // First get users, then prefetch their avatars
    try {
      const users = await apiService.getUsers({ page: 1, pageSize: 100 });
      const userIds = users.users?.map(user => user.id) || [];
      
      if (userIds.length > 0) {
        await avatarService.prefetchAvatars(userIds);
      }
    } catch (error) {
      console.warn('⚠️ Failed to prefetch employee avatars:', error);
    }
  }

  /**
   * Prefetch avatars for all users (admin only)
   */
  private async prefetchAllUserAvatars(): Promise<void> {
    try {
      const users = await apiService.getUsers({ fetchAll: true });
      const userIds = users.users?.map(user => user.id) || [];
      
      if (userIds.length > 0) {
        const avatarService = getAvatarService(this.queryClient);
        await avatarService.prefetchAvatars(userIds);
      }
    } catch (error) {
      console.warn('⚠️ Failed to prefetch all user avatars:', error);
    }
  }

  /**
   * Prefetch avatars for team members (crew chief)
   */
  private async prefetchTeamAvatars(): Promise<void> {
    try {
      const users = await apiService.getUsers({ role: 'Staff', pageSize: 50 });
      const userIds = users.users?.map(user => user.id) || [];
      
      if (userIds.length > 0) {
        const avatarService = getAvatarService(this.queryClient);
        await avatarService.prefetchAvatars(userIds);
      }
    } catch (error) {
      console.warn('⚠️ Failed to prefetch team avatars:', error);
    }
  }

  /**
   * Prefetch avatars for users in current shifts
   */
  private async prefetchShiftUserAvatars(): Promise<void> {
    try {
      const shifts = await apiService.getShifts({ date: 'today' });
      const userIds = new Set<string>();
      
      shifts.forEach((shift: any) => {
        shift.assignments?.forEach((assignment: any) => {
          if (assignment.user?.id) {
            userIds.add(assignment.user.id);
          }
        });
      });

      if (userIds.size > 0) {
        const avatarService = getAvatarService(this.queryClient);
        await avatarService.prefetchAvatars(Array.from(userIds));
      }
    } catch (error) {
      console.warn('⚠️ Failed to prefetch shift user avatars:', error);
    }
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async warmCache(userRole: string): Promise<void> {
    console.log(`🔥 Warming cache for ${userRole}...`);
    
    const warmingTasks: Promise<void>[] = [];

    // Common data that's accessed frequently
    const commonQueries = [
      { key: ['shifts', { date: 'today' }], priority: 'high' },
      { key: ['shifts', { date: 'tomorrow' }], priority: 'high' },
      { key: ['shifts', { status: 'Upcoming' }], priority: 'medium' },
      { key: ['users', { page: 1, pageSize: 20 }], priority: 'medium' },
    ];

    // Prioritize high-priority queries
    const highPriorityQueries = commonQueries.filter(q => q.priority === 'high');
    for (const query of highPriorityQueries) {
      warmingTasks.push(this.warmQueryCache(query.key));
    }

    // Execute high priority first
    await Promise.allSettled(warmingTasks);

    // Then medium priority
    const mediumPriorityTasks = commonQueries
      .filter(q => q.priority === 'medium')
      .map(q => this.warmQueryCache(q.key));

    await Promise.allSettled(mediumPriorityTasks);
    
    console.log('✅ Cache warming completed');
  }

  /**
   * Warm a specific query cache
   */
  private async warmQueryCache(queryKey: any[]): Promise<void> {
    try {
      const existingData = this.queryClient.getQueryData(queryKey);
      if (!existingData) {
        // Only warm if not already cached
        await this.queryClient.prefetchQuery({
          queryKey,
          queryFn: () => this.getQueryFunction(queryKey),
          staleTime: 5 * 60 * 1000,
        });
      }
    } catch (error) {
      console.warn(`⚠️ Failed to warm cache for ${queryKey}:`, error);
    }
  }

  /**
   * Get appropriate query function based on query key
   */
  private getQueryFunction(queryKey: any[]): Promise<any> {
    const [type, params] = queryKey;
    
    switch (type) {
      case 'shifts':
        return apiService.getShifts(params);
      case 'users':
        return apiService.getUsers(params);
      case 'companies':
        return apiService.getCompanies();
      case 'jobs':
        return apiService.getJobs(params);
      default:
        throw new Error(`Unknown query type: ${type}`);
    }
  }

  /**
   * Optimize stale queries by refreshing them in background
   */
  async optimizeStaleQueries(): Promise<void> {
    const cache = this.queryClient.getQueryCache();
    const staleQueries = cache.getAll().filter(query => query.isStale());
    
    if (staleQueries.length === 0) return;

    console.log(`🔄 Optimizing ${staleQueries.length} stale queries...`);

    // Refresh stale queries in background
    const refreshTasks = staleQueries.map(query => 
      this.queryClient.invalidateQueries({
        queryKey: query.queryKey,
        refetchType: 'none', // Don't refetch immediately
      }).catch(error => 
        console.warn(`⚠️ Failed to invalidate query ${query.queryKey}:`, error)
      )
    );

    await Promise.allSettled(refreshTasks);
  }

  /**
   * Record performance metrics
   */
  private recordMetric(operation: string, duration: number): void {
    this.performanceMetrics.set(`${operation}_${Date.now()}`, duration);
    
    // Keep only last 100 metrics
    if (this.performanceMetrics.size > 100) {
      const oldestKey = Array.from(this.performanceMetrics.keys())[0];
      this.performanceMetrics.delete(oldestKey);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const metrics = Array.from(this.performanceMetrics.values());
    
    if (metrics.length === 0) {
      return { avgDuration: 0, minDuration: 0, maxDuration: 0, totalOperations: 0 };
    }

    return {
      avgDuration: metrics.reduce((a, b) => a + b, 0) / metrics.length,
      minDuration: Math.min(...metrics),
      maxDuration: Math.max(...metrics),
      totalOperations: metrics.length,
    };
  }

  /**
   * Start background optimization
   */
  private startBackgroundOptimization(): void {
    this.backgroundInterval = setInterval(async () => {
      try {
        await this.optimizeStaleQueries();
        
        // Clean up avatar service cache
        const avatarService = getAvatarService(this.queryClient);
        avatarService.cleanupStaleCache();
        
      } catch (error) {
        console.warn('⚠️ Background optimization failed:', error);
      }
    }, 3 * 60 * 1000); // Every 3 minutes
  }

  /**
   * Stop background optimization
   */
  stopBackgroundOptimization(): void {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
  }

  /**
   * Enhanced cache statistics
   */
  getEnhancedCacheStats() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    const avatarService = getAvatarService(this.queryClient);
    
    return {
      reactQuery: {
        totalQueries: queries.length,
        freshQueries: queries.filter(q => !q.isStale()).length,
        staleQueries: queries.filter(q => q.isStale()).length,
        errorQueries: queries.filter(q => q.state.status === 'error').length,
      },
      avatarCache: avatarService.getCacheStats(),
      performance: this.getPerformanceStats(),
      memoryUsage: this.estimateMemoryUsage(queries),
    };
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(queries: any[]): number {
    let totalSize = 0;
    queries.forEach(query => {
      if (query.state.data) {
        try {
          totalSize += JSON.stringify(query.state.data).length * 2;
        } catch (e) {
          // Skip if data can't be stringified
        }
      }
    });
    return totalSize;
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.stopBackgroundOptimization();
    this.prefetchQueue.clear();
    this.performanceMetrics.clear();
  }
}

// Singleton instance
let enhancedPerformanceService: EnhancedPerformanceService | null = null;

export const getEnhancedPerformanceService = (queryClient: QueryClient): EnhancedPerformanceService => {
  if (!enhancedPerformanceService) {
    enhancedPerformanceService = new EnhancedPerformanceService(queryClient);
  }
  return enhancedPerformanceService;
};