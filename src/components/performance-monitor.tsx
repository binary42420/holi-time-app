"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Clock, 
  Zap, 
  Trash2, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useQueryPerformanceStats, useCacheManagement } from '@/providers/enhanced-query-provider';

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const PerformanceMonitor = ({ isVisible = false, onClose }: PerformanceMonitorProps) => {
  const { getStats, clearCache, invalidateAll, removeStaleQueries } = useQueryPerformanceStats();
  const { invalidateByPattern } = useCacheManagement();
  
  const [stats, setStats] = useState(getStats());
  const [performanceData, setPerformanceData] = useState({
    memoryUsage: 0,
    renderTime: 0,
    networkRequests: 0,
  });

  // Update stats periodically
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setStats(getStats());
      
      // Get performance data
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        setPerformanceData({
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          renderTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
          networkRequests: performance.getEntriesByType('resource').length,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, getStats]);

  const handleClearCache = async () => {
    clearCache();
    setStats(getStats());
  };

  const handleInvalidateAll = async () => {
    await invalidateAll();
    setStats(getStats());
  };

  const handleRemoveStale = () => {
    const removed = removeStaleQueries();
    console.log(`Removed ${removed} stale queries`);
    setStats(getStats());
  };

  const handleOptimizeCache = async () => {
    // Optimize cache functionality removed
    setStats(getStats());
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getCacheHealthColor = () => {
    const hitRate = stats.totalQueries > 0 ? 
      ((stats.successQueries / stats.totalQueries) * 100) : 0;
    
    if (hitRate >= 80) return 'text-green-500';
    if (hitRate >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCacheHealthIcon = () => {
    const hitRate = stats.totalQueries > 0 ? 
      ((stats.successQueries / stats.totalQueries) * 100) : 0;
    
    if (hitRate >= 80) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (hitRate >= 60) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cache Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalQueries}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getCacheHealthIcon()}
                  Cache Health
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.loadingQueries}</div>
                <div className="text-xs text-muted-foreground">
                  Active requests
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.errorQueries}</div>
                <div className="text-xs text-muted-foreground">
                  Failed queries
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(stats.cacheSize)}</div>
                <div className="text-xs text-muted-foreground">
                  Memory usage
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.totalQueries > 0 ? 
                        ((stats.successQueries / stats.totalQueries) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={stats.totalQueries > 0 ? 
                      (stats.successQueries / stats.totalQueries) * 100 : 0} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Stale Queries</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.staleQueries}
                    </span>
                  </div>
                  <Progress 
                    value={stats.totalQueries > 0 ? 
                      (stats.staleQueries / stats.totalQueries) * 100 : 0} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(performanceData.memoryUsage)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((performanceData.memoryUsage / (50 * 1024 * 1024)) * 100, 100)} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Query Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Query Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-green-500">
                  Success: {stats.successQueries}
                </Badge>
                <Badge variant="default" className="bg-blue-500">
                  Loading: {stats.loadingQueries}
                </Badge>
                <Badge variant="destructive">
                  Error: {stats.errorQueries}
                </Badge>
                <Badge variant="secondary">
                  Stale: {stats.staleQueries}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cache Management Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Cache Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRemoveStale}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Stale ({stats.staleQueries})
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOptimizeCache}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Optimize Cache
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleInvalidateAll}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Invalidate All
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleClearCache}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Real-time Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Page Load Time:</span>
                  <span className="font-mono">{formatTime(performanceData.renderTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network Requests:</span>
                  <span className="font-mono">{performanceData.networkRequests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>JS Heap Size:</span>
                  <span className="font-mono">{formatBytes(performanceData.memoryUsage)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Hook for toggling performance monitor
export const usePerformanceMonitor = () => {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible(!isVisible);

  return {
    isVisible,
    show,
    hide,
    toggle,
    PerformanceMonitor: () => (
      <PerformanceMonitor isVisible={isVisible} onClose={hide} />
    ),
  };
};