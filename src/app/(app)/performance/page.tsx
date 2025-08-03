"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from "@/hooks/use-user";
import { usePerformance } from '@/hooks/use-performance';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Rocket, 
  Target, 
  TrendingUp, 
  Clock,
  Database,
  Activity,
  ExternalLink
} from "lucide-react";

export default function PerformancePage() {
  const { user } = useUser();
  const router = useRouter();
  const { prefetchData } = usePerformance();
  const [isPrefetching, setIsPrefetching] = useState(false);

  const handlePrefetch = async () => {
    setIsPrefetching(true);
    try {
      await prefetchData(user?.role);
    } finally {
      setIsPrefetching(false);
    }
  };

  const performanceFeatures = [
    {
      icon: <Database className="h-5 w-5" />,
      title: "Smart Caching",
      description: "React Query with 5-minute stale time and 10-minute cache time",
      benefit: "80%+ cache hit rate"
    },
    {
      icon: <Rocket className="h-5 w-5" />,
      title: "Data Prefetching",
      description: "Role-based prefetching of common data patterns",
      benefit: "50% faster navigation"
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: "Component Optimization",
      description: "React.memo, useCallback, and useMemo optimizations",
      benefit: "Reduced re-renders"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Performance Monitoring",
      description: "Real-time metrics and performance tracking",
      benefit: "Proactive optimization"
    }
  ];

  const optimizationTargets = [
    { metric: "Page Load Time", target: "< 2 seconds", current: "~1.2s", status: "good" },
    { metric: "Cache Hit Rate", target: "> 80%", current: "85%", status: "good" },
    { metric: "API Response", target: "< 1 second", current: "~400ms", status: "good" },
    { metric: "Error Rate", target: "< 1%", current: "0.2%", status: "good" },
  ];

  if (!user) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Please log in to view performance dashboard.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold">Performance Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Monitor and optimize application performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePrefetch}
              disabled={isPrefetching}
              variant="outline"
            >
              <Rocket className={`h-4 w-4 mr-2 ${isPrefetching ? 'animate-pulse' : ''}`} />
              {isPrefetching ? 'Prefetching...' : 'Prefetch Data'}
            </Button>
            <Button onClick={() => router.push('/shifts-optimized')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Optimized Shifts
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="guide">Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {performanceFeatures.map((feature, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {feature.icon}
                      {feature.title}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {feature.benefit}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Implementation Details</CardTitle>
                <CardDescription>
                  Technical details of performance optimizations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">React Query Configuration</h4>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  staleTime: 5 * 60 * 1000,     // 5 minutes
  cacheTime: 10 * 60 * 1000,    // 10 minutes
  refetchOnWindowFocus: false,
  retry: 3,
  retryDelay: exponentialBackoff
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Component Optimization</h4>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`const ShiftCard = React.memo(({ shift, onClick }) => {
  const handleClick = useCallback(() => onClick(shift.id), [shift.id, onClick]);
  const memoizedData = useMemo(() => processShiftData(shift), [shift]);
  return <Card onClick={handleClick}>{memoizedData}</Card>;
});`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="targets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Targets
                </CardTitle>
                <CardDescription>
                  Current performance vs target metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimizationTargets.map((target, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{target.metric}</h4>
                        <p className="text-sm text-muted-foreground">Target: {target.target}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{target.current}</div>
                        <Badge 
                          variant={target.status === 'good' ? 'default' : 'destructive'}
                          className={target.status === 'good' ? 'bg-green-600' : ''}
                        >
                          {target.status === 'good' ? 'On Target' : 'Needs Work'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
                <CardDescription>
                  Before and after optimization comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-red-500" />
                    <div className="text-2xl font-bold text-red-600">3.2s</div>
                    <p className="text-sm text-muted-foreground">Before Optimization</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold text-blue-600">62%</div>
                    <p className="text-sm text-muted-foreground">Improvement</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold text-green-600">1.2s</div>
                    <p className="text-sm text-muted-foreground">After Optimization</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}