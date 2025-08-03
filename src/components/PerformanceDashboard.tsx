"use client";

import React, { useState, useEffect } from 'react';
import { usePerformance } from '@/hooks/use-performance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  Database, 
  Clock, 
  TrendingUp, 
  RefreshCw, 
  Trash2,
  Activity,
  BarChart3
} from "lucide-react";

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className }) => {
  const { metrics, cacheStats, clearCache, refreshStaleData } = usePerformance();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      await refreshStaleData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.fair) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCacheHealthColor = (hitRate: number) => {
    if (hitRate >= 80) return 'text-green-600';
    if (hitRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshCache}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Cache
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Page Load Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Load Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.pageLoadTime, { good: 1000, fair: 2000 })}`}>
              {metrics.pageLoadTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 2000ms
            </p>
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCacheHealthColor(metrics.cacheHitRate)}`}>
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <Progress value={metrics.cacheHitRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Target: &gt; 80%
            </p>
          </CardContent>
        </Card>

        {/* Total Queries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cacheStats.totalQueries}
            </div>
            <p className="text-xs text-muted-foreground">
              Cached queries
            </p>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.errorRate, { good: 1, fair: 5 })}`}>
              {metrics.errorRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 1%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cache Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Statistics
          </CardTitle>
          <CardDescription>
            Detailed breakdown of query cache performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {cacheStats.freshQueries}
              </div>
              <p className="text-sm text-muted-foreground">Fresh</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {cacheStats.staleQueries}
              </div>
              <p className="text-sm text-muted-foreground">Stale</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {cacheStats.loadingQueries}
              </div>
              <p className="text-sm text-muted-foreground">Loading</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {cacheStats.errorQueries}
              </div>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {cacheStats.totalQueries}
              </div>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.pageLoadTime > 2000 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">High Load Time</Badge>
                <span className="text-sm">Consider enabling prefetching or optimizing bundle size</span>
              </div>
            )}
            {metrics.cacheHitRate < 60 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Low Cache Hit Rate</Badge>
                <span className="text-sm">Increase stale time or improve cache key strategy</span>
              </div>
            )}
            {metrics.errorRate > 5 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">High Error Rate</Badge>
                <span className="text-sm">Check API endpoints and error handling</span>
              </div>
            )}
            {cacheStats.staleQueries > cacheStats.freshQueries && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Many Stale Queries</Badge>
                <span className="text-sm">Consider refreshing cache or adjusting stale time</span>
              </div>
            )}
            {metrics.pageLoadTime <= 1000 && metrics.cacheHitRate >= 80 && metrics.errorRate <= 1 && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">Excellent Performance</Badge>
                <span className="text-sm">All metrics are within optimal ranges</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;