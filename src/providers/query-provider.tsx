'use client';

import React, { createContext, useContext, useCallback, useRef } from 'react';

interface QueryCache {
  [key: string]: {
    data: any;
    timestamp: number;
    staleTime: number;
    error?: string;
  };
}

interface QueryContextType {
  invalidateQuery: (queryKey: string) => void;
  invalidateQueries: (pattern?: string) => void;
  setQueryData: (queryKey: string, data: any) => void;
  getQueryData: (queryKey: string) => any;
  prefetchQuery: (queryKey: string, fetcher: () => Promise<any>) => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => { size: number; keys: string[] };
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

interface QueryProviderProps {
  children: React.ReactNode;
  defaultStaleTime?: number;
  maxCacheSize?: number;
}

export function QueryProvider({ 
  children, 
  defaultStaleTime = 5 * 60 * 1000, // 5 minutes
  maxCacheSize = 100 
}: QueryProviderProps) {
  const cacheRef = useRef<QueryCache>({});
  const listenersRef = useRef<{ [key: string]: (() => void)[] }>({});

  const notifyListeners = useCallback((queryKey: string) => {
    const listeners = listenersRef.current[queryKey] || [];
    listeners.forEach(listener => listener());
  }, []);

  const invalidateQuery = useCallback((queryKey: string) => {
    if (cacheRef.current[queryKey]) {
      delete cacheRef.current[queryKey];
      notifyListeners(queryKey);
    }
  }, [notifyListeners]);

  const invalidateQueries = useCallback((pattern?: string) => {
    const keys = Object.keys(cacheRef.current);
    
    if (pattern) {
      const regex = new RegExp(pattern);
      keys.filter(key => regex.test(key)).forEach(key => {
        delete cacheRef.current[key];
        notifyListeners(key);
      });
    } else {
      // Invalidate all queries
      keys.forEach(key => {
        delete cacheRef.current[key];
        notifyListeners(key);
      });
    }
  }, [notifyListeners]);

  const setQueryData = useCallback((queryKey: string, data: any) => {
    // Implement LRU cache eviction if needed
    const cacheKeys = Object.keys(cacheRef.current);
    if (cacheKeys.length >= maxCacheSize) {
      // Remove oldest entry
      const oldestKey = cacheKeys.reduce((oldest, key) => {
        return cacheRef.current[key].timestamp < cacheRef.current[oldest].timestamp ? key : oldest;
      });
      delete cacheRef.current[oldestKey];
    }

    cacheRef.current[queryKey] = {
      data,
      timestamp: Date.now(),
      staleTime: defaultStaleTime,
    };
    notifyListeners(queryKey);
  }, [defaultStaleTime, maxCacheSize, notifyListeners]);

  const getQueryData = useCallback((queryKey: string) => {
    const cached = cacheRef.current[queryKey];
    if (!cached) return undefined;

    const isStale = Date.now() - cached.timestamp > cached.staleTime;
    return isStale ? undefined : cached.data;
  }, []);

  const prefetchQuery = useCallback(async (queryKey: string, fetcher: () => Promise<any>) => {
    try {
      const data = await fetcher();
      setQueryData(queryKey, data);
    } catch (error) {
      console.error(`Failed to prefetch query ${queryKey}:`, error);
    }
  }, [setQueryData]);

  const clearCache = useCallback(() => {
    const keys = Object.keys(cacheRef.current);
    cacheRef.current = {};
    keys.forEach(key => notifyListeners(key));
  }, [notifyListeners]);

  const getCacheStats = useCallback(() => ({
    size: Object.keys(cacheRef.current).length,
    keys: Object.keys(cacheRef.current),
  }), []);

  const contextValue: QueryContextType = {
    invalidateQuery,
    invalidateQueries,
    setQueryData,
    getQueryData,
    prefetchQuery,
    clearCache,
    getCacheStats,
  };

  return (
    <QueryContext.Provider value={contextValue}>
      {children}
    </QueryContext.Provider>
  );
}

export function useQueryClient() {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQueryClient must be used within a QueryProvider');
  }
  return context;
}

// Higher-order component for query invalidation
export function withQueryInvalidation<P extends object>(
  Component: React.ComponentType<P>,
  queriesToInvalidate: string[]
) {
  return function WithQueryInvalidation(props: P) {
    const queryClient = useQueryClient();

    React.useEffect(() => {
      return () => {
        // Invalidate queries on unmount
        queriesToInvalidate.forEach(query => {
          queryClient.invalidateQuery(query);
        });
      };
    }, [queryClient]);

    return <Component {...props} />;
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  const optimisticUpdate = useCallback(<T,>(
    queryKey: string,
    updater: (oldData: T) => T,
    rollback?: () => void
  ) => {
    const oldData = queryClient.getQueryData(queryKey);
    
    try {
      const newData = updater(oldData);
      queryClient.setQueryData(queryKey, newData);
      
      return {
        rollback: () => {
          queryClient.setQueryData(queryKey, oldData);
          rollback?.();
        }
      };
    } catch (error) {
      console.error('Optimistic update failed:', error);
      rollback?.();
      return { rollback: () => {} };
    }
  }, [queryClient]);

  return { optimisticUpdate };
}

// Hook for background refetching
export function useBackgroundRefetch() {
  const queryClient = useQueryClient();

  const scheduleRefetch = useCallback((
    queryKey: string,
    fetcher: () => Promise<any>,
    interval: number = 30000 // 30 seconds
  ) => {
    const refetch = async () => {
      try {
        const data = await fetcher();
        queryClient.setQueryData(queryKey, data);
      } catch (error) {
        console.error(`Background refetch failed for ${queryKey}:`, error);
      }
    };

    const intervalId = setInterval(refetch, interval);
    
    return () => clearInterval(intervalId);
  }, [queryClient]);

  return { scheduleRefetch };
}

// Hook for query synchronization across tabs
export function useQuerySync() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('query_sync_')) {
        const queryKey = e.key.replace('query_sync_', '');
        if (e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            queryClient.setQueryData(queryKey, data);
          } catch (error) {
            console.error('Failed to sync query data:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  const syncQuery = useCallback((queryKey: string, data: any) => {
    try {
      localStorage.setItem(`query_sync_${queryKey}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to sync query to localStorage:', error);
    }
  }, []);

  return { syncQuery };
}

// Development tools for debugging queries
export function useQueryDevTools() {
  const queryClient = useQueryClient();

  const logCacheStats = useCallback(() => {
    const stats = queryClient.getCacheStats();
    console.group('Query Cache Stats');
    console.log('Cache size:', stats.size);
    console.log('Cached queries:', stats.keys);
    console.groupEnd();
  }, [queryClient]);

  const logQueryData = useCallback((queryKey: string) => {
    const data = queryClient.getQueryData(queryKey);
    console.log(`Query data for ${queryKey}:`, data);
  }, [queryClient]);

  return {
    logCacheStats,
    logQueryData,
    clearCache: queryClient.clearCache,
  };
}
