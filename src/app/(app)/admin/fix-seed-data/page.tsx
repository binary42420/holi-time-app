'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  ArrowRight, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SeedDataIssues {
  wrAssignments: number;
  shiftsWithoutCC: number;
  shiftsWithLowCCRequirement: number;
  needsFix: boolean;
  sampleWRAssignments: Array<{
    id: string;
    workerName: string;
    shiftDate: string;
    jobName: string;
    companyName: string;
    currentRole: string;
  }>;
}

export default function FixSeedDataPage() {
  const { toast } = useToast();
  const [issues, setIssues] = useState<SeedDataIssues | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixComplete, setFixComplete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Load issues on component mount
  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/fix-seed-data');
      if (response.ok) {
        const result = await response.json();
        setIssues(result);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load issues');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load seed data issues',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeFix = async () => {
    if (!issues || !issues.needsFix) {
      toast({
        title: 'No Fix Needed',
        description: 'No seed data issues found to fix.',
        variant: 'default'
      });
      return;
    }

    setIsFixing(true);
    try {
      const response = await fetch('/api/admin/fix-seed-data', {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setFixComplete(true);
        
        toast({
          title: 'Fix Successful',
          description: `Fixed ${result.results.wrAssignmentsConverted} WR assignments and ${result.results.crewChiefsCreated} crew chief assignments`,
        });

        // Reload issues to show updated state
        await loadIssues();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fix failed');
      }
    } catch (error) {
      toast({
        title: 'Fix Failed',
        description: error instanceof Error ? error.message : 'Failed to fix seed data',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading Seed Data Issues...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fix Seed Data Issues</h1>
          <p className="text-gray-600 mt-2">
            Resolve issues with seed data including WR role conversions and missing crew chiefs
          </p>
        </div>
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Admin Only
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Seed Data Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!issues ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load seed data issues. Please try refreshing.
                </AlertDescription>
              </Alert>
            ) : !issues.needsFix ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>No issues found!</strong> Your seed data appears to be clean.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Issues found:</strong> Your seed data has some problems that need to be fixed.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{issues.wrAssignments}</div>
                    <div className="text-sm text-gray-600">WR Assignments</div>
                    <div className="text-xs text-gray-500">Need conversion to SH</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{issues.shiftsWithoutCC}</div>
                    <div className="text-sm text-gray-600">Shifts Without CC</div>
                    <div className="text-xs text-gray-500">Need crew chief assignment</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{issues.shiftsWithLowCCRequirement}</div>
                    <div className="text-sm text-gray-600">Low CC Requirements</div>
                    <div className="text-xs text-gray-500">Need requirement update</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowDetails(!showDetails)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  
                  <Button
                    onClick={executeFix}
                    disabled={isFixing}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    {isFixing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Wrench className="h-4 w-4" />
                        Fix Issues
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            <Button
              onClick={loadIssues}
              variant="outline"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDetails && issues && issues.sampleWRAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sample WR Assignments ({issues.sampleWRAssignments.length} of {issues.wrAssignments})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {issues.sampleWRAssignments.map((assignment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium">{assignment.workerName}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(assignment.shiftDate)} • {assignment.jobName} ({assignment.companyName})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">WR</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="default">SH</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {fixComplete && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Fix completed successfully!</strong> All seed data issues have been resolved.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
