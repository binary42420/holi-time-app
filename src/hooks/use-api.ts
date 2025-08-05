"use client";

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiService } from '@/lib/services/api';
import { ShiftWithDetails, Job, Company, Timesheet, TimesheetDetails, Notification, Announcement, User, UserWithAssignments } from '@/lib/types';
import { 
  useOptimizedShifts, 
  useOptimizedShift, 
  useOptimizedCompanies, 
  useOptimizedJobs, 
  useOptimizedTimesheets, 
  useOptimizedUsers,
  useOptimizedMutation 
} from './use-optimized-queries';
import { useSmartInvalidation } from './use-smart-invalidation';

// --- Generic Query Hook ---
// This can be used for one-off queries, but specific hooks are preferred.
export const useApiQuery = <TData>(
  queryKey: any[], 
  queryFn: () => Promise<TData>, 
  options?: Omit<UseQueryOptions<TData, Error, TData>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
};

// --- Specific Query Hooks ---

// Legacy hook - delegates to optimized version
export const useShifts = (filters?: { date?: string; status?: string; companyId?: string; search?: string; jobId?: string; }) => {
  return useOptimizedShifts(filters, { prefetch: true });
};

// Legacy hook - delegates to optimized version
export const useShift = (id: string, options?: Omit<UseQueryOptions<ShiftWithDetails, Error>, 'queryKey' | 'queryFn'>) => {
  return useOptimizedShift(id, { prefetchAssignments: true, ...options });
};

export const useUserById = (id: string, options?: Omit<UseQueryOptions<UserWithAssignments, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiService.getUserById(id),
    ...options,
  });
};
// Legacy hook - delegates to optimized version
export const useUsers = (
  { page = 1, pageSize = 20, fetchAll = false, role, search, status, excludeCompanyUsers = false }:
  { page?: number; pageSize?: number; fetchAll?: boolean; role?: string; search?: string; status?: 'active' | 'inactive'; excludeCompanyUsers?: boolean } = {}
) => {
  return useOptimizedUsers({ page, pageSize, fetchAll, role, search, status, excludeCompanyUsers }, { prefetchAvatars: true });
};

// Legacy hook - delegates to optimized version
export const useJobs = (filters?: { status?: string; companyId?: string; search?: string; sortBy?: string; }) => {
  return useOptimizedJobs(filters, { prefetchShifts: true });
};

// Legacy hook - delegates to optimized version
export const useCompanies = (filters?: { page?: number; pageSize?: number; search?: string }, options?: Omit<UseQueryOptions<{ companies: Company[]; pagination: any }, Error>, 'queryKey' | 'queryFn'>) => {
  return useOptimizedCompanies(filters, { prefetchLogos: true });
};

export const useCompany = (id: string, options?: Omit<UseQueryOptions<Company, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => apiService.getCompany(id),
    enabled: !!id,
    ...options,
  });
};

export const useTimesheet = (id: string, options?: Omit<UseQueryOptions<TimesheetDetails, Error>, 'queryKey' | 'queryFn'>) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return useQuery({
    queryKey: ['timesheet', id],
    queryFn: () => apiService.getTimesheet(id),
    enabled: !!id,
    staleTime: isDevelopment ? 30 * 1000 : 5 * 60 * 1000, // 30 seconds in dev, 5 minutes in prod
    gcTime: isDevelopment ? 60 * 1000 : 10 * 60 * 1000, // 1 minute in dev, 10 minutes in prod
    refetchOnWindowFocus: false, // Disable refetch on window focus by default
    refetchOnMount: false, // Disable refetch on mount by default
    refetchInterval: false, // Disable automatic refetching
    ...options,
  });
};

// Legacy hook - delegates to optimized version
export const useTimesheets = (filters?: { status?: string }, options?: Omit<UseQueryOptions<TimesheetDetails[], Error>, 'queryKey' | 'queryFn'>) => {
  return useOptimizedTimesheets(filters, { realTime: filters?.status === 'pending' });
};

export const useNotifications = (options?: Omit<UseQueryOptions<Notification[], Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: apiService.getNotifications,
    ...options,
  });
};

export const useAnnouncements = (options?: Omit<UseQueryOptions<Announcement[], Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: apiService.getAnnouncements,
    ...options,
  });
};


// --- Mutation Hook ---
// Re-exporting useMutation with a more specific type for our API service
interface CustomMutationOptions<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables, unknown>, 'mutationFn'> {
  invalidateQueries?: unknown[][];
}

// Enhanced mutation hook with smart invalidation
export const useApiMutation = <TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: CustomMutationOptions<TData, TVariables> & {
    dataType?: string;
    mutationType?: 'create' | 'update' | 'delete';
    entityId?: string;
  }
) => {
  const { invalidateAfterMutation } = useSmartInvalidation();
  const { invalidateQueries, dataType, mutationType, entityId, ...restOptions } = options || {};

  return useOptimizedMutation(mutationFn, {
    ...restOptions,
    invalidateQueries,
    onSuccess: async (data, variables, context) => {
      // Smart invalidation based on mutation type
      if (dataType && mutationType) {
        await invalidateAfterMutation(mutationType, dataType, entityId);
      }
      
      // Legacy invalidation support
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey: unknown[]) => {
          // This will be handled by the optimized mutation hook
        });
      }
      
      if (restOptions?.onSuccess) {
        restOptions.onSuccess(data, variables, context);
      }
    },
  });
};
