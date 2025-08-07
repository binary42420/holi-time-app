"use client";

import { useQuery, useQueries } from '@tanstack/react-query';
import { useUser } from './use-user';
import { apiService } from '@/lib/services/api';
import { FAST_PAGE_CONFIG, fastKey, perfMonitor, fastTransform } from '@/lib/page-config';
import { useMemo } from 'react';

// High-performance dashboard data hook
export const useDashboardData = () => {
  const { user } = useUser();
  
  // Determine what data to fetch based on user role
  const dataNeeds = useMemo(() => {
    if (!user) return [];
    
    const base = ['shifts', 'jobs'];
    
    switch (user.role) {
      case 'Admin':
      case 'Staff':
        return [...base, 'users', 'companies'];
      case 'CompanyUser':
        return [...base, 'users'];
      case 'CrewChief':
        return [...base];
      case 'Employee':
      default:
        return ['shifts']; // Minimal data for employees
    }
  }, [user?.role]);
  
  // Fast parallel queries
  const results = useQueries({
    queries: dataNeeds.map(queryType => {
      const config = FAST_PAGE_CONFIG.cacheSettings[queryType as keyof typeof FAST_PAGE_CONFIG.cacheSettings];
      
      switch (queryType) {
        case 'shifts':
          return {
            queryKey: fastKey('dashboard-shifts', { 
              userId: user?.id, 
              role: user?.role,
              date: 'today' // Only today's shifts for dashboard
            }),
            queryFn: perfMonitor.timeFunction(
              () => apiService.getShifts({ date: 'today' }).then(shifts => 
                shifts.map(fastTransform.shiftListing).slice(0, 10) // Limit to 10 for speed
              ),
              'dashboard-shifts'
            ),
            ...config,
            ...FAST_PAGE_CONFIG.queryDefaults,
          };
          
        case 'jobs':
          return {
            queryKey: fastKey('dashboard-jobs', { 
              companyId: user?.role === 'CompanyUser' ? user.companyId : undefined,
              limit: 5 // Limit for dashboard
            }),
            queryFn: perfMonitor.timeFunction(
              () => apiService.getJobs({ 
                companyId: user?.role === 'CompanyUser' ? user.companyId || undefined : undefined 
              }).then(jobs => 
                jobs.map(fastTransform.jobListing).slice(0, 5) // Limit to 5 for speed
              ),
              'dashboard-jobs'
            ),
            ...config,
            ...FAST_PAGE_CONFIG.queryDefaults,
          };
          
        case 'users':
          return {
            queryKey: fastKey('dashboard-users', { 
              role: 'Employee',
              pageSize: 20 // Smaller page size for dashboard
            }),
            queryFn: perfMonitor.timeFunction(
              () => apiService.getUsers({ 
                role: 'Employee', 
                pageSize: 20 
              }).then(result => ({
                users: result.users.map(fastTransform.userOption),
                total: result.pagination.totalUsers
              })),
              'dashboard-users'
            ),
            ...config,
            ...FAST_PAGE_CONFIG.queryDefaults,
          };
          
        case 'companies':
          return {
            queryKey: fastKey('dashboard-companies', { pageSize: 10 }),
            queryFn: perfMonitor.timeFunction(
              () => apiService.getCompanies({ pageSize: 10 }),
              'dashboard-companies'
            ),
            ...config,
            ...FAST_PAGE_CONFIG.queryDefaults,
          };
          
        default:
          return {
            queryKey: [queryType],
            queryFn: () => Promise.resolve(null),
            enabled: false,
          };
      }
    }),
  });
  
  // Transform results into usable format
  const dashboardData = useMemo(() => {
    const data: Record<string, any> = {};
    
    results.forEach((result, index) => {
      const queryType = dataNeeds[index];
      data[queryType] = {
        data: result.data,
        isLoading: result.isLoading,
        error: result.error,
        isSuccess: result.isSuccess,
      };
    });
    
    return data;
  }, [results, dataNeeds]);
  
  // Overall loading state
  const isLoading = results.some(r => r.isLoading);
  const hasError = results.some(r => r.error);
  const isSuccess = results.every(r => r.isSuccess || r.error);
  
  return {
    ...dashboardData,
    meta: {
      isLoading,
      hasError,
      isSuccess,
      loadedCount: results.filter(r => r.isSuccess).length,
      totalCount: results.length,
    }
  };
};

// Fast stats calculation hook
export const useDashboardStats = () => {
  const { user } = useUser();
  
  return useQuery({
    queryKey: fastKey('dashboard-stats', { userId: user?.id, role: user?.role }),
    queryFn: async () => {
      // Minimal stats query for speed
      const today = new Date().toISOString().split('T')[0];
      
      const [shifts, jobs] = await Promise.all([
        apiService.getShifts({ date: 'today' }),
        user?.role === 'Admin' || user?.role === 'Staff' 
          ? apiService.getJobs() 
          : Promise.resolve([])
      ]);
      
      return {
        todayShifts: shifts.length,
        activeShifts: shifts.filter(s => s.status === 'Active' || s.status === 'InProgress').length,
        totalJobs: jobs.length,
        pendingShifts: shifts.filter(s => s.status === 'Pending').length,
      };
    },
    ...FAST_PAGE_CONFIG.cacheSettings.shifts,
    ...FAST_PAGE_CONFIG.queryDefaults,
    enabled: !!user,
  });
};

// Quick actions data
export const useQuickActions = () => {
  const { user } = useUser();
  
  const actions = useMemo(() => {
    const baseActions = [];
    
    if (user?.role === 'Admin' || user?.role === 'Staff') {
      baseActions.push(
        { id: 'create-job', label: 'Create Job', href: '/jobs/new' },
        { id: 'create-shift', label: 'Create Shift', href: '/shifts/new' },
        { id: 'manage-users', label: 'Manage Users', href: '/users' }
      );
    }
    
    if (user?.role === 'CompanyUser') {
      baseActions.push(
        { id: 'view-jobs', label: 'View Jobs', href: '/jobs' },
        { id: 'manage-employees', label: 'Manage Employees', href: '/users?role=Employee' }
      );
    }
    
    if (user?.role === 'CrewChief' || user?.role === 'Employee') {
      baseActions.push(
        { id: 'my-shifts', label: 'My Shifts', href: '/shifts' },
        { id: 'timesheets', label: 'Timesheets', href: '/timesheets' }
      );
    }
    
    return baseActions;
  }, [user?.role]);
  
  return { actions, isLoading: false };
};