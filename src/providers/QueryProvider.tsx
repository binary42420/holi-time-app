'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';

// Enhanced query client configuration for optimal performance
const createQueryClient = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return new QueryClient({
    defaultOptions: {
      queries: {
        // More aggressive caching in development for faster updates after schema changes
        staleTime: isDevelopment ? 1000 * 30 : 1000 * 60 * 2, // 30 seconds in dev, 2 minutes in prod
        gcTime: isDevelopment ? 1000 * 60 * 2 : 1000 * 60 * 30, // 2 minutes in dev, 30 minutes in prod

        // Network optimizations
        refetchOnWindowFocus: isDevelopment, // Refetch on focus in development
        refetchOnReconnect: true, // Refetch when connection restored
        refetchOnMount: true, // Always refetch on component mount
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors (reduced)
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000), // Reduced max delay
      
      // Performance optimizations
      structuralSharing: true, // Prevent unnecessary re-renders
      notifyOnChangeProps: 'all', // Only notify when data actually changes
    },
    mutations: {
      // Retry mutations on network errors
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1; // Reduced retry attempts
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Reduced max delay
    },
  },
  });
};

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    // Reduced persistence configuration to prevent large localStorage
    const localStoragePersister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'holitime-cache',
      serialize: JSON.stringify,
      deserialize: JSON.parse,
      // Only persist successful queries and limit size
      filter: (query) => {
        const isSuccess = query.state.status === 'success';
        const isSmallData = JSON.stringify(query.state.data).length < 10000; // Limit to 10KB per query
        return isSuccess && isSmallData;
      },
    });

    persistQueryClient({
      queryClient,
      persister: localStoragePersister,
      maxAge: 1000 * 60 * 30, // 30 minutes (reduced from 24 hours)
      hydrateOptions: {
        // Don't hydrate stale data
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // Match reduced stale time
          },
        },
      },
    });

    // Performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      const logCacheStats = () => {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        console.log('📊 Cache Stats:', {
          total: queries.length,
          fresh: queries.filter(q => !q.isStale()).length,
          stale: queries.filter(q => q.isStale()).length,
          loading: queries.filter(q => q.state.status === 'loading').length,
          error: queries.filter(q => q.state.status === 'error').length,
        });
      };

      // Log cache stats every 30 seconds in development
      const interval = setInterval(logCacheStats, 30000);
      return () => clearInterval(interval);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
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
    </QueryClientProvider>
  );
}