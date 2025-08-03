"use client";

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiService } from '@/lib/services/api';
import { ShiftWithDetails, Job, Company, Timesheet, TimesheetDetails, Notification, Announcement, User } from '@/lib/types';

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

export const useShifts = (filters?: { date?: string; status?: string; companyId?: string; search?: string; jobId?: string; }) => {
  // Use shorter cache times in development for faster updates
  const isDevelopment = process.env.NODE_ENV === 'development';

  return useQuery({
    queryKey: ['shifts', filters],
    queryFn: () => apiService.getShifts(filters),
    staleTime: isDevelopment ? 30 * 1000 : 2 * 60 * 1000, // 30 seconds in dev, 2 minutes in prod
    gcTime: isDevelopment ? 60 * 1000 : 5 * 60 * 1000, // 1 minute in dev, 5 minutes in prod
    refetchOnWindowFocus: isDevelopment, // Refetch on focus in development
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: true,
    refetchInterval: isDevelopment ? 30 * 1000 : undefined, // Auto-refetch every 30s in dev
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useShift = (id: string, options?: Omit<UseQueryOptions<ShiftWithDetails, Error>, 'queryKey' | 'queryFn'>) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return useQuery({
    queryKey: ['shift', id],
    queryFn: () => apiService.getShift(id),
    enabled: !!id,
    staleTime: isDevelopment ? 30 * 1000 : 2 * 60 * 1000, // 30 seconds in dev, 2 minutes in prod
    gcTime: isDevelopment ? 60 * 1000 : 5 * 60 * 1000, // 1 minute in dev, 5 minutes in prod
    refetchOnWindowFocus: isDevelopment, // Refetch on focus in development
    refetchOnMount: true, // Always refetch on mount
    refetchInterval: isDevelopment ? 30 * 1000 : undefined, // Auto-refetch every 30s in dev
    ...options,
  });
};

export const useUserById = (id: string, options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiService.getUserById(id),
    ...options,
  });
};
export const useUsers = (
  { page = 1, pageSize = 20, fetchAll = false, role, search, status, excludeCompanyUsers = false }:
  { page?: number; pageSize?: number; fetchAll?: boolean; role?: string; search?: string; status?: 'active' | 'inactive'; excludeCompanyUsers?: boolean } = {}
) => {
  const queryKey = useMemo(() => {
    return fetchAll ? ['users', 'all', { role, search, status, excludeCompanyUsers }] : ['users', { page, pageSize, role, search, status, excludeCompanyUsers }];
  }, [fetchAll, page, pageSize, role, search, status, excludeCompanyUsers]);

  return useQuery({
    queryKey,
    queryFn: () => apiService.getUsers({ page, pageSize, fetchAll, role, search, status, excludeCompanyUsers }),
    placeholderData: (previousData) => previousData,
  });
};

export const useJobs = (filters?: { status?: string; companyId?: string; search?: string; sortBy?: string; }) => {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiService.getJobs(filters),
  });
};

export const useCompanies = (filters?: { page?: number; pageSize?: number; search?: string }, options?: Omit<UseQueryOptions<{ companies: Company[]; pagination: any }, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: () => apiService.getCompanies(filters),
    ...options,
  });
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

export const useTimesheets = (filters?: { status?: string }, options?: Omit<UseQueryOptions<TimesheetDetails[], Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['timesheets', filters],
    queryFn: () => apiService.getTimesheets(filters),
    ...options,
  });
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

export const useApiMutation = <TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: CustomMutationOptions<TData, TVariables>
) => {
  const queryClient = useQueryClient();
  const { invalidateQueries, ...restOptions } = options || {};

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...restOptions,
    onSuccess: (data, variables, context) => {
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey: unknown[]) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      if (restOptions?.onSuccess) {
        restOptions.onSuccess(data, variables, context);
      }
    },
  });
};
