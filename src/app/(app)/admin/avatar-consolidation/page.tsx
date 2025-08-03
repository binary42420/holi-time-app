'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, Users, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConsolidationStatus {
  isConsolidated: boolean;
  statistics: {
    totalUsers: number;
    usersWithAvatarUrl: number;
    usersWithAvatarData: number;
    usersWithBoth: number;
    needsMigration: boolean;
  };
  recommendation: string;
}

interface ConsolidationResult {
  success: boolean;
  message: string;
  statistics: {
    totalUsers: number;
    usersWithAvatars: number;
    usersWithLegacyData: number;
    migratedCount: number;
    cleanedCount: number;
    errorCount: number;
  };
  errors?: string[];
}

export default function AvatarConsolidationPage() {
  const [status, setStatus] = useState<ConsolidationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [result, setResult] = useState<ConsolidationResult | null>(null);
  const { toast } = useToast();

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/consolidate-avatars');
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch consolidation status',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runConsolidation = async () => {
    setIsConsolidating(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/consolidate-avatars', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Consolidation failed');
      }
      
      const data = await response.json();
      setResult(data);
      
      toast({
        title: 'Success',
        description: 'Avatar consolidation completed successfully'
      });
      
      // Refresh status
      await fetchStatus();
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Avatar consolidation failed',
        variant: 'destructive'
      });
    } finally {
      setIsConsolidating(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Avatar System Consolidation</h1>
            <p className="text-muted-foreground mt-2">
              Ensure all user avatars and profile pictures use a single source of truth
            </p>
          </div>
          <Button onClick={fetchStatus} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading status...</span>
              </div>
            ) : status ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {status.isConsolidated ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Consolidated
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Needs Consolidation
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {status.recommendation}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{status.statistics.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{status.statistics.usersWithAvatarUrl}</div>
                    <div className="text-sm text-muted-foreground">With Avatar URL</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{status.statistics.usersWithAvatarData}</div>
                    <div className="text-sm text-muted-foreground">Legacy Data</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{status.statistics.usersWithBoth}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Failed to load status</div>
            )}
          </CardContent>
        </Card>

        {/* Consolidation Action */}
        {status && !status.isConsolidated && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Run Consolidation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This process will consolidate all avatar data to use avatarUrl as the single source of truth.
                  Legacy avatarData will be migrated and duplicates will be cleaned up.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={runConsolidation} 
                disabled={isConsolidating}
                className="w-full"
              >
                {isConsolidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consolidating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Run Avatar Consolidation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Consolidation Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Consolidation Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{result.statistics.migratedCount}</div>
                  <div className="text-sm text-green-700">Migrated</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{result.statistics.cleanedCount}</div>
                  <div className="text-sm text-blue-700">Cleaned</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{result.statistics.errorCount}</div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Errors:</h4>
                  <div className="space-y-1">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Single Source of Truth:</strong> avatarUrl field</div>
            <div><strong>Storage Format:</strong> Base64 data URLs</div>
            <div><strong>Serving Endpoint:</strong> /api/users/[id]/avatar/image</div>
            <div><strong>Legacy Field:</strong> avatarData (deprecated)</div>
            <div><strong>Cache Strategy:</strong> Enhanced with invalidation</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
