/**
 * Client-side API wrapper for browser-based requests
 * This module provides client-side API functions that work in the browser environment
 */

// Simple in-memory cache for client-side operations
const clientCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache TTL in milliseconds (default: 5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generic API request function for client-side calls
 */
async function apiRequest<T>(
  endpoint: string,
  options: any = {},
  cacheTTL: number = DEFAULT_CACHE_TTL
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
  
  // Check cache for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache successful GET requests
    if (!options.method || options.method === 'GET') {
      clientCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL
      });
    }

    return data;
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Clear cache entries (useful after mutations)
 */
function clearCache(pattern?: string) {
  if (pattern) {
    for (const key of clientCache.keys()) {
      if (key.includes(pattern)) {
        clientCache.delete(key);
      }
    }
  } else {
    clientCache.clear();
  }
}

/**
 * Avatar-specific API functions
 */
export const avatarApi = {
  /**
   * Get avatar URL with cache busting
   */
  getAvatarUrl: (userId: string, timestamp?: number): string => {
    const baseUrl = `/api/users/${userId}/avatar/image`;
    return timestamp ? `${baseUrl}?t=${timestamp}` : baseUrl;
  },

  /**
   * Upload avatar for a user
   */
  uploadAvatar: async (userId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`/api/users/${userId}/avatar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Avatar upload failed');
    }

    const result = await response.json();

    // Clear avatar cache after successful upload
    clearCache(`/api/users/${userId}/avatar`);

    // Dispatch global avatar update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { userId, deleted: false }
      }));
    }

    return result;
  },

  /**
   * Delete avatar for a user
   */
  deleteAvatar: async (userId: string): Promise<any> => {
    const response = await fetch(`/api/users/${userId}/avatar`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Avatar deletion failed');
    }

    const result = await response.json();

    // Clear avatar cache after successful deletion
    clearCache(`/api/users/${userId}/avatar`);

    // Dispatch global avatar deletion event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { userId, deleted: true }
      }));
    }

    return result;
  },

  /**
   * Get user avatar data
   */
  getUserAvatar: async (userId: string, options?: { revalidate?: boolean }): Promise<{ url: string } | null> => {
    try {
      const timestamp = options?.revalidate ? Date.now() : undefined;
      const url = avatarApi.getAvatarUrl(userId, timestamp);

      // Check if avatar exists
      const response = await fetch(url, { method: 'HEAD' });

      if (response.ok) {
        return { url };
      }

      return null;
    } catch (error) {
      console.warn(`Failed to get avatar for user ${userId}:`, error);
      return null;
    }
  },

  /**
   * Check if avatar exists and is accessible
   */
  checkAvatar: async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/users/${userId}/avatar/image`, {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

/**
 * General API functions
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, cacheTTL?: number): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'GET' }, cacheTTL);
  },

  /**
   * POST request
   */
  post: <T>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <T>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  clear: clearCache,
  
  /**
   * Get cache statistics
   */
  getStats: () => ({
    size: clientCache.size,
    keys: Array.from(clientCache.keys()),
  }),

  /**
   * Manually set cache entry
   */
  set: (key: string, data: any, ttl: number = DEFAULT_CACHE_TTL) => {
    clientCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  },

  /**
   * Manually get cache entry
   */
  get: (key: string) => {
    const cached = clientCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  },
};

/**
 * Event-driven cache invalidation
 * Listen for avatar update events and invalidate cache
 */
if (typeof window !== 'undefined') {
  window.addEventListener('avatar-updated', (event: any) => {
    const { userId } = event.detail || {};
    if (userId) {
      clearCache(`/api/users/${userId}/avatar`);
    }
  });

  window.addEventListener('user-updated', (event: any) => {
    const { userId } = event.detail || {};
    if (userId) {
      clearCache(`/api/users/${userId}`);
    }
  });
}

/**
 * Utility to dispatch cache invalidation events
 */
export const dispatchCacheInvalidation = (eventType: string, data: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }
};

export default api;
