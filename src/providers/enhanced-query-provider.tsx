"use client";

import React, { useState, useRef, useEffect } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { toast } from '@/hooks/use-toast';

// Enhanced query client configuration
const createEnhancedQueryClient = () => {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      // Global error handling
      console.error('Query error:', error, query.queryKey);
      
      // Show toast for user-facing errors
      if (error instanceof Error && !error.message.includes('fetch')) {
        toast({
          title: "Data Loading Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    onSuccess: (data, query) => {
      // Log successful queries in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Query success:', query.queryKey, data);
      }
    },
  });

  const mutationCache = new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('Mutation error:', error, variables);
      
      // Show toast for mutation errors
      if (error instanceof Error) {
        toast({
          title: "Operation Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    onSuccess: (data, variables, context, mutation) => {
      // Log successful mutations in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Mutation success:', mutation.options.mutationKey, data);
      }
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Enhanced default options for better performance
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Smart retry logic
          if (error instanceof Error) {
            // Don't retry on 4xx errors
            if (error.message.includes('400') || error.message.includes('401') || 
                error.message.includes('403') || error.message.includes('404')) {
              return false;
            }
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        // Network mode for better offline handling
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Enhanced mutation defaults
        retry: 1,
        retryDelay: 1000,
        networkMode: 'offlineFirst',
      },
    },
  });
};

interface EnhancedQueryProviderProps {
  children: React.ReactNode;
}

export const EnhancedQueryProvider = ({ children }: EnhancedQueryProviderProps) => {
  const [queryClient] = useState(() => createEnhancedQueryClient());
  const performanceStatsRef = useRef({
    queriesExecuted: 0,
    mutationsExecuted: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    totalQueryTime: 0,
  });

  // Performance monitoring
  useEffect(() => {
    const originalFetch = queryClient.fetchQuery.bind(queryClient);
    
    queryClient.fetchQuery = async (options) => {
      const startTime = performance.now();
      performanceStatsRef.current.queriesExecuted++;
      
      try {
        const result = await originalFetch(options);
        const endTime = performance.now();
        const queryTime = endTime - startTime;
        
        performanceStatsRef.current.totalQueryTime += queryTime;
        performanceStatsRef.current.averageQueryTime = 
          performanceStatsRef.current.totalQueryTime / performanceStatsRef.current.queriesExecuted;
        
        // Check if data was cached
        const queryState = queryClient.getQueryState(options.queryKey);
        if (queryState?.dataUpdatedAt && (Date.now() - queryState.dataUpdatedAt) < 1000) {
          performanceStatsRef.current.cacheHits++;
        } else {
          performanceStatsRef.current.cacheMisses++;
        }
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const queryTime = endTime - startTime;
        performanceStatsRef.current.totalQueryTime += queryTime;
        performanceStatsRef.current.averageQueryTime = 
          performanceStatsRef.current.totalQueryTime / performanceStatsRef.current.queriesExecuted;
        throw error;
      }
    };

    // Periodic cache optimization
    const optimizationInterval = setInterval(() => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      // Remove stale queries older than 1 hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      let removedCount = 0;
      
      queries.forEach(query => {
        if (query.state.dataUpdatedAt < oneHourAgo && query.isStale()) {
          cache.remove(query);
          removedCount++;
        }
      });

      if (removedCount > 0 && process.env.NODE_ENV === 'development') {
        console.log(`Optimized cache: removed ${removedCount} stale queries`);
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    // Performance logging in development
    const performanceInterval = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        const stats = performanceStatsRef.current;
        const cacheHitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100;
        
        console.group('Query Performance Stats');
        console.log('Queries executed:', stats.queriesExecuted);
        console.log('Mutations executed:', stats.mutationsExecuted);
        console.log('Cache hit rate:', `${cacheHitRate.toFixed(1)}%`);
        console.log('Average query time:', `${stats.averageQueryTime.toFixed(2)}ms`);
        console.log('Total cache size:', queryClient.getQueryCache().getAll().length);
        console.groupEnd();
      }
    }, 60 * 1000); // Every minute in development

    return () => {
      clearInterval(optimizationInterval);
      clearInterval(performanceInterval);
    };
  }, [queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      queryClient.clear();
    };
  }, [queryClient]);

  // Global error boundary for query errors
  const handleError = (error: Error, errorInfo: any) => {
    console.error('Query Provider Error:', error, errorInfo);
    
    toast({
      title: "Application Error",
      description: "Something went wrong. Please refresh the page.",
      variant: "destructive",
    });
  };

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginLeft: '5px',
              transform: 'scale(0.8)',
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
};

// Hook to access performance stats
export const useQueryPerformanceStats = () => {
  const queryClient = useQueryClient();
  
  const getStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      successQueries: queries.filter(q => q.state.status === 'success').length,
      cacheSize: JSON.stringify(queries.map(q => q.state.data)).length,
    };
  };

  const clearCache = () => {
    queryClient.clear();
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };

  const removeStaleQueries = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    let removedCount = 0;
    
    queries.forEach(query => {
      if (query.isStale()) {
        cache.remove(query);
        removedCount++;
      }
    });
    
    return removedCount;
  };

  return {
    getStats,
    clearCache,
    invalidateAll,
    removeStaleQueries,
  };
};

// Hook for manual cache management
export const useCacheManagement = () => {
  const queryClient = useQueryClient();

  const prefetchQuery = async (queryKey: any[], queryFn: () => Promise<any>, staleTime?: number) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: staleTime || 5 * 60 * 1000,
    });
  };

  const invalidateByPattern = (pattern: string) => {
    return queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.some(key => 
          typeof key === 'string' && key.includes(pattern)
        );
      },
    });
  };

  const setQueryData = (queryKey: any[], data: any) => {
    queryClient.setQueryData(queryKey, data);
  };

  const getQueryData = (queryKey: any[]) => {
    return queryClient.getQueryData(queryKey);
  };

  return {
    prefetchQuery,
    invalidateByPattern,
    setQueryData,
    getQueryData,
  };
};

// Re-export QueryClient for compatibility
export { useQueryClient } from '@tanstack/react-query';