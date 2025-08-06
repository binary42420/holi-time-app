import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useUser } from './use-user';
import { createSmartCacheKey, QUERY_CONFIG } from './use-optimized-queries';

// Enhanced hook for dashboard timesheets with smart caching
export function useDashboardTimesheets() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  const queryKey = createSmartCacheKey('dashboard-timesheets', { userId: user?.id });

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await api.get('/api/dashboard/timesheets');
    },
    enabled: !!user,
    staleTime: QUERY_CONFIG.STALE_TIMES.REAL_TIME, // 30 seconds
    gcTime: QUERY_CONFIG.CACHE_TIMES.SHORT,
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: true,
    networkMode: 'offlineFirst',
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    placeholderData: (previousData) => previousData,
  });

  // Prefetch individual timesheets for faster navigation
  useEffect(() => {
    if (query.data?.timesheets) {
      query.data.timesheets.slice(0, 3).forEach((timesheet: any) => {
        queryClient.prefetchQuery({
          queryKey: ['timesheet', timesheet.id],
          queryFn: () => api.get(`/api/timesheets/${timesheet.id}`),
          staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
        });
      });
    }
  }, [query.data, queryClient]);

  return query;
}

// Enhanced hook for dashboard jobs with prefetching
export function useDashboardJobs() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  const queryKey = createSmartCacheKey('dashboard-jobs', { userId: user?.id });

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await api.get('/api/dashboard/jobs');
    },
    enabled: !!user,
    staleTime: QUERY_CONFIG.STALE_TIMES.SEMI_STATIC, // 5 minutes
    gcTime: QUERY_CONFIG.CACHE_TIMES.MEDIUM,
    refetchInterval: 300000, // Refetch every 5 minutes
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    placeholderData: (previousData) => previousData,
  });

  // Prefetch job details and related shifts
  useEffect(() => {
    if (query.data?.jobs) {
      query.data.jobs.slice(0, 3).forEach((job: any) => {
        // Prefetch job details
        queryClient.prefetchQuery({
          queryKey: ['job', job.id],
          queryFn: () => api.get(`/api/jobs/${job.id}`),
          staleTime: QUERY_CONFIG.STALE_TIMES.SEMI_STATIC,
        });
        
        // Prefetch job shifts
        queryClient.prefetchQuery({
          queryKey: createSmartCacheKey('shifts', { jobId: job.id }),
          queryFn: () => api.get(`/api/shifts?jobId=${job.id}`),
          staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
        });
      });
    }
  }, [query.data, queryClient]);

  return query;
}

// Enhanced hook for dashboard shifts with intelligent caching
export function useDashboardShifts(page: number = 1, limit: number = 5) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  const queryKey = createSmartCacheKey('dashboard-shifts', { userId: user?.id, page, limit });

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await api.get(`/api/dashboard/shifts?page=${page}&limit=${limit}`);
    },
    enabled: !!user,
    staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC, // 2 minutes
    gcTime: QUERY_CONFIG.CACHE_TIMES.SHORT,
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: true,
    networkMode: 'offlineFirst',
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
    placeholderData: (previousData) => previousData,
  });

  // Prefetch shift details and assignments
  useEffect(() => {
    if (query.data?.shifts) {
      query.data.shifts.slice(0, 5).forEach((shift: any) => {
        // Prefetch shift details
        queryClient.prefetchQuery({
          queryKey: ['shift', shift.id],
          queryFn: () => api.get(`/api/shifts/${shift.id}`),
          staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
        });
        
        // Prefetch shift assignments
        queryClient.prefetchQuery({
          queryKey: ['shift-assignments', shift.id],
          queryFn: () => api.get(`/api/shifts/${shift.id}/assigned`),
          staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
        });
      });
    }
  }, [query.data, queryClient]);

  return query;
}

// Enhanced combined hook for all dashboard data with intelligent loading
export function useDashboardData(shiftsPage: number = 1, shiftsLimit: number = 5) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  const timesheets = useDashboardTimesheets();
  const jobs = useDashboardJobs();
  const shifts = useDashboardShifts(shiftsPage, shiftsLimit);

  // Background sync for critical dashboard data
  const syncDashboardData = useCallback(() => {
    if (!user) return;
    
    // Sync in background without affecting UI
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-timesheets'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-shifts'] }),
    ]).catch(error => {
      console.warn('Dashboard background sync failed:', error);
    });
  }, [user, queryClient]);

  // Auto-sync every 5 minutes for admins, 10 minutes for others
  useEffect(() => {
    if (!user) return;
    
    const interval = user.role === 'Admin' ? 5 * 60 * 1000 : 10 * 60 * 1000;
    const timer = setInterval(syncDashboardData, interval);
    
    return () => clearInterval(timer);
  }, [user, syncDashboardData]);

  // Calculate derived metrics
  const metrics = {
    totalTimesheets: timesheets.data?.meta?.total || 0,
    pendingTimesheets: timesheets.data?.meta?.pending || 0,
    totalJobs: jobs.data?.meta?.total || 0,
    activeJobs: jobs.data?.meta?.active || 0,
    totalShifts: shifts.data?.meta?.total || 0,
    upcomingShifts: shifts.data?.meta?.upcoming || 0,
    isStale: timesheets.isStale || jobs.isStale || shifts.isStale,
  };

  return {
    timesheets,
    jobs,
    shifts,
    metrics,
    isLoading: timesheets.isLoading || jobs.isLoading || shifts.isLoading,
    isError: timesheets.isError || jobs.isError || shifts.isError,
    error: timesheets.error || jobs.error || shifts.error,
    refetchAll: useCallback(() => {
      return Promise.all([
        timesheets.refetch(),
        jobs.refetch(),
        shifts.refetch(),
      ]);
    }, [timesheets.refetch, jobs.refetch, shifts.refetch]),
    syncDashboardData,
  };
}