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
  Calendar,
  Building,
  CheckCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WRAssignment {
  userId: string;
  userName: string;
  shiftId: string;
  shiftDate: string;
  jobName: string;
  companyName: string;
  currentRole: string;
  newRole: string;
}

interface AffectedShift {
  shiftId: string;
  date: string;
  jobName: string;
  companyName: string;
  wrCount: number;
  currentShRequired: number;
  newShRequired: number;
}

interface MigrationPreview {
  wrAssignments: WRAssignment[];
  affectedShifts: AffectedShift[];
  totalPersonnelToUpdate: number;
  totalShiftsToUpdate: number;
}

export default function WRMigrationTool() {
  const { toast } = useToast();
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Load preview on component mount
  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/migrate-wr-to-sh');
      if (response.ok) {
        const result = await response.json();
        setPreview(result.data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load preview');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load migration preview',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeMigration = async () => {
    if (!preview || preview.totalPersonnelToUpdate === 0) {
      toast({
        title: 'No Migration Needed',
        description: 'No WR assignments found to migrate.',
        variant: 'default'
      });
      return;
    }

    setIsMigrating(true);
    try {
      const response = await fetch('/api/admin/migrate-wr-to-sh', {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setMigrationComplete(true);
        
        toast({
          title: 'Migration Successful',
          description: `Updated ${result.data.personnelUpdated} personnel and ${result.data.shiftsUpdated} shifts`,
        });

        // Reload preview to show updated state
        await loadPreview();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Migration failed');
      }
    } catch (error) {
      toast({
        title: 'Migration Failed',
        description: error instanceof Error ? error.message : 'Failed to execute migration',
        variant: 'destructive'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Migration Preview...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            WR → SH Role Migration Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!preview || preview.totalPersonnelToUpdate === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>No migration needed.</strong> No WR role assignments found in the system.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Migration Required:</strong> Found {preview.totalPersonnelToUpdate} WR assignments 
                    across {preview.totalShiftsToUpdate} shifts that need to be converted to SH (Stage Hand).
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{preview.totalPersonnelToUpdate}</div>
                    <div className="text-sm text-gray-600">Personnel to Update</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{preview.totalShiftsToUpdate}</div>
                    <div className="text-sm text-gray-600">Shifts to Update</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {preview.affectedShifts.reduce((sum, shift) => sum + shift.wrCount, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total SH Increase</div>
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
                    onClick={executeMigration}
                    disabled={isMigrating}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    {isMigrating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        Execute Migration
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            <Button
              onClick={loadPreview}
              variant="outline"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDetails && preview && preview.totalPersonnelToUpdate > 0 && (
        <>
          {/* Personnel Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Personnel to Update ({preview.wrAssignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.wrAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">{assignment.userName}</div>
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

          {/* Shift Requirements Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Shift Requirements Updates ({preview.affectedShifts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.affectedShifts.map((shift, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">{formatDate(shift.date)}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {shift.jobName} ({shift.companyName})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">SH Required</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{shift.currentShRequired}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="default">{shift.newShRequired}</Badge>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500">WR → SH</div>
                        <Badge className="bg-green-600">+{shift.wrCount}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {migrationComplete && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Migration completed successfully!</strong> All WR assignments have been converted to SH 
            and shift requirements have been updated accordingly.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
