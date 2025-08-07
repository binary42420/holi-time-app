"use client";

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from './use-user';
import { apiService } from '@/lib/services/api';
import { createSmartCacheKey } from '@/lib/query-config';

interface PrefetchRule {
  condition: (currentPath: string, userRole: string) => boolean;
  queries: Array<{
    queryKey: any[];
    queryFn: () => Promise<any>;
    priority: 'high' | 'medium' | 'low';
    staleTime?: number;
  }>;
}

// Define intelligent prefetch rules based on user behavior patterns
const PREFETCH_RULES: PrefetchRule[] = [
  // Admin dashboard prefetching
  {
    condition: (path, role) => path === '/admin' && role === 'Admin',
    queries: [
      {
        queryKey: createSmartCacheKey('shifts', { status: 'active' }),
        queryFn: () => apiService.getShifts({ status: 'active' }),
        priority: 'high',
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
      {
        queryKey: createSmartCacheKey('timesheets', { status: 'pending' }),
        queryFn: () => apiService.getTimesheets({ status: 'pending' }),
        priority: 'high',
        staleTime: 1 * 60 * 1000, // 1 minute
      },
      {
        queryKey: createSmartCacheKey('companies'),
        queryFn: () => apiService.getCompanies(),
        priority: 'medium',
        staleTime: 15 * 60 * 1000, // 15 minutes
      },
    ],
  },
  
  // Admin shifts page prefetching
  {
    condition: (path, role) => path === '/admin/shifts' && role === 'Admin',
    queries: [
      {
        queryKey: createSmartCacheKey('shifts'),
        queryFn: () => apiService.getShifts(),
        priority: 'high',
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: createSmartCacheKey('companies'),
        queryFn: () => apiService.getCompanies(),
        priority: 'medium',
        staleTime: 15 * 60 * 1000,
      },
      {
        queryKey: createSmartCacheKey('users', { role: 'Employee' }),
        queryFn: () => apiService.getUsers({ role: 'Employee' }),
        priority: 'low',
        staleTime: 10 * 60 * 1000,
      },
    ],
  },

  // Admin jobs-shifts page prefetching
  {
    condition: (path, role) => path === '/admin/jobs-shifts' && role === 'Admin',
    queries: [
      {
        queryKey: createSmartCacheKey('jobs'),
        queryFn: () => apiService.getJobs(),
        priority: 'high',
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: createSmartCacheKey('shifts', { status: 'active' }),
        queryFn: () => apiService.getShifts({ status: 'active' }),
        priority: 'high',
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: createSmartCacheKey('companies'),
        queryFn: () => apiService.getCompanies(),
        priority: 'high',
        staleTime: 15 * 60 * 1000,
      },
    ],
  },

  // Jobs-shifts page prefetching (for all users)
  {
    condition: (path) => path === '/jobs-shifts',
    queries: [
      {
        queryKey: createSmartCacheKey('jobs'),
        queryFn: () => apiService.getJobs(),
        priority: 'high',
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: createSmartCacheKey('shifts', { status: 'upcoming' }),
        queryFn: () => apiService.getShifts({ status: 'upcoming' }),
        priority: 'high',
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: createSmartCacheKey('companies'),
        queryFn: () => apiService.getCompanies(),
        priority: 'medium',
        staleTime: 15 * 60 * 1000,
      },
    ],
  },

  // Admin timesheets page prefetching
  {
    condition: (path, role) => path === '/admin/timesheets' && role === 'Admin',
    queries: [
      {
        queryKey: createSmartCacheKey('timesheets'),
        queryFn: () => apiService.getTimesheets(),
        priority: 'high',
        staleTime: 1 * 60 * 1000,
      },
      {
        queryKey: createSmartCacheKey('shifts', { status: 'completed' }),
        queryFn: () => apiService.getShifts({ status: 'completed' }),
        priority: 'medium',
        staleTime: 5 * 60 * 1000,
      },
    ],
  },

  // Staff dashboard prefetching
  {
    condition: (path, role) => path === '/dashboard' && ['Staff', 'CrewChief'].includes(role),
    queries: [
      {
        queryKey: createSmartCacheKey('shifts', { status: 'upcoming' }),
        queryFn: () => apiService.getShifts({ status: 'upcoming' }),
        priority: 'high',
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['announcements'],
        queryFn: () => apiService.getAnnouncements(),
        priority: 'medium',
        staleTime: 10 * 60 * 1000,
      },
    ],
  },

  // Shifts list prefetching
  {
    condition: (path) => path === '/shifts',
    queries: [
      {
        queryKey: createSmartCacheKey('shifts'),
        queryFn: () => apiService.getShifts(),
        priority: 'high',
        staleTime: 2 * 60 * 1000,
      },
    ],
  },
];

// Navigation patterns for predictive prefetching
const NAVIGATION_PATTERNS = {
  '/admin': ['/admin/shifts', '/admin/jobs-shifts', '/admin/timesheets'],
  '/admin/shifts': ['/shifts/[id]', '/admin/jobs-shifts'],
  '/admin/jobs-shifts': ['/jobs/[id]', '/admin/shifts'],
  '/admin/timesheets': ['/timesheets/[id]'],
  '/dashboard': ['/shifts', '/jobs-shifts', '/profile'],
  '/shifts': ['/shifts/[id]'],
  '/jobs-shifts': ['/jobs/[id]', '/shifts'],
};

export const useIntelligentPrefetch = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useUser();
  const prefetchQueueRef = useRef<Set<string>>(new Set());
  const navigationHistoryRef = useRef<string[]>([]);
  const lastPrefetchRef = useRef<number>(0);

  // Track navigation history for pattern learning
  const trackNavigation = useCallback((path: string) => {
    navigationHistoryRef.current.push(path);
    // Keep only last 10 navigations
    if (navigationHistoryRef.current.length > 10) {
      navigationHistoryRef.current.shift();
    }
  }, []);

  // Prefetch based on current page rules
  const prefetchForCurrentPage = useCallback(async (currentPath: string) => {
    if (!user) return;

    const now = Date.now();
    // Throttle prefetching to avoid excessive requests
    if (now - lastPrefetchRef.current < 5000) return; // 5 second throttle
    lastPrefetchRef.current = now;

    const applicableRules = PREFETCH_RULES.filter(rule => 
      rule.condition(currentPath, user.role)
    );

    for (const rule of applicableRules) {
      // Sort queries by priority
      const sortedQueries = rule.queries.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      for (const query of sortedQueries) {
        const queryKey = JSON.stringify(query.queryKey);
        
        // Skip if already prefetched recently
        if (prefetchQueueRef.current.has(queryKey)) continue;
        
        try {
          // Check if data is already cached and fresh
          const existingData = queryClient.getQueryData(query.queryKey);
          const queryState = queryClient.getQueryState(query.queryKey);
          
          if (existingData && queryState) {
            const isStale = Date.now() - (queryState.dataUpdatedAt || 0) > (query.staleTime || 5 * 60 * 1000);
            if (!isStale) continue;
          }

          prefetchQueueRef.current.add(queryKey);
          
          // Prefetch with appropriate priority
          if (query.priority === 'high') {
            await queryClient.prefetchQuery({
              queryKey: query.queryKey,
              queryFn: query.queryFn,
              staleTime: query.staleTime,
            });
          } else {
            // Low priority prefetching with delay
            setTimeout(() => {
              queryClient.prefetchQuery({
                queryKey: query.queryKey,
                queryFn: query.queryFn,
                staleTime: query.staleTime,
              }).catch(error => {
                console.warn('Background prefetch failed:', error);
              });
            }, query.priority === 'medium' ? 1000 : 3000);
          }

          // Remove from queue after 30 seconds
          setTimeout(() => {
            prefetchQueueRef.current.delete(queryKey);
          }, 30000);

        } catch (error) {
          console.warn('Prefetch failed for', query.queryKey, error);
          prefetchQueueRef.current.delete(queryKey);
        }
      }
    }
  }, [user, queryClient]);

  // Predictive prefetching based on navigation patterns
  const prefetchPredictiveRoutes = useCallback(async (currentPath: string) => {
    if (!user) return;

    const likelyNextRoutes = NAVIGATION_PATTERNS[currentPath as keyof typeof NAVIGATION_PATTERNS];
    if (!likelyNextRoutes) return;

    for (const route of likelyNextRoutes) {
      // Skip dynamic routes for now (would need more context)
      if (route.includes('[id]')) continue;

      const applicableRules = PREFETCH_RULES.filter(rule => 
        rule.condition(route, user.role)
      );

      for (const rule of applicableRules) {
        // Only prefetch high priority queries for predictive routes
        const highPriorityQueries = rule.queries.filter(q => q.priority === 'high');
        
        for (const query of highPriorityQueries) {
          const queryKey = JSON.stringify(query.queryKey);
          if (prefetchQueueRef.current.has(queryKey)) continue;

          try {
            prefetchQueueRef.current.add(queryKey);
            
            // Prefetch with lower priority (background)
            setTimeout(() => {
              queryClient.prefetchQuery({
                queryKey: query.queryKey,
                queryFn: query.queryFn,
                staleTime: query.staleTime,
              }).catch(error => {
                console.warn('Predictive prefetch failed:', error);
              });
            }, 2000); // 2 second delay for predictive prefetching

            setTimeout(() => {
              prefetchQueueRef.current.delete(queryKey);
            }, 30000);

          } catch (error) {
            console.warn('Predictive prefetch failed for', query.queryKey, error);
          }
        }
      }
    }
  }, [user, queryClient]);

  // Prefetch individual shift data when hovering over shift cards
  const prefetchShift = useCallback(async (shiftId: string) => {
    if (!shiftId) return;

    const queryKey = ['shift', shiftId];
    const existingData = queryClient.getQueryData(queryKey);
    
    if (existingData) return; // Already cached

    try {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => apiService.getShift(shiftId),
        staleTime: 2 * 60 * 1000,
      });
    } catch (error) {
      console.warn('Shift prefetch failed:', error);
    }
  }, [queryClient]);

  // Prefetch job data when hovering over job cards
  const prefetchJob = useCallback(async (jobId: string) => {
    if (!jobId) return;

    try {
      // Prefetch job shifts
      await queryClient.prefetchQuery({
        queryKey: createSmartCacheKey('shifts', { jobId }),
        queryFn: () => apiService.getShifts({ jobId }),
        staleTime: 5 * 60 * 1000,
      });
    } catch (error) {
      console.warn('Job prefetch failed:', error);
    }
  }, [queryClient]);

  // Prefetch user avatars for better UX
  const prefetchAvatars = useCallback(async (userIds: string[]) => {
    userIds.forEach(userId => {
      // Prefetch avatar images
      const img = new Image();
      img.src = `/api/users/${userId}/avatar`;
      img.onerror = () => {
        // Silently fail for missing avatars
      };
    });
  }, []);

  // Main prefetch function
  const triggerIntelligentPrefetch = useCallback(async (currentPath: string) => {
    trackNavigation(currentPath);
    
    // Prefetch for current page
    await prefetchForCurrentPage(currentPath);
    
    // Predictive prefetching for likely next pages
    setTimeout(() => {
      prefetchPredictiveRoutes(currentPath);
    }, 1000);
  }, [trackNavigation, prefetchForCurrentPage, prefetchPredictiveRoutes]);

  // Cleanup stale prefetch queue
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Clear old entries from prefetch queue
      prefetchQueueRef.current.clear();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanup);
  }, []);

  return {
    triggerIntelligentPrefetch,
    prefetchShift,
    prefetchJob,
    prefetchAvatars,
    trackNavigation,
  };
};

// Hook for hover-based prefetching
export const useHoverPrefetch = () => {
  const { prefetchShift, prefetchJob } = useIntelligentPrefetch();
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const onShiftHover = useCallback((shiftId: string) => {
    // Debounce hover events
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      prefetchShift(shiftId);
    }, 300); // 300ms hover delay
  }, [prefetchShift]);

  const onJobHover = useCallback((jobId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      prefetchJob(jobId);
    }, 300);
  }, [prefetchJob]);

  const cancelHover = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    onShiftHover,
    onJobHover,
    cancelHover,
  };
};