// Enhanced query configuration
export const QUERY_CONFIG = {
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