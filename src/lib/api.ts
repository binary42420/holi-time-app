interface ApiError extends Error {
  status?: number
  details?: unknown
}

export interface Timesheet {
  id: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  clientId?: string
  managerId?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
  }
}

interface RequestOptions {
  useCache?: boolean;
  cacheTime?: number;
  revalidate?: boolean;
}

// Server-side cache using Map (simple in-memory cache)
const serverCache = new Map<string, { data: any; timestamp: number; staleTime: number }>();

function getFromServerCache<T>(key: string): T | null {
  const entry = serverCache.get(key);
  if (!entry) return null;

  const isStale = Date.now() - entry.timestamp > entry.staleTime;
  if (isStale) {
    serverCache.delete(key);
    return null;
  }

  return entry.data;
}

function setToServerCache<T>(key: string, data: T, staleTime: number): void {
  serverCache.set(key, {
    data,
    timestamp: Date.now(),
    staleTime
  });

  // Clean up old entries periodically
  if (serverCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of serverCache.entries()) {
      if (now - v.timestamp > v.staleTime) {
        serverCache.delete(k);
      }
    }
  }
}

function invalidateServerCacheByPattern(pattern: RegExp): number {
  let count = 0;
  for (const key of serverCache.keys()) {
    if (pattern.test(key)) {
      serverCache.delete(key);
      count++;
    }
  }
  return count;
}

export const api = {
  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { useCache = true, cacheTime = 5 * 60 * 1000, revalidate = false } = options;

    // Check server-side cache first
    if (useCache && !revalidate && typeof window === 'undefined') {
      const cached = getFromServerCache<T>(`api-${path}`);
      if (cached) {
        return cached;
      }
    }

    const headers: any = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    };

    // Handle both client and server-side requests
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      : '';

    const res = await fetch(`${baseUrl}/api${path}`, {
      headers,
      // Enable compression
      compress: true,
    });
    
    if (!res.ok) {
      const error: ApiError = new Error(await res.text())
      error.status = res.status
      throw error
    }

    const response: ApiResponse<T> = await res.json()
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown API error')
    }

    const data = response.data!;

    // Cache the result (server-side only)
    if (useCache && typeof window === 'undefined') {
      setToServerCache(`api-${path}`, data, cacheTime);
    }

    return data;
  },
  
  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    };

    // Handle both client and server-side requests
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      : '';

    const res = await fetch(`${baseUrl}/api${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      // Enable compression
      compress: true,
    })

    if (!res.ok) {
      const error: ApiError = new Error(await res.text())
      error.status = res.status
      error.details = await res.json().catch(() => undefined)
      throw error
    }

    const response: ApiResponse<T> = await res.json()
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown API error')
    }

    // Invalidate related cache entries on mutations (server-side)
    if (typeof window === 'undefined') {
      if (path.includes('/shifts')) {
        invalidateServerCacheByPattern(/api-.*shifts/);
        invalidateServerCacheByPattern(/api-.*assignments/);
      } else if (path.includes('/jobs')) {
        invalidateServerCacheByPattern(/api-.*jobs/);
      } else if (path.includes('/users')) {
        invalidateServerCacheByPattern(/api-.*users/);
      }
    }

    return response.data!
  },

  async put<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    };

    // Handle both client and server-side requests
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      : '';

    const res = await fetch(`${baseUrl}/api${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      compress: true,
    })

    if (!res.ok) {
      const error: ApiError = new Error(await res.text())
      error.status = res.status
      error.details = await res.json().catch(() => undefined)
      throw error
    }

    const response: ApiResponse<T> = await res.json()
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown API error')
    }

    // Invalidate related cache entries on mutations (server-side)
    if (typeof window === 'undefined') {
      if (path.includes('/shifts')) {
        invalidateServerCacheByPattern(/api-.*shifts/);
        invalidateServerCacheByPattern(/api-.*assignments/);
      } else if (path.includes('/jobs')) {
        invalidateServerCacheByPattern(/api-.*jobs/);
      } else if (path.includes('/users')) {
        invalidateServerCacheByPattern(/api-.*users/);
      }
    }

    return response.data!
  },

  async delete<T>(path: string): Promise<T> {
    const headers: any = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    };

    // Handle both client and server-side requests
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      : '';

    const res = await fetch(`${baseUrl}/api${path}`, {
      method: 'DELETE',
      headers,
      compress: true,
    })

    if (!res.ok) {
      const error: ApiError = new Error(await res.text())
      error.status = res.status
      throw error
    }

    const response: ApiResponse<T> = await res.json()
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown API error')
    }

    // Invalidate related cache entries on mutations (server-side)
    if (typeof window === 'undefined') {
      if (path.includes('/shifts')) {
        invalidateServerCacheByPattern(/api-.*shifts/);
        invalidateServerCacheByPattern(/api-.*assignments/);
      } else if (path.includes('/jobs')) {
        invalidateServerCacheByPattern(/api-.*jobs/);
      } else if (path.includes('/users')) {
        invalidateServerCacheByPattern(/api-.*users/);
      }
    }

    return response.data!
  }
}

export const getUsers = () => api.get('/users')
