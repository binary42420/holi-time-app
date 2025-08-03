import { QueryClient } from '@tanstack/react-query';

/**
 * Enhanced Avatar Service with unified image management and cache control
 */
export class AvatarService {
  private queryClient: QueryClient;
  private imageCache: Map<string, { url: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Upload avatar and immediately refresh all caches
   */
  async uploadAvatar(userId: string, file: File): Promise<{ success: boolean; avatarUrl: string }> {
    try {
      console.log(`🔄 Uploading avatar for user ${userId}...`);
      
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const result = await response.json();
      const avatarUrl = `/api/users/${userId}/avatar/image`;

      // Immediately refresh all caches
      await this.refreshUserAvatarCache(userId);

      console.log(`✅ Avatar uploaded and cache refreshed for user ${userId}`);
      
      return {
        success: true,
        avatarUrl
      };

    } catch (error) {
      console.error(`❌ Avatar upload failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get avatar URL with cache busting if needed
   */
  getAvatarUrl(userId: string, bustCache = false): string {
    const baseUrl = `/api/users/${userId}/avatar/image`;
    
    if (bustCache) {
      return `${baseUrl}?t=${Date.now()}`;
    }

    // Check if we have a cached version
    const cached = this.imageCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.url;
    }

    // Generate new timestamped URL
    const timestampedUrl = `${baseUrl}?t=${Date.now()}`;
    this.imageCache.set(userId, {
      url: timestampedUrl,
      timestamp: Date.now()
    });

    return timestampedUrl;
  }

  /**
   * Refresh all caches for a user's avatar
   */
  async refreshUserAvatarCache(userId: string): Promise<void> {
    console.log(`🔄 Refreshing avatar cache for user ${userId}...`);

    try {
      // 1. Clear local image cache
      this.imageCache.delete(userId);

      // 2. Invalidate React Query caches
      await Promise.all([
        // User data cache
        this.queryClient.invalidateQueries({
          queryKey: ['users', userId],
        }),
        // Users list cache
        this.queryClient.invalidateQueries({
          queryKey: ['users'],
        }),
        // Avatar-specific cache
        this.queryClient.invalidateQueries({
          queryKey: ['user-avatar', userId],
        }),
        // Any shifts that might display this user
        this.queryClient.invalidateQueries({
          queryKey: ['shifts'],
        }),
      ]);

      // 3. Force browser to reload avatar images
      await this.bustBrowserImageCache(userId);

      // 4. Prefetch new avatar
      await this.prefetchAvatar(userId, true);

      console.log(`✅ Avatar cache refreshed for user ${userId}`);

    } catch (error) {
      console.error(`❌ Failed to refresh avatar cache for user ${userId}:`, error);
    }
  }

  /**
   * Force browser to reload cached images
   */
  private async bustBrowserImageCache(userId: string): Promise<void> {
    const avatarUrl = this.getAvatarUrl(userId, true);
    
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        console.log(`✅ Browser cache busted for user ${userId}`);
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`⚠️ Could not bust browser cache for user ${userId}`);
        resolve(); // Don't fail the whole process
      };
      
      // Force reload with timestamp
      img.src = avatarUrl;
      
      // Timeout after 3 seconds
      setTimeout(resolve, 3000);
    });
  }

  /**
   * Prefetch avatar image
   */
  async prefetchAvatar(userId: string, bustCache = false): Promise<void> {
    try {
      const avatarUrl = this.getAvatarUrl(userId, bustCache);
      
      // Prefetch using React Query
      await this.queryClient.prefetchQuery({
        queryKey: ['user-avatar', userId],
        queryFn: async () => {
          const response = await fetch(avatarUrl);
          if (!response.ok) throw new Error('Failed to fetch avatar');
          return response.blob();
        },
        staleTime: bustCache ? 0 : 10 * 60 * 1000, // 10 minutes, or immediate if busting cache
      });

      // Also prefetch using browser image cache
      const img = new Image();
      img.src = avatarUrl;

      console.log(`✅ Avatar prefetched for user ${userId}`);
    } catch (error) {
      console.warn(`⚠️ Avatar prefetch failed for user ${userId}:`, error);
    }
  }

  /**
   * Batch prefetch avatars for multiple users
   */
  async prefetchAvatars(userIds: string[]): Promise<void> {
    console.log(`🚀 Batch prefetching avatars for ${userIds.length} users...`);
    
    const prefetchPromises = userIds.map(userId => 
      this.prefetchAvatar(userId).catch(error => 
        console.warn(`⚠️ Failed to prefetch avatar for user ${userId}:`, error)
      )
    );

    await Promise.allSettled(prefetchPromises);
    console.log(`✅ Batch avatar prefetch completed`);
  }

  /**
   * Clear all avatar caches
   */
  clearAllCaches(): void {
    console.log('🗑️ Clearing all avatar caches...');
    this.imageCache.clear();
    
    // Clear React Query avatar caches
    this.queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.includes('user-avatar') || 
               queryKey.includes('users') ||
               (queryKey.includes('shifts') && queryKey.length > 1);
      }
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const cacheEntries = Array.from(this.imageCache.entries());
    
    return {
      totalCached: cacheEntries.length,
      freshEntries: cacheEntries.filter(([_, data]) => 
        now - data.timestamp < this.CACHE_DURATION
      ).length,
      staleEntries: cacheEntries.filter(([_, data]) => 
        now - data.timestamp >= this.CACHE_DURATION
      ).length,
      oldestEntry: cacheEntries.length > 0 ? 
        Math.min(...cacheEntries.map(([_, data]) => data.timestamp)) : null,
      newestEntry: cacheEntries.length > 0 ? 
        Math.max(...cacheEntries.map(([_, data]) => data.timestamp)) : null,
    };
  }

  /**
   * Cleanup stale cache entries
   */
  cleanupStaleCache(): void {
    const now = Date.now();
    const staleKeys: string[] = [];

    this.imageCache.forEach((data, userId) => {
      if (now - data.timestamp >= this.CACHE_DURATION) {
        staleKeys.push(userId);
      }
    });

    staleKeys.forEach(key => this.imageCache.delete(key));
    
    if (staleKeys.length > 0) {
      console.log(`🧹 Cleaned up ${staleKeys.length} stale avatar cache entries`);
    }
  }

  /**
   * Start automatic cache cleanup
   */
  startCacheCleanup(): any {
    return setInterval(() => {
      this.cleanupStaleCache();
    }, 2 * 60 * 1000); // Every 2 minutes
  }
}

// Singleton instance
let avatarService: AvatarService | null = null;

export const getAvatarService = (queryClient: QueryClient): AvatarService => {
  if (!avatarService) {
    avatarService = new AvatarService(queryClient);
  }
  return avatarService;
};