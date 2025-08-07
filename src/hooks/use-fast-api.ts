"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/services/api';
import { useUser } from './use-user';

// Fast cache key generation
const createKey = (base: string, params?: Record<string, any>) => {
  if (!params) return [base];
  const keys = [base];
  Object.keys(params).forEach(key => {
    if (params[key] != null) keys.push(`${key}:${params[key]}`);
  });
  return keys;
};

// Fast shifts hook - direct API call
export const useShifts = (filters?: { 
  date?: string; 
  status?: string; 
  companyId?: string; 
  search?: string; 
  jobId?: string; 
}) => {
  return useQuery({
    queryKey: createKey('shifts', filters),
    queryFn: () => apiService.getShifts(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: false,
    retry: 0,
  });
};

// Fast single shift hook
export const useShift = (id: string) => {
  return useQuery({
    queryKey: ['shift', id],
    queryFn: () => apiService.getShift(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnMount: false,
    retry: 0,
  });
};

// Fast users hook
export const useUsers = (params?: { 
  page?: number; 
  pageSize?: number; 
  fetchAll?: boolean; 
  role?: string; 
  search?: string; 
  status?: 'active' | 'inactive'; 
  excludeCompanyUsers?: boolean;
}) => {
  return useQuery({
    queryKey: createKey('users', params),
    queryFn: () => apiService.getUsers(params),
    staleTime: 60 * 1000, // 1 minute for users
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    retry: 0,
  });
};

// Fast jobs hook
export const useJobs = (filters?: { 
  status?: string; 
  companyId?: string; 
  search?: string; 
  sortBy?: string; 
}) => {
  return useQuery({
    queryKey: createKey('jobs', filters),
    queryFn: () => apiService.getJobs(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes for jobs
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    retry: 0,
  });
};

// Fast single job hook
export const useJob = (id: string) => {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => apiService.getJob(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    retry: 0,
  });
};

// Fast companies hook
export const useCompanies = (filters?: { 
  page?: number; 
  pageSize?: number; 
  search?: string;
}) => {
  return useQuery({
    queryKey: createKey('companies', filters),
    queryFn: () => apiService.getCompanies(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes for companies
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    retry: 0,
  });
};

// Fast timesheets hook
export const useTimesheets = (filters?: { 
  shiftId?: string; 
  userId?: string; 
  status?: string;
}) => {
  return useQuery({
    queryKey: createKey('timesheets', filters),
    queryFn: () => apiService.getTimesheets(filters),
    staleTime: 10 * 1000, // 10 seconds for timesheets (more dynamic)
    gcTime: 1 * 60 * 1000, // 1 minute
    refetchOnMount: false,
    retry: 0,
  });
};

// Fast mutations
export const useAssignWorker = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shiftId, userId, roleCode, ignoreConflicts }: {
      shiftId: string;
      userId: string;
      roleCode: string;
      ignoreConflicts?: boolean;
    }) => apiService.assignWorker(shiftId, userId, roleCode, ignoreConflicts),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
    },
    retry: 0,
  });
};

export const useUnassignWorker = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shiftId, assignmentId }: {
      shiftId: string;
      assignmentId: string;
    }) => apiService.unassignWorker(shiftId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
    },
    retry: 0,
  });
};

export const useClockIn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shiftId, assignmentId }: {
      shiftId: string;
      assignmentId: string;
    }) => apiService.clockIn(shiftId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    retry: 0,
  });
};

export const useClockOut = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shiftId, assignmentId }: {
      shiftId: string;
      assignmentId: string;
    }) => apiService.clockOut(shiftId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    retry: 0,
  });
};