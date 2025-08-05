"use client";

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useUser } from './use-user';
import { apiService } from '@/lib/services/api';
import { ShiftWithDetails, Job, Company, TimesheetDetails, User } from '@/lib/types';

// Enhanced query configuration
const QUERY_CONFIG = {
  // Stale times based on data volatility
  STALE_TIMES: {
    STATIC: 15 * 60 * 1000,      // 15 minutes - companies, users
    SEMI_STATIC: 5 * 60 * 1000,   // 5 minutes - jobs, announcements
    DYNAMIC: 2 * 60 * 1000,       // 2 minutes - shifts, assignments
    REAL_TIME: 30 * 1000,         // 30 seconds - timesheets, notifications
  },
  // Cache times (garbage collection)
  CACHE_TIMES: {
    LONG: 30 * 60 * 1000,         // 30 minutes
    MEDIUM: 15 * 60 * 1000,       // 15 minutes
    SHORT: 5 * 60 * 1000,         // 5 minutes
  },
  // Retry configuration
  RETRY: {
    ATTEMPTS: 3,
    DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  }
};

// Smart cache key generation with dependency tracking
export const createSmartCacheKey = (
  baseKey: string, 
  params?: Record<string, any>,
  dependencies?: string[]
) => {
  const key = [baseKey];
  
  if (params) {
    // Sort params for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: params[k] }), {});
    key.push(sortedParams);
  }
  
  if (dependencies) {
    key.push(...dependencies);
  }
  
  return key;
};

// Enhanced shifts hook with intelligent caching
export const useOptimizedShifts = (
  filters?: { 
    date?: string; 
    status?: string; 
    companyId?: string; 
    search?: string; 
    jobId?: string; 
  },
  options?: {
    enabled?: boolean;
    prefetch?: boolean;
    background?: boolean;
  }
) => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  // Create smart cache key
  const queryKey = useMemo(() => 
    createSmartCacheKey('shifts', filters, [user?.id || 'anonymous']),
    [filters, user?.id]
  );

  // Determine if this is a background refresh
  const isBackground = options?.background || false;
  
  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getShifts(filters),
    enabled: options?.enabled !== false,
    staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: !isBackground,
    refetchOnMount: !isBackground,
    refetchOnReconnect: true,
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    // Use placeholder data for smoother transitions
    placeholderData: (previousData) => previousData,
    // Network mode for better offline handling
    networkMode: 'offlineFirst',
  });

  // Prefetch related data
  useEffect(() => {
    if (options?.prefetch && query.data && !query.isLoading) {
      // Prefetch individual shifts for faster navigation
      query.data.slice(0, 5).forEach((shift: ShiftWithDetails) => {
        queryClient.prefetchQuery({
          queryKey: ['shift', shift.id],
          queryFn: () => apiService.getShift(shift.id),
          staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
        });
      });
    }
  }, [query.data, query.isLoading, options?.prefetch, queryClient]);

  return query;
};

// Enhanced individual shift hook
export const useOptimizedShift = (
  shiftId: string,
  options?: {
    enabled?: boolean;
    prefetchAssignments?: boolean;
  }
) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['shift', shiftId],
    queryFn: () => apiService.getShift(shiftId),
    enabled: !!shiftId && (options?.enabled !== false),
    staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.MEDIUM,
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    networkMode: 'offlineFirst',
  });

  // Prefetch assignments if requested
  useEffect(() => {
    if (options?.prefetchAssignments && shiftId && !query.isLoading) {
      queryClient.prefetchQuery({
        queryKey: ['shift-assignments', shiftId],
        queryFn: () => apiService.getShiftAssignments(shiftId),
        staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
      });
    }
  }, [shiftId, options?.prefetchAssignments, query.isLoading, queryClient]);

  return query;
};

// Enhanced companies hook with smart caching
export const useOptimizedCompanies = (
  filters?: { page?: number; pageSize?: number; search?: string },
  options?: { prefetchLogos?: boolean }
) => {
  const queryClient = useQueryClient();
  
  const queryKey = useMemo(() => 
    createSmartCacheKey('companies', filters),
    [filters]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getCompanies(filters),
    staleTime: QUERY_CONFIG.STALE_TIMES.STATIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    placeholderData: (previousData) => previousData,
    networkMode: 'offlineFirst',
  });

  // Prefetch company logos for better UX
  useEffect(() => {
    if (options?.prefetchLogos && query.data?.companies) {
      query.data.companies.forEach((company: Company) => {
        if (company.company_logo_url) {
          // Prefetch logo images
          const img = new Image();
          img.src = company.company_logo_url;
        }
      });
    }
  }, [query.data, options?.prefetchLogos]);

  return query;
};

// Enhanced jobs hook
export const useOptimizedJobs = (
  filters?: { status?: string; companyId?: string; search?: string; sortBy?: string },
  options?: { prefetchShifts?: boolean }
) => {
  const queryClient = useQueryClient();
  
  const queryKey = useMemo(() => 
    createSmartCacheKey('jobs', filters),
    [filters]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getJobs(filters),
    staleTime: QUERY_CONFIG.STALE_TIMES.SEMI_STATIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    placeholderData: (previousData) => previousData,
    networkMode: 'offlineFirst',
  });

  // Prefetch shifts for active jobs
  useEffect(() => {
    if (options?.prefetchShifts && query.data) {
      query.data.slice(0, 3).forEach((job: Job) => {
        queryClient.prefetchQuery({
          queryKey: createSmartCacheKey('shifts', { jobId: job.id }),
          queryFn: () => apiService.getShifts({ jobId: job.id }),
          staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
        });
      });
    }
  }, [query.data, options?.prefetchShifts, queryClient]);

  return query;
};

// Enhanced timesheets hook
export const useOptimizedTimesheets = (
  filters?: { status?: string },
  options?: { realTime?: boolean }
) => {
  const queryKey = useMemo(() => 
    createSmartCacheKey('timesheets', filters),
    [filters]
  );

  return useQuery({
    queryKey,
    queryFn: () => apiService.getTimesheets(filters),
    staleTime: options?.realTime ? QUERY_CONFIG.STALE_TIMES.REAL_TIME : QUERY_CONFIG.STALE_TIMES.DYNAMIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.SHORT,
    refetchInterval: options?.realTime ? 30000 : undefined, // 30 seconds for real-time
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    placeholderData: (previousData) => previousData,
    networkMode: 'offlineFirst',
  });
};

// Enhanced users hook with role-based caching
export const useOptimizedUsers = (
  params?: { 
    page?: number; 
    pageSize?: number; 
    fetchAll?: boolean; 
    role?: string; 
    search?: string; 
    status?: 'active' | 'inactive'; 
    excludeCompanyUsers?: boolean;
  },
  options?: { prefetchAvatars?: boolean }
) => {
  const queryKey = useMemo(() => 
    createSmartCacheKey('users', params),
    [params]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getUsers(params),
    staleTime: QUERY_CONFIG.STALE_TIMES.STATIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    placeholderData: (previousData) => previousData,
    networkMode: 'offlineFirst',
  });

  // Prefetch user avatars
  useEffect(() => {
    if (options?.prefetchAvatars && query.data?.users) {
      query.data.users.forEach((user: User) => {
        if (user.avatarUrl) {
          const img = new Image();
          img.src = user.avatarUrl;
        }
      });
    }
  }, [query.data, options?.prefetchAvatars]);

  return query;
};

// Smart mutation hook with optimistic updates
export const useOptimizedMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    invalidateQueries?: string[][];
    optimisticUpdate?: {
      queryKey: string[];
      updater: (oldData: any, variables: TVariables) => any;
    };
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Optimistic update
      if (options?.optimisticUpdate) {
        const { queryKey, updater } = options.optimisticUpdate;
        
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey });
        
        // Snapshot previous value
        const previousData = queryClient.getQueryData(queryKey);
        
        // Optimistically update
        queryClient.setQueryData(queryKey, (old: any) => updater(old, variables));
        
        return { previousData };
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData && options?.optimisticUpdate) {
        queryClient.setQueryData(options.optimisticUpdate.queryKey, context.previousData);
      }
      
      options?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      options?.onSuccess?.(data, variables);
    },
  });
};

// Background sync hook for keeping data fresh
export const useBackgroundSync = (
  queries: Array<{
    queryKey: string[];
    queryFn: () => Promise<any>;
    interval?: number;
  }>,
  options?: {
    enabled?: boolean;
    onlyWhenVisible?: boolean;
  }
) => {
  const queryClient = useQueryClient();
  const intervalRefs = useRef<NodeJS.Timeout[]>([]);
  const isVisible = useRef(true);

  // Track visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };

    if (options?.onlyWhenVisible) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [options?.onlyWhenVisible]);

  useEffect(() => {
    if (options?.enabled === false) return;

    // Clear existing intervals
    intervalRefs.current.forEach(clearInterval);
    intervalRefs.current = [];

    // Set up background sync for each query
    queries.forEach(({ queryKey, queryFn, interval = 60000 }) => {
      const intervalId = setInterval(async () => {
        if (options?.onlyWhenVisible && !isVisible.current) return;

        try {
          const data = await queryFn();
          queryClient.setQueryData(queryKey, data);
        } catch (error) {
          console.warn('Background sync failed for', queryKey, error);
        }
      }, interval);

      intervalRefs.current.push(intervalId);
    });

    return () => {
      intervalRefs.current.forEach(clearInterval);
      intervalRefs.current = [];
    };
  }, [queries, options?.enabled, options?.onlyWhenVisible, queryClient]);
};

// Performance monitoring hook
export const useQueryPerformance = () => {
  const queryClient = useQueryClient();

  const getPerformanceStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    const stats = {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: queries.reduce((size, q) => {
        const dataSize = JSON.stringify(q.state.data || {}).length;
        return size + dataSize;
      }, 0),
    };

    return stats;
  }, [queryClient]);

  const optimizeCache = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove stale queries older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    queries.forEach(query => {
      if (query.state.dataUpdatedAt < oneHourAgo && query.isStale()) {
        cache.remove(query);
      }
    });
  }, [queryClient]);

  return {
    getPerformanceStats,
    optimizeCache,
  };
};