// Server-side cache implementation (no "use client" directive)

interface CacheEntry<T> {
  data: T
  timestamp: number
  staleTime: number
  tags: string[]
}

interface CacheConfig {
  defaultStaleTime: number
  maxSize: number
  cleanupInterval: number
  maxMemoryMB: number
  compressionEnabled: boolean
}

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null
  private memoryCheckTimer: ReturnType<typeof setTimeout> | null = null
  private hitCount = 0
  private missCount = 0
  private evictionCount = 0

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultStaleTime: 5 * 60 * 1000, // 5 minutes
      maxSize: 2000,
      cleanupInterval: 10 * 60 * 1000, // 10 minutes
      maxMemoryMB: 200, // 100MB memory limit
      compressionEnabled: true,
      ...config
    }

    this.startCleanupTimer()
    this.startMemoryMonitoring()
  }

  set<T>(
    key: string, 
    data: T, 
    staleTime: number = this.config.defaultStaleTime,
    tags: string[] = []
  ): void {
    // Check memory usage before adding
    this.checkMemoryUsage()
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    // Compress data if enabled and data is large
    let processedData = data
    if (this.config.compressionEnabled && this.shouldCompress(data)) {
      processedData = this.compressData(data)
    }

    this.cache.set(key, {
      data: processedData,
      timestamp: Date.now(),
      staleTime,
      tags
    })
  }

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.missCount++
      return null
    }

    this.hitCount++
    const age = Date.now() - entry.timestamp
    const isStale = age > entry.staleTime

    // Decompress data if it was compressed
    let data = entry.data
    if (this.isCompressed(data)) {
      data = this.decompressData(data)
    }

    return {
      data,
      isStale
    }
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key)
  }

  invalidateByTag(tag: string): number {
    let count = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  invalidateByPattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  getStats(): {
    size: number
    maxSize: number
    oldestEntry: number | null
    newestEntry: number | null
    hitRate: number
    memoryUsageMB: number
    evictionCount: number
  } {
    let oldest: number | null = null
    let newest: number | null = null

    for (const entry of this.cache.values()) {
      if (oldest === null || entry.timestamp < oldest) {
        oldest = entry.timestamp
      }
      if (newest === null || entry.timestamp > newest) {
        newest = entry.timestamp
      }
    }

    const totalRequests = this.hitCount + this.missCount
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      oldestEntry: oldest,
      newestEntry: newest,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsageMB: this.getMemoryUsage(),
      evictionCount: this.evictionCount
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.evictionCount++
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      // Remove entries older than 1 hour regardless of stale time
      if (now - entry.timestamp > 60 * 60 * 1000) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer)
      this.memoryCheckTimer = null
    }
    this.clear()
  }

  private shouldCompress(data: any): boolean {
    // Compress if data is an object/array and JSON size > 1KB
    if (typeof data === 'object' && data !== null) {
      const jsonSize = JSON.stringify(data).length
      return jsonSize > 1024 // 1KB threshold
    }
    return false
  }

  private compressData(data: any): any {
    // Simple compression using JSON stringify with reduced precision for numbers
    if (typeof data === 'object' && data !== null) {
      return {
        __compressed: true,
        data: JSON.stringify(data, (key, value) => {
          if (typeof value === 'number' && !Number.isInteger(value)) {
            return Math.round(value * 100) / 100 // Round to 2 decimal places
          }
          return value
        })
      }
    }
    return data
  }

  private decompressData(data: any): any {
    if (this.isCompressed(data)) {
      return JSON.parse(data.data)
    }
    return data
  }

  private isCompressed(data: any): boolean {
    return typeof data === 'object' && data !== null && data.__compressed === true
  }

  private getMemoryUsage(): number {
    // Estimate memory usage in MB
    let totalSize = 0
    for (const entry of this.cache.values()) {
      totalSize += this.estimateObjectSize(entry)
    }
    return Math.round((totalSize / (1024 * 1024)) * 100) / 100
  }

  private estimateObjectSize(obj: any): number {
    // Rough estimation of object size in bytes
    const jsonString = JSON.stringify(obj)
    return jsonString.length * 2 // Rough estimate for UTF-16 encoding
  }

  private checkMemoryUsage(): void {
    const currentUsage = this.getMemoryUsage()
    if (currentUsage > this.config.maxMemoryMB) {
      // Evict 25% of cache when memory limit is exceeded
      const entriesToEvict = Math.floor(this.cache.size * 0.25)
      for (let i = 0; i < entriesToEvict; i++) {
        this.evictOldest()
      }
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryUsage()
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  // Reset statistics
  resetStats(): void {
    this.hitCount = 0
    this.missCount = 0
    this.evictionCount = 0
  }
}

// Server-side cache instance with enhanced configuration
export const serverCache = new ServerCache({
  defaultStaleTime: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
  maxMemoryMB: 100, // 100MB memory limit
  compressionEnabled: true
})

// Cache key generators (shared between server and client)
export const cacheKeys = {
  shifts: (filter?: string) => `shifts${filter ? `-${filter}` : ''}`,
  shift: (id: string) => `shift-${id}`,
  shiftAssignments: (id: string) => `shift-assignments-${id}`,
  todaysShifts: () => 'shifts-today',
  shiftsByDate: (date: string, status: string, client: string, search: string) => 
    `shifts-by-date-${date}-${status}-${client}-${search}`,
  timesheets: (filter?: string) => `timesheets${filter ? `-${filter}` : ''}`,
  clients: () => 'clients',
  jobs: (companyId?: string) => `jobs${companyId ? `-${companyId}` : ''}`,
  recentJobs: () => 'jobs-recent',
  announcements: () => 'announcements',
  conflicts: (employeeId: string, shiftId: string, date: string) => 
    `conflicts-${employeeId}-${shiftId}-${date}`,
  employeeSuggestions: (roleCode: string, date: string, startTime: string, endTime: string) =>
    `employee-suggestions-${roleCode}-${date}-${startTime}-${endTime}`
}

// Cache tags for invalidation (shared between server and client)
export const cacheTags = {
  shifts: 'shifts',
  timesheets: 'timesheets',
  clients: 'clients',
  jobs: 'jobs',
  announcements: 'announcements',
  assignments: 'assignments',
  conflicts: 'conflicts'
}

// Helper functions for common cache operations
export const cacheHelpers = {
  invalidateShiftData: () => {
    serverCache.invalidateByTag(cacheTags.shifts)
    serverCache.invalidateByTag(cacheTags.assignments)
    serverCache.invalidateByTag(cacheTags.conflicts)
  },

  invalidateTimesheetData: () => {
    serverCache.invalidateByTag(cacheTags.timesheets)
  },

  invalidateJobData: () => {
    serverCache.invalidateByTag(cacheTags.jobs)
  },

  invalidateClientData: () => {
    serverCache.invalidateByTag(cacheTags.clients)
    serverCache.invalidateByTag(cacheTags.jobs)
  },

  invalidateAll: () => {
    serverCache.clear()
  }
}