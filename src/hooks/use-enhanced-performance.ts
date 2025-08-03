"use client";

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { getEnhancedPerformanceService } from '@/lib/services/enhanced-performance-service';
import { getAvatarService } from '@/lib/services/avatar-service';
import { useUser } from './use-user';

/**
 * Enhanced performance hook with intelligent caching and prefetching
 */
export const useEnhancedPerformance = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  
  const performanceService = useMemo(
    () => getEnhancedPerformanceService(queryClient),
    [queryClient]
  );
  
  const avatarService = useMemo(
    () => getAvatarService(queryClient),
    [queryClient]
  );

  /**
   * Smart prefetch based on current context
   */
  const smartPrefetch = useCallback(async (currentPage?: string) => {
    if (!user) return;
    
    try {
      await performanceService.smartPrefetch(
        user.role,
        currentPage || window.location.pathname,
        user.id
      );
    } catch (error) {
      console.warn('Smart prefetch failed:', error);
    }
  }, [user, performanceService]);

  /**
   * Warm cache for better performance
   */
  const warmCache = useCallback(async () => {
    if (!user) return;
    
    try {
      await performanceService.warmCache(user.role);
    } catch (error) {
      console.warn('Cache warming failed:', error);
    }
  }, [user, performanceService]);

  /**
   * Upload avatar with immediate cache refresh
   */
  const uploadAvatar = useCallback(async (userId: string, file: File) => {
    try {
      const result = await avatarService.uploadAvatar(userId, file);
      
      // Additional cache refresh for immediate UI update
      await performanceService.smartPrefetch(user?.role || 'Staff', '/profile', userId);
      
      return result;
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  }, [avatarService, performanceService, user]);

  /**
   * Get avatar URL with cache busting
   */
  const getAvatarUrl = useCallback((userId: string, bustCache = false) => {
    return avatarService.getAvatarUrl(userId, bustCache);
  }, [avatarService]);

  /**
   * Refresh avatar cache for a specific user
   */
  const refreshAvatarCache = useCallback(async (userId: string) => {
    try {
      await avatarService.refreshUserAvatarCache(userId);
    } catch (error) {
      console.warn('Avatar cache refresh failed:', error);
    }
  }, [avatarService]);

  /**
   * Get comprehensive performance statistics
   */
  const getPerformanceStats = useCallback(() => {
    return performanceService.getEnhancedCacheStats();
  }, [performanceService]);

  /**
   * Optimize performance by cleaning up stale data
   */
  const optimizePerformance = useCallback(async () => {
    try {
      await performanceService.optimizeStaleQueries();
      avatarService.cleanupStaleCache();
    } catch (error) {
      console.warn('Performance optimization failed:', error);
    }
  }, [performanceService, avatarService]);

  /**
   * Prefetch data for a specific page before navigation
   */
  const prefetchForPage = useCallback(async (pagePath: string) => {
    if (!user) return;
    
    try {
      await performanceService.smartPrefetch(user.role, pagePath, user.id);
    } catch (error) {
      console.warn(`Prefetch for page ${pagePath} failed:`, error);
    }
  }, [user, performanceService]);

  /**
   * Batch prefetch avatars for multiple users
   */
  const prefetchAvatars = useCallback(async (userIds: string[]) => {
    try {
      await avatarService.prefetchAvatars(userIds);
    } catch (error) {
      console.warn('Batch avatar prefetch failed:', error);
    }
  }, [avatarService]);

  /**
   * Handle cache invalidation from API responses
   */
  const handleCacheInvalidation = useCallback(async (invalidationData: any) => {
    if (!invalidationData) return;

    const { userId, action, invalidateQueries } = invalidationData;

    try {
      // Handle avatar-specific invalidation
      if (action === 'avatar_updated' && userId) {
        await avatarService.refreshUserAvatarCache(userId);
      }

      // Handle general query invalidation
      if (invalidateQueries && Array.isArray(invalidateQueries)) {
        for (const queryType of invalidateQueries) {
          await queryClient.invalidateQueries({
            predicate: (query) => query.queryKey.includes(queryType)
          });
        }
      }
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  }, [avatarService, queryClient]);

  // Auto-optimize performance on mount and periodically
  useEffect(() => {
    if (!user) return;

    // Initial smart prefetch
    smartPrefetch();

    // Set up periodic optimization
    const optimizationInterval = setInterval(() => {
      optimizePerformance();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(optimizationInterval);
    };
  }, [user, smartPrefetch, optimizePerformance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performanceService.destroy();
    };
  }, [performanceService]);

  return {
    // Core functions
    smartPrefetch,
    warmCache,
    optimizePerformance,
    prefetchForPage,
    
    // Avatar functions
    uploadAvatar,
    getAvatarUrl,
    refreshAvatarCache,
    prefetchAvatars,
    
    // Utility functions
    getPerformanceStats,
    handleCacheInvalidation,
    
    // Services (for advanced usage)
    performanceService,
    avatarService,
  };
};

/**
 * Hook for avatar-specific operations with enhanced caching
 */
export const useEnhancedAvatar = (userId?: string) => {
  const { 
    uploadAvatar, 
    getAvatarUrl, 
    refreshAvatarCache, 
    handleCacheInvalidation 
  } = useEnhancedPerformance();

  const avatarUrl = useMemo(() => {
    return userId ? getAvatarUrl(userId) : null;
  }, [userId, getAvatarUrl]);

  const uploadUserAvatar = useCallback(async (file: File) => {
    if (!userId) throw new Error('User ID is required');
    return uploadAvatar(userId, file);
  }, [userId, uploadAvatar]);

  const refreshCache = useCallback(async () => {
    if (!userId) return;
    await refreshAvatarCache(userId);
  }, [userId, refreshAvatarCache]);

  return {
    avatarUrl,
    uploadAvatar: uploadUserAvatar,
    refreshCache,
    handleCacheInvalidation,
    getAvatarUrl: (bustCache = false) => userId ? getAvatarUrl(userId, bustCache) : null,
  };
};