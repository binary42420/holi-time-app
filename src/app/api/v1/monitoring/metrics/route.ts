// API route for performance metrics

import { NextRequest } from 'next/server';
import { withApiMiddleware, createSuccessResponse, RequestContext } from '@/lib/middleware/api-middleware';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// GET /api/v1/monitoring/metrics - Get performance metrics
export const GET = withApiMiddleware(
  async (req: NextRequest, context: RequestContext) => {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json';
    const timeRange = url.searchParams.get('timeRange');
    
    if (format === 'prometheus') {
      const prometheusMetrics = performanceMonitor.exportMetrics('prometheus');
      return new Response(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
    
    let metrics;
    if (timeRange) {
      const [start, end] = timeRange.split(',').map(Number);
      metrics = performanceMonitor.getMetricsInRange(start, end);
    } else {
      metrics = performanceMonitor.getMetricsSummary();
    }
    
    return createSuccessResponse(metrics, {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });
  },
  { requireAuth: true, requiredRole: ['Admin'] }
);

// POST /api/v1/monitoring/metrics/reset - Reset metrics (for testing)
export const POST = withApiMiddleware(
  async (req: NextRequest, context: RequestContext) => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Metrics reset is only available in development mode');
    }
    
    performanceMonitor.reset();
    
    return createSuccessResponse({ reset: true }, {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });
  },
  { requireAuth: true, requiredRole: ['Admin'] }
);