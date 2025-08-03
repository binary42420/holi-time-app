'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, RefreshCw, Database, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';

export default function CacheManagementPage() {
  const [isClearing, setIsClearing] = useState(false);
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearServerCache = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }
      
      const data = await response.json();
      setLastCleared(new Date().toISOString());
      
      toast({
        title: 'Success',
        description: 'Server cache cleared successfully'
      });
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear server cache',
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };

  const clearClientCache = () => {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    toast({
      title: 'Success',
      description: 'Client cache cleared successfully'
    });
    
    setLastCleared(new Date().toISOString());
  };

  const clearAllCaches = async () => {
    setIsClearing(true);
    try {
      // Clear client cache first
      clearClientCache();
      
      // Then clear server cache
      await clearServerCache();
      
      toast({
        title: 'Success',
        description: 'All caches cleared successfully. Consider doing a hard refresh (Ctrl+Shift+R)'
      });
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear all caches',
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };

  const hardRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cache Management</h1>
            <p className="text-muted-foreground mt-2">
              Clear caches after database schema resets or when seeing stale data
            </p>
          </div>
          <Badge variant={isDevelopment ? "default" : "secondary"}>
            {isDevelopment ? 'Development' : 'Production'}
          </Badge>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={clearAllCaches} 
                disabled={isClearing}
                className="h-16 flex flex-col gap-1"
              >
                {isClearing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
                <span className="font-medium">Clear All Caches</span>
                <span className="text-xs opacity-75">Recommended after schema reset</span>
              </Button>
              
              <Button 
                onClick={hardRefresh}
                variant="outline"
                className="h-16 flex flex-col gap-1"
              >
                <RefreshCw className="h-5 w-5" />
                <span className="font-medium">Hard Refresh</span>
                <span className="text-xs opacity-75">Reload page completely</span>
              </Button>
            </div>
            
            {lastCleared && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Last cleared: {new Date(lastCleared).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Individual Cache Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Cache Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={clearServerCache} 
                disabled={isClearing}
                variant="outline"
                className="justify-start"
              >
                <Database className="h-4 w-4 mr-2" />
                Clear Server Cache
              </Button>
              
              <Button 
                onClick={clearClientCache}
                variant="outline"
                className="justify-start"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Client Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cache Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Current Cache Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Development Settings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Stale Time:</span>
                    <Badge variant="outline">30 seconds</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>GC Time:</span>
                    <Badge variant="outline">2 minutes</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Refetch on Focus:</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto Refetch:</span>
                    <Badge variant="default">30 seconds</Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Production Settings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Stale Time:</span>
                    <Badge variant="outline">2 minutes</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>GC Time:</span>
                    <Badge variant="outline">30 minutes</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Refetch on Focus:</span>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto Refetch:</span>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Stale Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>After Prisma Schema Reset:</strong> Always clear all caches and do a hard refresh to see the latest data.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">If you're still seeing old data:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Click "Clear All Caches" above</li>
                <li>Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)</li>
                <li>Clear browser storage manually (F12 → Application → Storage)</li>
                <li>Check React Query Devtools for cached queries</li>
                <li>Restart the development server if needed</li>
              </ol>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Development Mode:</strong> Caches are automatically more aggressive with shorter times and auto-refresh enabled.
                This should help prevent stale data issues during development.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
