"use client";

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPrefetchService } from '@/lib/services/prefetch-service';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  totalQueries: number;
  errorRate: number;
}

export const usePerformance = () => {
  const queryClient = useQueryClient();
  const prefetchService = getPrefetchService(queryClient);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiResponseTime: 0,
    cacheHitRate: 0,
    totalQueries: 0,
    errorRate: 0,
  });
  
  const pageStartTime = useRef(Date.now());

  useEffect(() => {
    // Calculate page load time
    const loadTime = Date.now() - pageStartTime.current;
    
    // Get cache statistics
    const cacheStats = prefetchService.getCacheStats();
    
    // Calculate metrics
    const cacheHitRate = cacheStats.totalQueries > 0 
      ? (cacheStats.freshQueries / cacheStats.totalQueries) * 100 
      : 0;
    
    const errorRate = cacheStats.totalQueries > 0 
      ? (cacheStats.errorQueries / cacheStats.totalQueries) * 100 
      : 0;

    setMetrics({
      pageLoadTime: loadTime,
      apiResponseTime: 0, // This would need to be tracked per API call
      cacheHitRate,
      totalQueries: cacheStats.totalQueries,
      errorRate,
    });
  }, [prefetchService]);

  const prefetchData = async (role?: string) => {
    const startTime = Date.now();
    
    if (role) {
      await prefetchService.prefetchForRole(role);
    } else {
      await prefetchService.prefetchAll();
    }
    
    const duration = Date.now() - startTime;
    console.log(`📊 Prefetch completed in ${duration}ms`);
    
    return duration;
  };

  const clearCache = () => {
    prefetchService.clearCache();
  };

  const refreshStaleData = async () => {
    await prefetchService.refreshStaleData();
  };

  return {
    metrics,
    prefetchData,
    clearCache,
    refreshStaleData,
    cacheStats: prefetchService.getCacheStats(),
  };
};

/**
 * Hook for measuring API call performance
 */
export const useApiPerformance = () => {
  const [apiMetrics, setApiMetrics] = useState<Record<string, number>>({});

  const measureApiCall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      setApiMetrics(prev => ({
        ...prev,
        [endpoint]: duration,
      }));
      
      console.log(`⚡ API call to ${endpoint} took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ API call to ${endpoint} failed after ${duration}ms:`, error);
      throw error;
    }
  };

  return {
    apiMetrics,
    measureApiCall,
  };
};

/**
 * Hook for optimizing component rendering
 */
export const useRenderOptimization = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} rendered ${renderCount.current} times (${timeSinceLastRender}ms since last render)`);
    }
  });

  return {
    renderCount: renderCount.current,
  };
};