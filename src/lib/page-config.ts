// High-performance page configuration
export const FAST_PAGE_CONFIG = {
  // React Query defaults optimized for speed
  queryDefaults: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    networkMode: 'online' as const,
  },
  
  // Cache settings for different data types
  cacheSettings: {
    // Fast-changing data
    shifts: { staleTime: 10 * 1000, gcTime: 1 * 60 * 1000 },
    timesheets: { staleTime: 5 * 1000, gcTime: 30 * 1000 },
    assignments: { staleTime: 15 * 1000, gcTime: 1 * 60 * 1000 },
    
    // Medium-changing data
    jobs: { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 },
    users: { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 },
    
    // Slow-changing data
    companies: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
    settings: { staleTime: 10 * 60 * 1000, gcTime: 60 * 60 * 1000 },
  },
  
  // Preloading strategies
  preload: {
    dashboard: ['shifts', 'jobs', 'users'],
    shiftDetails: ['shift', 'assignments', 'timesheets'],
    jobManagement: ['jobs', 'shifts', 'companies'],
  },
  
  // Bundle optimization
  chunkSize: {
    maxInitialRequests: 3,
    maxAsyncRequests: 5,
    minChunkSize: 20000,
  },
};

// Fast query key generator
export const fastKey = (base: string, params?: Record<string, any>) => {
  if (!params) return [base];
  const parts = [base];
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '' && value !== 'all') {
      parts.push(`${key}:${String(value).substring(0, 50)}`);
    }
  }
  return parts;
};

// Performance monitoring utilities
export const perfMonitor = {
  markStart: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  },
  
  markEnd: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0];
        if (measure && measure.duration > 1000) {
          console.warn(`Slow operation: ${name} took ${measure.duration.toFixed(2)}ms`);
        }
      } catch (e) {
        // Ignore measurement errors
      }
    }
  },
  
  timeFunction: <T extends (...args: any[]) => any>(fn: T, name: string): T => {
    return ((...args: any[]) => {
      perfMonitor.markStart(name);
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => perfMonitor.markEnd(name));
      } else {
        perfMonitor.markEnd(name);
        return result;
      }
    }) as T;
  }
};

// Memory-efficient data transformers
export const fastTransform = {
  // Only keep essential shift data for listings
  shiftListing: (shift: any) => ({
    id: shift.id,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    status: shift.status,
    location: shift.location,
    jobName: shift.job?.name,
    companyName: shift.job?.company?.name,
    assignedCount: shift.assignedPersonnel?.length || 0,
    requiredTotal: (shift.requiredCrewChiefs || 0) + 
                  (shift.requiredStagehands || 0) + 
                  (shift.requiredForkOperators || 0) + 
                  (shift.requiredReachForkOperators || 0) + 
                  (shift.requiredRiggers || 0) + 
                  (shift.requiredGeneralLaborers || 0),
  }),
  
  // Essential user data for dropdowns
  userOption: (user: any) => ({
    id: user.id,
    name: user.name,
    role: user.role,
    // Skip avatarUrl to reduce payload
  }),
  
  // Essential job data for listings
  jobListing: (job: any) => ({
    id: job.id,
    name: job.name,
    status: job.status,
    location: job.location,
    startDate: job.startDate,
    endDate: job.endDate,
    companyName: job.company?.name,
    shiftsCount: job._count?.shifts || 0,
  }),
};