"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { toast } from '@/hooks/use-toast';

// Lightweight query client for maximum speed
const createFastQueryClient = () => {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      // Minimal error handling - only show user-facing errors
      if (error instanceof Error && 
          !error.message.includes('fetch') && 
          !error.message.includes('Network') &&
          !error.message.includes('AbortError')) {
        toast({
          title: "Loading Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const mutationCache = new MutationCache({
    onError: (error) => {
      if (error instanceof Error) {
        toast({
          title: "Operation Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Aggressive caching for speed
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 2 * 60 * 1000, // 2 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Don't refetch on mount for speed
        refetchOnReconnect: false, // Only refetch when explicitly needed
        retry: 0, // No retries for maximum speed
        networkMode: 'online',
        // Use suspense for better UX
        suspense: false,
      },
      mutations: {
        retry: 0, // No retries for speed
        networkMode: 'online',
      },
    },
  });
};

interface FastQueryProviderProps {
  children: React.ReactNode;
}

export const EnhancedQueryProvider = ({ children }: FastQueryProviderProps) => {
  const [queryClient] = useState(() => createFastQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};