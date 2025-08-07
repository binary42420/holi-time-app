"use client";

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useUser } from './use-user';
import { apiService } from '@/lib/services/api';
import { ShiftWithDetails, Job, Company, TimesheetDetails, User } from '@/lib/types';
import { createSmartCacheKey, QUERY_CONFIG } from '@/lib/query-config';

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

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getShifts(filters),
    enabled: options?.enabled !== false,
    staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.SHORT,
    retry: QUERY_CONFIG.RETRY.ATTEMPTS,
    retryDelay: QUERY_CONFIG.RETRY.DELAY,
  });

  return query;
};

// Enhanced single shift hook
export const useOptimizedShift = (
  shiftId: string,
  options?: {
    enabled?: boolean;
    prefetchAssignments?: boolean;
  }
) => {
  const queryClient = useQueryClient();
  
  const queryKey = useMemo(() => 
    createSmartCacheKey('shift', { id: shiftId }),
    [shiftId]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getShift(shiftId),
    enabled: !!shiftId && (options?.enabled !== false),
    staleTime: QUERY_CONFIG.STALE_TIMES.DYNAMIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.SHORT,
  });

  return query;
};

// Enhanced companies hook
export const useOptimizedCompanies = (
  filters?: { page?: number; pageSize?: number; search?: string },
  options?: {
    enabled?: boolean;
    prefetchLogos?: boolean;
  }
) => {
  const queryKey = useMemo(() => 
    createSmartCacheKey('companies', filters),
    [filters]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getCompanies(filters),
    enabled: options?.enabled !== false,
    staleTime: QUERY_CONFIG.STALE_TIMES.STATIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.LONG,
  });

  return query;
};

// Enhanced jobs hook
export const useOptimizedJobs = (
  filters?: { status?: string; companyId?: string; search?: string; sortBy?: string },
  options?: {
    enabled?: boolean;
    prefetchShifts?: boolean;
  }
) => {
  const queryKey = useMemo(() => 
    createSmartCacheKey('jobs', filters),
    [filters]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getJobs(filters),
    enabled: options?.enabled !== false,
    staleTime: QUERY_CONFIG.STALE_TIMES.SEMI_STATIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.MEDIUM,
  });

  return query;
};

// Enhanced timesheets hook
export const useOptimizedTimesheets = (
  filters?: { status?: string; userId?: string; date?: string },
  options?: {
    enabled?: boolean;
  }
) => {
  const queryKey = useMemo(() => 
    createSmartCacheKey('timesheets', filters),
    [filters]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getTimesheets(filters),
    enabled: options?.enabled !== false,
    staleTime: QUERY_CONFIG.STALE_TIMES.REAL_TIME,
    gcTime: QUERY_CONFIG.CACHE_TIMES.SHORT,
  });

  return query;
};

// Enhanced users hook
export const useOptimizedUsers = (
  filters?: { 
    page?: number; 
    pageSize?: number; 
    fetchAll?: boolean; 
    role?: string; 
    search?: string; 
    status?: 'active' | 'inactive'; 
    excludeCompanyUsers?: boolean;
  },
  options?: {
    enabled?: boolean;
    prefetchAvatars?: boolean;
  }
) => {
  const queryKey = useMemo(() => 
    createSmartCacheKey('users', filters),
    [filters]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => apiService.getUsers(filters),
    enabled: options?.enabled !== false,
    staleTime: QUERY_CONFIG.STALE_TIMES.SEMI_STATIC,
    gcTime: QUERY_CONFIG.CACHE_TIMES.MEDIUM,
  });

  return query;
};

// Enhanced mutation hook
export const useOptimizedMutation = <TData = unknown, TError = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    invalidateQueries?: string[];
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: TError, variables: TVariables) => void;
  }
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate related queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }
      options?.onSuccess?.(data, variables);
    },
    onError: options?.onError,
    retry: 2,
  });
};