"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from './use-user';
import { useIntelligentPrefetch } from './use-intelligent-prefetch';
import { apiService } from '@/lib/services/api';
import { createSmartCacheKey } from './use-optimized-queries';

interface NavigationPerformanceOptions {
  enableHoverPrefetch?: boolean;
  enableRoutePreloading?: boolean;
  prefetchDelay?: number;
  enableMetrics?: boolean;
}

/**
 * Enhanced navigation performance hook that provides comprehensive
 * prefetching, caching, and performance optimizations for navigation
 */
export const useNavigationPerformance = (options: NavigationPerformanceOptions = {}) => {
  const {
    enableHoverPrefetch = true,
    enableRoutePreloading = true,
    prefetchDelay = 300,
    enableMetrics = process.env.NODE_ENV === 'development'
  } = options;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { triggerIntelligentPrefetch, prefetchShift, prefetchJob } = useIntelligentPrefetch();

  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const preloadTimeoutRef = useRef<NodeJS.Timeout>();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const performanceMetricsRef = useRef({
    prefetchCount: 0,
    hitCount: 0,
    missCount: 0,
    averageNavigationTime: 0,
    navigationTimes: [] as number[],
  });

  // Enhanced route prefetching with intelligent caching
  const prefetchRoute = useCallback(async (route: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (!user || prefetchedRoutesRef.current.has(route)) return;
    
    const startTime = performance.now();
    prefetchedRoutesRef.current.add(route);
    performanceMetricsRef.current.prefetchCount++;

    try {
      // Parse route to determine prefetch strategy
      if (route.includes('/companies/') && route.split('/').length === 3) {
        const companyId = route.split('/')[2];
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['company', companyId],
            queryFn: () => apiService.getCompany(companyId),
            staleTime: 5 * 60 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: createSmartCacheKey('jobs', { companyId }),
            queryFn: () => apiService.getJobs({ companyId }),
            staleTime: 5 * 60 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: createSmartCacheKey('shifts', { companyId }),
            queryFn: () => apiService.getShifts({ companyId }),
            staleTime: 2 * 60 * 1000,
          }),
        ]);
      } else if (route.includes('/employees/') && route.split('/').length === 3) {
        const userId = route.split('/')[2];
        await queryClient.prefetchQuery({
          queryKey: ['users', userId],
          queryFn: () => apiService.getUserById(userId),
          staleTime: 10 * 60 * 1000,
        });
      } else if (route.includes('/shifts/') && route.split('/').length === 3) {
        const shiftId = route.split('/')[2];
        await prefetchShift(shiftId);
      } else if (route.includes('/jobs/') && route.split('/').length === 3) {
        const jobId = route.split('/')[2];
        await prefetchJob(jobId);
      } else if (route.includes('/timesheets/') && route.split('/').length === 3) {
        const timesheetId = route.split('/')[2];
        await queryClient.prefetchQuery({
          queryKey: ['timesheet', timesheetId],
          queryFn: () => apiService.getTimesheet(timesheetId),
          staleTime: 30 * 1000,
        });
      }

      // Intelligent prefetch for current page context
      await triggerIntelligentPrefetch(route);

      if (enableMetrics) {
        const endTime = performance.now();
        console.log(`[NavigationPerformance] Prefetched ${route} in ${(endTime - startTime).toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn(`[NavigationPerformance] Failed to prefetch ${route}:`, error);
      prefetchedRoutesRef.current.delete(route); // Remove from cache on failure
    }
  }, [user, queryClient, prefetchShift, prefetchJob, triggerIntelligentPrefetch, enableMetrics]);

  // Enhanced navigation with performance tracking
  const navigateWithPrefetch = useCallback((route: string, options?: { replace?: boolean }) => {
    const navigationStart = performance.now();
    
    // Check if route was prefetched
    const wasPrefetched = prefetchedRoutesRef.current.has(route);
    if (wasPrefetched) {
      performanceMetricsRef.current.hitCount++;
    } else {
      performanceMetricsRef.current.missCount++;
      // Emergency prefetch before navigation
      prefetchRoute(route, 'high');
    }

    if (options?.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }

    // Track navigation timing
    if (enableMetrics) {
      const navigationEnd = performance.now();
      const navigationTime = navigationEnd - navigationStart;
      performanceMetricsRef.current.navigationTimes.push(navigationTime);
      
      // Calculate rolling average (last 10 navigations)
      const recentTimes = performanceMetricsRef.current.navigationTimes.slice(-10);
      performanceMetricsRef.current.averageNavigationTime = 
        recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
    }
  }, [router, prefetchRoute, enableMetrics]);

  // Hover-based prefetching
  const handleHover = useCallback((route: string) => {
    if (!enableHoverPrefetch) return;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      prefetchRoute(route, 'medium');
    }, prefetchDelay);
  }, [enableHoverPrefetch, prefetchRoute, prefetchDelay]);

  // Cancel hover prefetch
  const cancelHover = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  // Preload critical routes
  const preloadCriticalRoutes = useCallback(() => {
    if (!enableRoutePreloading || !user) return;

    const criticalRoutes = [];
    
    switch (user.role) {
      case 'Admin':
        criticalRoutes.push('/admin/shifts', '/admin/timesheets', '/jobs-shifts');
        break;
      case 'CrewChief':
        criticalRoutes.push('/shifts', '/timesheets', '/jobs-shifts');
        break;
      case 'Employee':
      case 'Staff':
        criticalRoutes.push('/dashboard', '/shifts');
        break;
      case 'CompanyUser':
        criticalRoutes.push('/dashboard', '/jobs-shifts');
        break;
    }

    // Preload with staggered timing to avoid overwhelming the network
    criticalRoutes.forEach((route, index) => {
      setTimeout(() => {
        prefetchRoute(route, 'low');
      }, index * 1000); // 1 second intervals
    });
  }, [enableRoutePreloading, user, prefetchRoute]);

  // Auto-preload on mount
  useEffect(() => {
    preloadCriticalRoutes();
  }, [preloadCriticalRoutes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const metrics = performanceMetricsRef.current;
    return {
      ...metrics,
      cacheHitRate: metrics.prefetchCount > 0 
        ? ((metrics.hitCount / (metrics.hitCount + metrics.missCount)) * 100).toFixed(1) + '%'
        : '0%',
      prefetchedRoutes: Array.from(prefetchedRoutesRef.current),
    };
  }, []);

  // Clear cache
  const clearPrefetchCache = useCallback(() => {
    prefetchedRoutesRef.current.clear();
    performanceMetricsRef.current = {
      prefetchCount: 0,
      hitCount: 0,
      missCount: 0,
      averageNavigationTime: 0,
      navigationTimes: [],
    };
  }, []);

  return {
    // Navigation functions
    navigateWithPrefetch,
    prefetchRoute,
    
    // Hover functions
    handleHover,
    cancelHover,
    
    // Utility functions
    preloadCriticalRoutes,
    getPerformanceMetrics,
    clearPrefetchCache,
    
    // State
    isEnabled: !!user,
  };
};

export default useNavigationPerformance;