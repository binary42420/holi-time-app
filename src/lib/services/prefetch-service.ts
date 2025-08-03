import { QueryClient } from '@tanstack/react-query';
import { apiService } from './api';

/**
 * Enhanced service for prefetching common data and managing cache
 */
export class PrefetchService {
  private queryClient: QueryClient;
  private prefetchQueue: Set<string> = new Set();
  private backgroundPrefetchInterval: any = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.startBackgroundPrefetch();
  }

  /**
   * Prefetch shifts data with common filters
   */
  async prefetchShifts() {
    const commonFilters = [
      { date: 'today' },
      { date: 'tomorrow' },
      { date: 'this_week' },
      { status: 'Upcoming' },
      { status: 'In Progress' },
    ];

    const prefetchPromises = commonFilters.map(filters =>
      this.queryClient.prefetchQuery({
        queryKey: ['shifts', filters],
        queryFn: () => apiService.getShifts(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
      })
    );

    try {
      await Promise.allSettled(prefetchPromises);
      console.log('✅ Shifts data prefetched successfully');
    } catch (error) {
      console.warn('⚠️ Some shifts prefetch failed:', error);
    }
  }

  /**
   * Prefetch user data
   */
  async prefetchUsers() {
    try {
      await this.queryClient.prefetchQuery({
        queryKey: ['users', { page: 1, pageSize: 50 }],
        queryFn: () => apiService.getUsers({ page: 1, pageSize: 50 }),
        staleTime: 10 * 60 * 1000, // 10 minutes
      });
      console.log('✅ Users data prefetched successfully');
    } catch (error) {
      console.warn('⚠️ Users prefetch failed:', error);
    }
  }

  /**
   * Prefetch companies data
   */
  async prefetchCompanies() {
    try {
      await this.queryClient.prefetchQuery({
        queryKey: ['companies'],
        queryFn: () => apiService.getCompanies(),
        staleTime: 15 * 60 * 1000, // 15 minutes
      });
      console.log('✅ Companies data prefetched successfully');
    } catch (error) {
      console.warn('⚠️ Companies prefetch failed:', error);
    }
  }

  /**
   * Prefetch jobs data
   */
  async prefetchJobs() {
    try {
      await this.queryClient.prefetchQuery({
        queryKey: ['jobs', { page: 1, pageSize: 50 }],
        queryFn: () => apiService.getJobs({ page: 1, pageSize: 50 }),
        staleTime: 10 * 60 * 1000, // 10 minutes
      });
      console.log('✅ Jobs data prefetched successfully');
    } catch (error) {
      console.warn('⚠️ Jobs prefetch failed:', error);
    }
  }

  /**
   * Prefetch all common data
   */
  async prefetchAll() {
    console.log('🚀 Starting data prefetch...');
    const startTime = Date.now();

    await Promise.allSettled([
      this.prefetchShifts(),
      this.prefetchUsers(),
      this.prefetchCompanies(),
      this.prefetchJobs(),
    ]);

    const duration = Date.now() - startTime;
    console.log(`✅ Data prefetch completed in ${duration}ms`);
  }

  /**
   * Prefetch data based on user role
   */
  async prefetchForRole(role: string) {
    console.log(`🎯 Prefetching data for role: ${role}`);

    switch (role) {
      case 'Admin':
        await this.prefetchAll();
        break;
      case 'CrewChief':
        await Promise.allSettled([
          this.prefetchShifts(),
          this.prefetchUsers(),
        ]);
        break;
      case 'Staff':
        await this.prefetchShifts();
        break;
      default:
        await this.prefetchShifts();
    }
  }

  /**
   * Invalidate and refetch stale data
   */
  async refreshStaleData() {
    console.log('🔄 Refreshing stale data...');
    
    // Invalidate queries older than 5 minutes
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        const lastUpdated = query.state.dataUpdatedAt;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return lastUpdated < fiveMinutesAgo;
      }
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    console.log('🗑️ Clearing all cached data...');
    this.queryClient.clear();
  }

  /**
   * Start background prefetching for optimal performance
   */
  private startBackgroundPrefetch() {
    // Prefetch stale data every 2 minutes
    this.backgroundPrefetchInterval = setInterval(() => {
      this.refreshStaleData();
    }, 2 * 60 * 1000);
  }

  /**
   * Stop background prefetching
   */
  stopBackgroundPrefetch() {
    if (this.backgroundPrefetchInterval) {
      clearInterval(this.backgroundPrefetchInterval);
      this.backgroundPrefetchInterval = null;
    }
  }

  /**
   * Invalidate user-specific cache (for avatar updates, profile changes, etc.)
   */
  async invalidateUserCache(userId: string) {
    console.log(`🔄 Invalidating cache for user: ${userId}`);
    
    // Invalidate all user-related queries
    await Promise.all([
      // User profile data
      this.queryClient.invalidateQueries({
        queryKey: ['users', userId],
      }),
      // User avatar specifically
      this.queryClient.invalidateQueries({
        queryKey: ['user-avatar', userId],
      }),
      // Users list (in case user appears in lists)
      this.queryClient.invalidateQueries({
        queryKey: ['users'],
      }),
      // Any shifts where this user is assigned
      this.queryClient.invalidateQueries({
        queryKey: ['shifts'],
        predicate: (query) => {
          // Check if this query might contain user data
          return query.queryKey.includes('shifts');
        }
      }),
    ]);

    // Force browser to reload avatar images by clearing image cache
    this.clearAvatarImageCache(userId);
  }

  /**
   * Clear browser image cache for user avatars
   */
  private clearAvatarImageCache(userId: string) {
    // Clear browser cache for avatar images
    const avatarUrls = [
      `/api/users/${userId}/avatar/image`,
      `/api/users/${userId}/avatar/image?t=${Date.now()}`, // Timestamped version
    ];

    avatarUrls.forEach(url => {
      // Create a new image element to force cache refresh
      const img = new Image();
      img.onload = () => {
        console.log(`✅ Avatar cache refreshed for user ${userId}`);
      };
      img.onerror = () => {
        console.warn(`⚠️ Could not refresh avatar cache for user ${userId}`);
      };
      // Add timestamp to force cache bust
      img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    });
  }

  /**
   * Prefetch user avatar with cache busting
   */
  async prefetchUserAvatar(userId: string, bustCache = false) {
    const timestamp = bustCache ? `?t=${Date.now()}` : '';
    const avatarUrl = `/api/users/${userId}/avatar/image${timestamp}`;
    
    try {
      // Prefetch the avatar image
      const img = new Image();
      img.src = avatarUrl;
      
      // Also update the query cache
      await this.queryClient.prefetchQuery({
        queryKey: ['user-avatar', userId],
        queryFn: () => fetch(avatarUrl).then(res => res.blob()),
        staleTime: bustCache ? 0 : 10 * 60 * 1000, // 10 minutes, or immediate if busting cache
      });
      
      console.log(`✅ Avatar prefetched for user ${userId}`);
    } catch (error) {
      console.warn(`⚠️ Avatar prefetch failed for user ${userId}:`, error);
    }
  }

  /**
   * Enhanced prefetch with intelligent prioritization
   */
  async smartPrefetch(userRole: string, currentPage: string) {
    console.log(`🧠 Smart prefetching for ${userRole} on ${currentPage}`);
    
    const prefetchTasks: Promise<void>[] = [];
    
    // Always prefetch current user's shifts
    prefetchTasks.push(this.prefetchShifts());
    
    // Page-specific prefetching
    switch (currentPage) {
      case '/shifts':
        prefetchTasks.push(
          this.prefetchUsers(),
          this.prefetchCompanies()
        );
        break;
      case '/profile':
        // Prefetch user data and avatar
        break;
      case '/admin':
        if (userRole === 'Admin') {
          prefetchTasks.push(this.prefetchAll());
        }
        break;
    }
    
    // Execute prefetch tasks with priority
    await Promise.allSettled(prefetchTasks);
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalResources() {
    console.log('🚀 Preloading critical resources...');
    
    // Preload common API endpoints
    const criticalEndpoints = [
      '/api/shifts?date=today',
      '/api/shifts?date=tomorrow',
      '/api/users?page=1&pageSize=20',
    ];
    
    const preloadPromises = criticalEndpoints.map(endpoint => 
      fetch(endpoint).catch(error => 
        console.warn(`⚠️ Failed to preload ${endpoint}:`, error)
      )
    );
    
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get enhanced cache statistics
   */
  getCacheStats() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const now = Date.now();
    const stats = {
      totalQueries: queries.length,
      freshQueries: queries.filter(q => q.state.status === 'success' && !q.isStale()).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'loading').length,
      
      // Enhanced stats
      cacheSize: this.estimateCacheSize(queries),
      oldestQuery: Math.min(...queries.map(q => q.state.dataUpdatedAt || now)),
      newestQuery: Math.max(...queries.map(q => q.state.dataUpdatedAt || 0)),
      
      // Query breakdown by type
      queryTypes: this.getQueryTypeBreakdown(queries),
    };

    return stats;
  }

  /**
   * Estimate cache size in bytes
   */
  private estimateCacheSize(queries: any[]): number {
    let totalSize = 0;
    queries.forEach(query => {
      if (query.state.data) {
        try {
          totalSize += JSON.stringify(query.state.data).length * 2; // Rough estimate
        } catch (e) {
          // Skip if data can't be stringified
        }
      }
    });
    return totalSize;
  }

  /**
   * Get breakdown of queries by type
   */
  private getQueryTypeBreakdown(queries: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    queries.forEach(query => {
      const type = query.queryKey[0] || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.stopBackgroundPrefetch();
    this.prefetchQueue.clear();
  }
}

// Export a singleton instance
let prefetchService: PrefetchService | null = null;

export const getPrefetchService = (queryClient: QueryClient): PrefetchService => {
  if (!prefetchService) {
    prefetchService = new PrefetchService(queryClient);
  }
  return prefetchService;
};