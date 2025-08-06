import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { useUser } from "@/hooks/use-user";
import { apiService } from '@/lib/services/api';
import { UserRole } from '@prisma/client';

const useDataPrefetch = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const prefetchWithPriority = useCallback(async () => {
    // Don't prefetch during build time or SSR
    if (!user || typeof window === 'undefined') return;

    try {
      console.log('Data prefetching enabled - user authenticated:', user.name);

      // Reduced prefetching to prevent large cache and cookies
      // Only prefetch essential data for current user
      const criticalPromises = [
        await queryClient.prefetchQuery({
          queryKey: ['shifts', 'today'],
          queryFn: () => apiService.getShifts({ date: 'today' }),
          staleTime: 1 * 60 * 1000, // 1 minute (reduced)
        }),
      ];

      // Wait for critical data first
      await Promise.all(criticalPromises);

      // Minimal additional prefetching to reduce cache size
      // Only prefetch notifications for immediate UI needs
      const minimalPromises = [
        await queryClient.prefetchQuery({
          queryKey: ['notifications'],
          queryFn: apiService.getNotifications,
          staleTime: 2 * 60 * 1000, // 2 minutes
        }),
      ];

      // Execute minimal prefetching without blocking
      Promise.all(minimalPromises).catch(error => {
        console.warn('Minimal prefetching failed:', error);
      });

      // Remove extensive background prefetching to reduce cache size
      // Background data will be loaded on-demand instead

    } catch (error) {
      console.error('Critical data prefetching failed:', error);
    }
  }, [user, queryClient]);

  useEffect(() => {
    // Only run in browser environment with authenticated user
    if (user && typeof window !== 'undefined') {
      // Increased debounce to reduce prefetching frequency
      const timeoutId = setTimeout(prefetchWithPriority, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [user, prefetchWithPriority]);

  // Return prefetch function for manual triggering
  return { prefetchData: prefetchWithPriority };
};

export default useDataPrefetch;