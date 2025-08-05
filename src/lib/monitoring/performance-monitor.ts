// Performance monitoring and metrics collection

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  tags?: Record<string, string>;
}

interface DatabaseMetrics {
  queryCount: number;
  avgQueryTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  activeConnections: number;
  cacheHitRate: number;
}

interface ApiMetrics {
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  slowRequests: number;
  endpointStats: Record<string, {
    count: number;
    avgTime: number;
    errorCount: number;
  }>;
}

interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  uptime: number;
  activeUsers: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private dbMetrics: DatabaseMetrics = {
    queryCount: 0,
    avgQueryTime: 0,
    slowQueries: 0,
    connectionPoolSize: 0,
    activeConnections: 0,
    cacheHitRate: 0,
  };
  private apiMetrics: ApiMetrics = {
    requestCount: 0,
    avgResponseTime: 0,
    errorRate: 0,
    slowRequests: 0,
    endpointStats: {},
  };
  private systemMetrics: SystemMetrics = {
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    cpuUsage: 0,
    uptime: 0,
    activeUsers: 0,
  };
  private startTime = Date.now();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Record a performance metric
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Record database query performance
  recordDatabaseQuery(queryTime: number, isSlowQuery = false, isCacheHit = false) {
    this.dbMetrics.queryCount++;
    
    // Update average query time
    this.dbMetrics.avgQueryTime = 
      (this.dbMetrics.avgQueryTime * (this.dbMetrics.queryCount - 1) + queryTime) / 
      this.dbMetrics.queryCount;
    
    if (isSlowQuery) {
      this.dbMetrics.slowQueries++;
    }

    this.recordMetric({
      name: 'database.query.time',
      value: queryTime,
      unit: 'ms',
      tags: {
        slow: isSlowQuery.toString(),
        cached: isCacheHit.toString(),
      },
    });
  }

  // Record API request performance
  recordApiRequest(
    endpoint: string, 
    method: string, 
    responseTime: number, 
    statusCode: number
  ) {
    this.apiMetrics.requestCount++;
    
    // Update average response time
    this.apiMetrics.avgResponseTime = 
      (this.apiMetrics.avgResponseTime * (this.apiMetrics.requestCount - 1) + responseTime) / 
      this.apiMetrics.requestCount;
    
    const isError = statusCode >= 400;
    const isSlowRequest = responseTime > 1000; // > 1 second
    
    if (isError) {
      this.apiMetrics.errorRate = 
        (this.apiMetrics.errorRate * (this.apiMetrics.requestCount - 1) + 1) / 
        this.apiMetrics.requestCount;
    }
    
    if (isSlowRequest) {
      this.apiMetrics.slowRequests++;
    }

    // Track per-endpoint stats
    const endpointKey = `${method} ${endpoint}`;
    if (!this.apiMetrics.endpointStats[endpointKey]) {
      this.apiMetrics.endpointStats[endpointKey] = {
        count: 0,
        avgTime: 0,
        errorCount: 0,
      };
    }
    
    const endpointStat = this.apiMetrics.endpointStats[endpointKey];
    endpointStat.count++;
    endpointStat.avgTime = 
      (endpointStat.avgTime * (endpointStat.count - 1) + responseTime) / 
      endpointStat.count;
    
    if (isError) {
      endpointStat.errorCount++;
    }

    this.recordMetric({
      name: 'api.request.time',
      value: responseTime,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status: statusCode.toString(),
        slow: isSlowRequest.toString(),
      },
    });
  }

  // Update system metrics
  updateSystemMetrics() {
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      this.systemMetrics.memoryUsage = {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      };
      
      this.systemMetrics.uptime = process.uptime();
      
      // Record memory metrics
      this.recordMetric({
        name: 'system.memory.used',
        value: memUsage.heapUsed,
        unit: 'bytes',
      });
      
      this.recordMetric({
        name: 'system.memory.percentage',
        value: this.systemMetrics.memoryUsage.percentage,
        unit: 'percentage',
      });
    }
  }

  // Get current metrics summary
  getMetricsSummary() {
    this.updateSystemMetrics();
    
    return {
      database: this.dbMetrics,
      api: this.apiMetrics,
      system: this.systemMetrics,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    };
  }

  // Get metrics for a specific time range
  getMetricsInRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(
      metric => metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  // Get top slow endpoints
  getSlowEndpoints(limit = 10) {
    return Object.entries(this.apiMetrics.endpointStats)
      .sort(([, a], [, b]) => b.avgTime - a.avgTime)
      .slice(0, limit)
      .map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
        errorRate: stats.errorCount / stats.count,
      }));
  }

  // Get performance alerts
  getPerformanceAlerts() {
    const alerts: Array<{
      type: 'warning' | 'error';
      message: string;
      metric: string;
      value: number;
      threshold: number;
    }> = [];

    // Memory usage alerts
    if (this.systemMetrics.memoryUsage.percentage > 90) {
      alerts.push({
        type: 'error',
        message: 'High memory usage detected',
        metric: 'memory.percentage',
        value: this.systemMetrics.memoryUsage.percentage,
        threshold: 90,
      });
    } else if (this.systemMetrics.memoryUsage.percentage > 75) {
      alerts.push({
        type: 'warning',
        message: 'Memory usage is elevated',
        metric: 'memory.percentage',
        value: this.systemMetrics.memoryUsage.percentage,
        threshold: 75,
      });
    }

    // API response time alerts
    if (this.apiMetrics.avgResponseTime > 2000) {
      alerts.push({
        type: 'error',
        message: 'High API response time',
        metric: 'api.avgResponseTime',
        value: this.apiMetrics.avgResponseTime,
        threshold: 2000,
      });
    } else if (this.apiMetrics.avgResponseTime > 1000) {
      alerts.push({
        type: 'warning',
        message: 'Elevated API response time',
        metric: 'api.avgResponseTime',
        value: this.apiMetrics.avgResponseTime,
        threshold: 1000,
      });
    }

    // Error rate alerts
    if (this.apiMetrics.errorRate > 0.1) {
      alerts.push({
        type: 'error',
        message: 'High API error rate',
        metric: 'api.errorRate',
        value: this.apiMetrics.errorRate * 100,
        threshold: 10,
      });
    } else if (this.apiMetrics.errorRate > 0.05) {
      alerts.push({
        type: 'warning',
        message: 'Elevated API error rate',
        metric: 'api.errorRate',
        value: this.apiMetrics.errorRate * 100,
        threshold: 5,
      });
    }

    // Database query time alerts
    if (this.dbMetrics.avgQueryTime > 1000) {
      alerts.push({
        type: 'error',
        message: 'High database query time',
        metric: 'database.avgQueryTime',
        value: this.dbMetrics.avgQueryTime,
        threshold: 1000,
      });
    } else if (this.dbMetrics.avgQueryTime > 500) {
      alerts.push({
        type: 'warning',
        message: 'Elevated database query time',
        metric: 'database.avgQueryTime',
        value: this.dbMetrics.avgQueryTime,
        threshold: 500,
      });
    }

    return alerts;
  }

  // Export metrics for external monitoring systems
  exportMetrics(format: 'json' | 'prometheus' = 'json') {
    const summary = this.getMetricsSummary();
    
    if (format === 'prometheus') {
      let prometheus = '';
      
      // Database metrics
      prometheus += `# HELP database_query_count Total number of database queries\n`;
      prometheus += `# TYPE database_query_count counter\n`;
      prometheus += `database_query_count ${summary.database.queryCount}\n\n`;
      
      prometheus += `# HELP database_query_time_avg Average database query time in milliseconds\n`;
      prometheus += `# TYPE database_query_time_avg gauge\n`;
      prometheus += `database_query_time_avg ${summary.database.avgQueryTime}\n\n`;
      
      // API metrics
      prometheus += `# HELP api_request_count Total number of API requests\n`;
      prometheus += `# TYPE api_request_count counter\n`;
      prometheus += `api_request_count ${summary.api.requestCount}\n\n`;
      
      prometheus += `# HELP api_response_time_avg Average API response time in milliseconds\n`;
      prometheus += `# TYPE api_response_time_avg gauge\n`;
      prometheus += `api_response_time_avg ${summary.api.avgResponseTime}\n\n`;
      
      prometheus += `# HELP api_error_rate API error rate as percentage\n`;
      prometheus += `# TYPE api_error_rate gauge\n`;
      prometheus += `api_error_rate ${summary.api.errorRate * 100}\n\n`;
      
      // System metrics
      prometheus += `# HELP system_memory_usage_bytes Memory usage in bytes\n`;
      prometheus += `# TYPE system_memory_usage_bytes gauge\n`;
      prometheus += `system_memory_usage_bytes ${summary.system.memoryUsage.used}\n\n`;
      
      prometheus += `# HELP system_uptime_seconds System uptime in seconds\n`;
      prometheus += `# TYPE system_uptime_seconds counter\n`;
      prometheus += `system_uptime_seconds ${summary.system.uptime}\n\n`;
      
      return prometheus;
    }
    
    return JSON.stringify(summary, null, 2);
  }

  // Reset metrics (useful for testing)
  reset() {
    this.metrics = [];
    this.dbMetrics = {
      queryCount: 0,
      avgQueryTime: 0,
      slowQueries: 0,
      connectionPoolSize: 0,
      activeConnections: 0,
      cacheHitRate: 0,
    };
    this.apiMetrics = {
      requestCount: 0,
      avgResponseTime: 0,
      errorRate: 0,
      slowRequests: 0,
      endpointStats: {},
    };
    this.startTime = Date.now();
  }

  // Start periodic metrics collection
  startPeriodicCollection(intervalMs = 60000) {
    setInterval(() => {
      this.updateSystemMetrics();
      
      // Log performance summary every minute
      const summary = this.getMetricsSummary();
      console.log('Performance Summary:', {
        requests: summary.api.requestCount,
        avgResponseTime: Math.round(summary.api.avgResponseTime),
        errorRate: Math.round(summary.api.errorRate * 100),
        memoryUsage: Math.round(summary.system.memoryUsage.percentage),
        dbQueries: summary.database.queryCount,
        avgQueryTime: Math.round(summary.database.avgQueryTime),
      });
      
      // Check for alerts
      const alerts = this.getPerformanceAlerts();
      if (alerts.length > 0) {
        console.warn('Performance Alerts:', alerts);
      }
    }, intervalMs);
  }
}

// Middleware for automatic API performance tracking
export function withPerformanceTracking(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const monitor = PerformanceMonitor.getInstance();
    
    try {
      const response = await handler(req);
      const responseTime = Date.now() - startTime;
      
      monitor.recordApiRequest(
        new URL(req.url).pathname,
        req.method,
        responseTime,
        response.status
      );
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      monitor.recordApiRequest(
        new URL(req.url).pathname,
        req.method,
        responseTime,
        500
      );
      
      throw error;
    }
  };
}

// Database query performance tracking
export function trackDatabaseQuery<T>(
  queryFn: () => Promise<T>,
  queryName?: string
): Promise<T> {
  const startTime = Date.now();
  const monitor = PerformanceMonitor.getInstance();
  
  return queryFn().then(
    (result) => {
      const queryTime = Date.now() - startTime;
      const isSlowQuery = queryTime > 500; // > 500ms is considered slow
      
      monitor.recordDatabaseQuery(queryTime, isSlowQuery, false);
      
      if (queryName) {
        monitor.recordMetric({
          name: `database.query.${queryName}`,
          value: queryTime,
          unit: 'ms',
        });
      }
      
      return result;
    },
    (error) => {
      const queryTime = Date.now() - startTime;
      monitor.recordDatabaseQuery(queryTime, true, false);
      throw error;
    }
  );
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start periodic collection in production
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  performanceMonitor.startPeriodicCollection();
}