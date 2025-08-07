"use client";

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  queryCount: number;
  cacheHitRate: number;
  averageQueryTime: number;
  slowQueries: string[];
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private queryTimes: Map<string, number[]> = new Map();
  private cacheStats = { hits: 0, misses: 0 };
  private slowQueriesThreshold = 1000; // 1 second
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initWebVitals();
      this.startMonitoring();
    }
  }
  
  private initWebVitals() {
    // Monitor Core Web Vitals
    if ('performance' in window && 'getEntriesByType' in performance) {
      // First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        });
      }).observe({ entryTypes: ['paint'] });
      
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        });
      }).observe({ entryTypes: ['first-input'] });
      
      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let cls = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
        this.metrics.cumulativeLayoutShift = cls;
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }
  
  private startMonitoring() {
    // Monitor page load time
    window.addEventListener('load', () => {
      if (performance.timing) {
        this.metrics.pageLoadTime = 
          performance.timing.loadEventEnd - performance.timing.navigationStart;
      }
    });
    
    // Monitor navigation performance
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }
  
  // Track query performance
  trackQuery(queryKey: string[], startTime: number, endTime: number, fromCache: boolean) {
    const duration = endTime - startTime;
    const keyString = queryKey.join('-');
    
    // Update cache stats
    if (fromCache) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }
    
    // Track query times
    if (!this.queryTimes.has(keyString)) {
      this.queryTimes.set(keyString, []);
    }
    this.queryTimes.get(keyString)!.push(duration);
    
    // Track slow queries
    if (duration > this.slowQueriesThreshold) {
      if (!this.metrics.slowQueries) {
        this.metrics.slowQueries = [];
      }
      this.metrics.slowQueries.push(`${keyString}: ${duration}ms`);
    }
    
    this.updateQueryMetrics();
  }
  
  private updateQueryMetrics() {
    const allTimes: number[] = [];
    let totalQueries = 0;
    
    for (const times of this.queryTimes.values()) {
      allTimes.push(...times);
      totalQueries += times.length;
    }
    
    this.metrics.queryCount = totalQueries;
    this.metrics.averageQueryTime = allTimes.length > 0 
      ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length 
      : 0;
    this.metrics.cacheHitRate = 
      (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100;
  }
  
  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return {
      pageLoadTime: this.metrics.pageLoadTime || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      firstInputDelay: this.metrics.firstInputDelay || 0,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift || 0,
      totalBlockingTime: this.metrics.totalBlockingTime || 0,
      queryCount: this.metrics.queryCount || 0,
      cacheHitRate: this.metrics.cacheHitRate || 0,
      averageQueryTime: this.metrics.averageQueryTime || 0,
      slowQueries: this.metrics.slowQueries || [],
    };
  }
  
  // Report performance issues
  private reportMetrics() {
    const metrics = this.getMetrics();
    
    // Log performance warnings
    if (metrics.largestContentfulPaint > 2500) {
      console.warn('⚠️  Slow LCP:', metrics.largestContentfulPaint, 'ms');
    }
    
    if (metrics.firstInputDelay > 100) {
      console.warn('⚠️  Slow FID:', metrics.firstInputDelay, 'ms');
    }
    
    if (metrics.cumulativeLayoutShift > 0.1) {
      console.warn('⚠️  High CLS:', metrics.cumulativeLayoutShift);
    }
    
    if (metrics.averageQueryTime > 500) {
      console.warn('⚠️  Slow queries average:', metrics.averageQueryTime, 'ms');
    }
    
    if (metrics.cacheHitRate < 70) {
      console.warn('⚠️  Low cache hit rate:', metrics.cacheHitRate, '%');
    }
    
    if (metrics.slowQueries.length > 0) {
      console.warn('⚠️  Slow queries detected:', metrics.slowQueries);
    }
    
    // Log performance summary in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Performance Metrics:', {
        'Page Load': `${metrics.pageLoadTime}ms`,
        'LCP': `${metrics.largestContentfulPaint}ms`,
        'FID': `${metrics.firstInputDelay}ms`,
        'CLS': metrics.cumulativeLayoutShift,
        'Queries': metrics.queryCount,
        'Avg Query Time': `${metrics.averageQueryTime}ms`,
        'Cache Hit Rate': `${metrics.cacheHitRate.toFixed(1)}%`,
      });
    }
  }
  
  // Reset metrics
  reset() {
    this.metrics = {};
    this.queryTimes.clear();
    this.cacheStats = { hits: 0, misses: 0 };
  }
  
  // Generate performance report
  generateReport() {
    const metrics = this.getMetrics();
    
    return {
      summary: {
        overall: this.getOverallScore(metrics),
        loadTime: metrics.pageLoadTime,
        queryPerformance: metrics.averageQueryTime,
        cacheEfficiency: metrics.cacheHitRate,
      },
      details: metrics,
      recommendations: this.getRecommendations(metrics),
    };
  }
  
  private getOverallScore(metrics: PerformanceMetrics): number {
    let score = 100;
    
    // Deduct points for poor metrics
    if (metrics.largestContentfulPaint > 2500) score -= 20;
    if (metrics.firstInputDelay > 100) score -= 15;
    if (metrics.cumulativeLayoutShift > 0.1) score -= 15;
    if (metrics.averageQueryTime > 500) score -= 20;
    if (metrics.cacheHitRate < 70) score -= 15;
    if (metrics.slowQueries.length > 3) score -= 15;
    
    return Math.max(0, score);
  }
  
  private getRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.largestContentfulPaint > 2500) {
      recommendations.push('Optimize largest contentful paint with code splitting and lazy loading');
    }
    
    if (metrics.averageQueryTime > 500) {
      recommendations.push('Optimize database queries and add more aggressive caching');
    }
    
    if (metrics.cacheHitRate < 70) {
      recommendations.push('Improve cache hit rate by increasing stale times for static data');
    }
    
    if (metrics.slowQueries.length > 3) {
      recommendations.push('Investigate and optimize slow queries: ' + metrics.slowQueries.join(', '));
    }
    
    if (metrics.queryCount > 50) {
      recommendations.push('Reduce number of queries by batching and using more efficient data fetching');
    }
    
    return recommendations;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for React components
export const usePerformanceMonitor = () => {
  return {
    trackQuery: performanceMonitor.trackQuery.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    reset: performanceMonitor.reset.bind(performanceMonitor),
  };
};