import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Hook for dashboard timesheets
export function useDashboardTimesheets() {
  return useQuery({
    queryKey: ['dashboard', 'timesheets'],
    queryFn: async () => {
      return await api.get('/api/dashboard/timesheets');
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook for dashboard jobs (recent jobs with activity)
export function useDashboardJobs() {
  return useQuery({
    queryKey: ['dashboard', 'jobs'],
    queryFn: async () => {
      return await api.get('/api/dashboard/jobs');
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

// Hook for dashboard shifts (72-hour window with pagination)
export function useDashboardShifts(page: number = 1, limit: number = 5) {
  return useQuery({
    queryKey: ['dashboard', 'shifts', page, limit],
    queryFn: async () => {
      return await api.get(`/api/dashboard/shifts?page=${page}&limit=${limit}`);
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    keepPreviousData: true, // Keep previous data while loading new page
  });
}

// Combined hook for all dashboard data
export function useDashboardData(shiftsPage: number = 1, shiftsLimit: number = 5) {
  const timesheets = useDashboardTimesheets();
  const jobs = useDashboardJobs();
  const shifts = useDashboardShifts(shiftsPage, shiftsLimit);

  return {
    timesheets,
    jobs,
    shifts,
    isLoading: timesheets.isLoading || jobs.isLoading || shifts.isLoading,
    isError: timesheets.isError || jobs.isError || shifts.isError,
    error: timesheets.error || jobs.error || shifts.error,
    refetchAll: () => {
      timesheets.refetch();
      jobs.refetch();
      shifts.refetch();
    },
  };
}