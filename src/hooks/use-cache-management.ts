import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing cache invalidation and refresh
 * Useful for clearing stale data after database changes
 */
export function useCacheManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Clear all React Query caches
  const clearAllQueries = useCallback(() => {
    queryClient.clear();
    console.log('🧹 All React Query caches cleared');
  }, [queryClient]);

  // Invalidate specific query patterns
  const invalidateQueries = useCallback((patterns: string[]) => {
    patterns.forEach(pattern => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey.some(key => 
            typeof key === 'string' && key.includes(pattern)
          );
        }
      });
    });
    console.log('🔄 Invalidated queries:', patterns);
  }, [queryClient]);

  // Force refresh shifts data
  const refreshShifts = useCallback(async () => {
    try {
      // Invalidate all shifts-related queries
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['shift'] });
      
      // Refetch immediately
      await queryClient.refetchQueries({ queryKey: ['shifts'] });
      
      console.log('🔄 Shifts data refreshed');
      
      toast({
        title: 'Success',
        description: 'Shifts data refreshed successfully'
      });
    } catch (error) {
      console.error('Failed to refresh shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh shifts data',
        variant: 'destructive'
      });
    }
  }, [queryClient, toast]);

  // Force refresh users data
  const refreshUsers = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.refetchQueries({ queryKey: ['users'] });
      
      console.log('🔄 Users data refreshed');
      
      toast({
        title: 'Success',
        description: 'Users data refreshed successfully'
      });
    } catch (error) {
      console.error('Failed to refresh users:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh users data',
        variant: 'destructive'
      });
    }
  }, [queryClient, toast]);

  // Force refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      // Clear all caches first
      clearAllQueries();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refetch critical data
      await Promise.allSettled([
        queryClient.refetchQueries({ queryKey: ['shifts'] }),
        queryClient.refetchQueries({ queryKey: ['users'] }),
        queryClient.refetchQueries({ queryKey: ['jobs'] }),
        queryClient.refetchQueries({ queryKey: ['companies'] }),
      ]);
      
      console.log('🔄 All data refreshed');
      
      toast({
        title: 'Success',
        description: 'All data refreshed successfully'
      });
    } catch (error) {
      console.error('Failed to refresh all data:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh all data',
        variant: 'destructive'
      });
    }
  }, [queryClient, toast, clearAllQueries]);

  // Clear browser storage
  const clearBrowserStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        console.log('🧹 Browser storage cleared');
        
        toast({
          title: 'Success',
          description: 'Browser storage cleared successfully'
        });
      } catch (error) {
        console.error('Failed to clear browser storage:', error);
        toast({
          title: 'Error',
          description: 'Failed to clear browser storage',
          variant: 'destructive'
        });
      }
    }
  }, [toast]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      queryKeys: queries.map(q => q.queryKey),
    };
    
    console.log('📊 Cache statistics:', stats);
    return stats;
  }, [queryClient]);

  // Check if running in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Cache clearing functions
    clearAllQueries,
    invalidateQueries,
    clearBrowserStorage,
    
    // Data refresh functions
    refreshShifts,
    refreshUsers,
    refreshAllData,
    
    // Utilities
    getCacheStats,
    isDevelopment,
    
    // Quick actions
    quickRefresh: refreshAllData,
    emergencyRefresh: useCallback(async () => {
      clearAllQueries();
      clearBrowserStorage();
      await refreshAllData();
      
      toast({
        title: 'Emergency Refresh Complete',
        description: 'All caches cleared and data refreshed. Consider doing a hard refresh (Ctrl+Shift+R)',
        duration: 5000
      });
    }, [clearAllQueries, clearBrowserStorage, refreshAllData, toast])
  };
}

export default useCacheManagement;
