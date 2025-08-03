'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Clock,
  Play,
  Pause,
  Square,
  Coffee,
  AlertTriangle,
  Users,
  CheckCircle,
  UserPlus,
  Settings,
  Plus,
  Edit,
  User as UserIcon,
  FileText
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import EnhancedWorkerSelector from '@/components/EnhancedWorkerSelector';
import WorkerRequirementsManager from '@/components/worker-requirements-manager';
import QuickRequirementsEditor from '@/components/quick-requirements-editor';
import { TimesheetApprovalButton } from '@/components/timesheet-approval-button';
import type { RoleCode, Assignment as WorkerAssignment, User, TimeEntry as TimeEntryType, TimesheetStatus } from '@/lib/types';

interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
}

interface UnifiedEnhancedTimeTrackingProps {
  shiftId: string;
  assignments: WorkerAssignment[];
  availableUsers: User[];
  onAssignmentUpdate: (assignmentId: string, userId: string | null, roleCode?: string) => void;
  onRefresh: () => void;
  onRequirementsChange?: (requirements: WorkerRequirement[]) => void;
  disabled?: boolean;
  shiftStatus?: string;
  timesheets?: {
    id: string;
    status: string;
  }[];
}

// Worker status types
type WorkerStatus = 'not_assigned' | 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out' | 'shift_ended' | 'no_show';

export default function UnifiedEnhancedTimeTracking({
  shiftId,
  assignments,
  availableUsers,
  onAssignmentUpdate,
  onRefresh,
  onRequirementsChange,
  disabled = false,
  shiftStatus,
  timesheets = []
}: UnifiedEnhancedTimeTrackingProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([]);
  const [showQuickEditor, setShowQuickEditor] = useState(false);
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: 'clockIn' | 'clockOut' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Check if shift is completed and should be locked
  const isShiftCompleted = shiftStatus === 'Completed';
  const isTimeTrackingDisabled = disabled || isShiftCompleted;

  // Derive worker requirements from assignments
  useMemo(() => {
    const requirements: WorkerRequirement[] = [];
    const roleCounts = new Map<RoleCode, number>();

    // Count assignments by role
    assignments.forEach(assignment => {
      const current = roleCounts.get(assignment.roleCode as RoleCode) || 0;
      roleCounts.set(assignment.roleCode as RoleCode, current + 1);
    });

    // Convert to requirements array
    roleCounts.forEach((count, roleCode) => {
      requirements.push({ roleCode, requiredCount: count });
    });

    setWorkerRequirements(requirements);
  }, [assignments]);

  // Handle requirements update
  const handleRequirementsUpdate = (newRequirements: WorkerRequirement[]) => {
    setWorkerRequirements(newRequirements);
    // Notify parent component of requirements change
    onRequirementsChange?.(newRequirements);
  };

  // Handle assignment structure change (regenerate assignments)
  const handleAssignmentStructureChange = () => {
    // This will trigger the parent to regenerate assignments based on new requirements
    onRefresh();
  };

  // Determine worker status based on assignment and time entries
  const getWorkerStatus = (assignment: WorkerAssignment): WorkerStatus => {
    if (!assignment.userId) return 'not_assigned';
    if (assignment.status === 'NoShow') return 'no_show';
    if (assignment.status === 'ShiftEnded') return 'shift_ended';
    
    const activeEntry = assignment.timeEntries.find(entry => entry.isActive);
    if (activeEntry) {
      return 'clocked_in';
    }
    
    const hasAnyEntry = assignment.timeEntries.length > 0;
    if (hasAnyEntry) {
      return 'clocked_out';
    }
    
    return 'not_started';
  };

  // Get current entry number for next clock in
  const getNextEntryNumber = (assignment: WorkerAssignment): number => {
    const maxEntry = Math.max(0, ...assignment.timeEntries.map(e => e.entryNumber || 1));
    return Math.min(maxEntry + 1, 3); // Max 3 entries
  };

  // Check if worker can have more entries
  const canAddMoreEntries = (assignment: WorkerAssignment): boolean => {
    return assignment.timeEntries.length < 3;
  };

  // API call helper
  const makeApiCall = async (endpoint: string, method: string, body?: any) => {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Handle clock in
  const handleClockIn = async (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment || !assignment.user) return;

    if (!canAddMoreEntries(assignment)) {
      toast({
        title: 'Maximum Entries Reached',
        description: 'This worker has already reached the maximum of 3 time entries.',
        variant: 'destructive'
      });
      return;
    }

    const actionKey = `clockIn-${assignmentId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/clock-in`, 'POST', {
        workerId: assignmentId,
        entryNumber: getNextEntryNumber(assignment)
      });

      toast({
        title: 'Success',
        description: `${assignment.user.name} clocked in successfully`,
      });

      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock in',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Handle clock out (for break)
  const handleClockOut = async (assignmentId: string) => {
    const actionKey = `clockOut-${assignmentId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/clock-out`, 'POST', {
        workerId: assignmentId
      });

      const assignment = assignments.find(a => a.id === assignmentId);
      toast({
        title: 'Success',
        description: `${assignment?.user?.name} is now on break`,
      });

      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock out',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Handle end shift
  const handleEndShift = async (assignmentId: string) => {
    const actionKey = `endShift-${assignmentId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/end-worker-shift`, 'POST', {
        workerId: assignmentId
      });

      const assignment = assignments.find(a => a.id === assignmentId);
      toast({
        title: 'Success',
        description: `${assignment?.user?.name}'s shift has ended`,
      });

      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to end shift',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Handle no show
  const handleNoShow = async (assignmentId: string) => {
    const actionKey = `noShow-${assignmentId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/mark-no-show`, 'POST', {
        workerId: assignmentId
      });

      const assignment = assignments.find(a => a.id === assignmentId);
      toast({
        title: 'Success',
        description: `${assignment?.user?.name} marked as no show`,
      });

      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark no show',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Master actions
  const handleMasterStartBreak = async () => {
    const clockedInWorkers = assignments.filter(a => getWorkerStatus(a) === 'clocked_in');
    
    if (clockedInWorkers.length === 0) {
      toast({
        title: 'No Workers to Break',
        description: 'No workers are currently clocked in.',
        variant: 'destructive'
      });
      return;
    }

    const actionKey = 'masterStartBreak';
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/master-start-break`, 'POST', {});

      toast({
        title: 'Success',
        description: `${clockedInWorkers.length} workers sent on break`,
      });

      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start break for workers',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  const handleMasterEndShift = async () => {
    const activeWorkers = assignments.filter(a => {
      const status = getWorkerStatus(a);
      return status === 'clocked_in' || status === 'clocked_out';
    });
    
    if (activeWorkers.length === 0) {
      toast({
        title: 'No Active Workers',
        description: 'No workers have active shifts to end.',
        variant: 'destructive'
      });
      return;
    }

    const actionKey = 'masterEndShift';
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/master-end-shift`, 'POST', {});

      toast({
        title: 'Success',
        description: `${activeWorkers.length} worker shifts ended`,
      });

      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to end shifts',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Calculate if timesheet can be finalized
  const canFinalizeTimesheet = useMemo(() => {
    const activeWorkers = assignments.filter(a => {
      if (!a.userId) return false
      
      const isShiftEnded = a.status === 'ShiftEnded'
      
      const isNoShow = a.status === 'NoShow'
      
      return !isShiftEnded && !isNoShow
    })
    
    return activeWorkers.length === 0 && assignments.some(a => a.userId)
  }, [assignments])

  const finalizeTimesheet = async () => {
    if (!canFinalizeTimesheet) {
      const activeWorkers = assignments.filter(a => {
        if (!a.userId) return false
        
        const isShiftEnded = a.status === 'ShiftEnded'
        
        const isNoShow = a.status === 'NoShow'
        
        return !isShiftEnded && !isNoShow
      })
      
      toast({
        title: "Cannot Finalize",
        description: `${activeWorkers.length} workers have not ended their shifts yet`,
        variant: "destructive",
      })
      return
    }

    const actionKey = 'finalizeTimesheet'
    setActionLoading(prev => new Set(prev).add(actionKey))

    try {
      const response = await fetch(`/api/shifts/${shiftId}/finalize-timesheet-simple`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to finalize timesheet')
      }

      const result = await response.json()
      toast({
        title: "Timesheet Finalized",
        description: "Timesheet has been finalized and is pending client approval",
      })

      if (result.timesheetId) {
        window.open(`/timesheets/${result.timesheetId}/approve`, '_blank')
      }

      onRefresh()
    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize timesheet",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(actionKey)
        return newSet
      })
    }
  }

  // Get status badge
  const getStatusBadge = (status: WorkerStatus) => {
    switch (status) {
      case 'not_assigned':
        return <Badge variant="outline" className="bg-gray-100">Not Assigned</Badge>;
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>;
      case 'clocked_in':
        return <Badge className="bg-green-500">Clocked In</Badge>;
      case 'on_break':
        return <Badge className="bg-yellow-500">On Break</Badge>;
      case 'clocked_out':
        return <Badge className="bg-blue-500">Clocked Out</Badge>;
      case 'shift_ended':
        return <Badge className="bg-gray-500">Shift Ended</Badge>;
      case 'no_show':
        return <Badge variant="destructive">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render action buttons based on worker status
  const renderActionButtons = (assignment: WorkerAssignment) => {
    const status = getWorkerStatus(assignment);
    const isLoading = (action: string) => actionLoading.has(`${action}-${assignment.id}`);

    // If shift is completed, show locked message
    if (isShiftCompleted) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle className="h-4 w-4" />
          Shift Completed
        </div>
      );
    }

    if (status === 'not_assigned') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <UserPlus className="h-4 w-4" />
          Assign worker first
        </div>
      );
    }

    if (status === 'shift_ended' || status === 'no_show') {
      return <span className="text-sm text-gray-500">No actions available</span>;
    }

    // Check if worker's shift has been ended
    const isShiftEnded = assignment.status === 'ShiftEnded';

    // Check if worker is marked as no show
    const isNoShow = assignment.status === 'NoShow';

    return (
      <div className="flex gap-1">
        {isNoShow ? (
          // Show "No Show" badge when worker is marked as no show
          <Badge variant="destructive" className="bg-red-600 text-red-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            No Show
          </Badge>
        ) : isShiftEnded ? (
          // Show "Shift Ended" badge when worker's shift has been ended
          <Badge variant="secondary" className="bg-gray-600 text-gray-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Shift Ended
          </Badge>
        ) : status === 'not_started' ? (
          <>
            <Button
              size="sm"
              onClick={() => handleClockIn(assignment.id)}
              disabled={disabled || isLoading('clockIn')}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading('clockIn') ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Start Shift
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleNoShow(assignment.id)}
              disabled={disabled || isLoading('noShow')}
            >
              {isLoading('noShow') ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              No Show
            </Button>
          </>
        ) : status === 'clocked_in' ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClockOut(assignment.id)}
              disabled={disabled || isLoading('clockOut')}
            >
              {isLoading('clockOut') ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
              ) : (
                <Coffee className="h-3 w-3 mr-1" />
              )}
              Start Break
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleEndShift(assignment.id)}
              disabled={disabled || isLoading('endShift')}
            >
              {isLoading('endShift') ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
              ) : (
                <Square className="h-3 w-3 mr-1" />
              )}
              End Shift
            </Button>
          </>
        ) : status === 'clocked_out' ? (
          <>
            <Button
              size="sm"
              onClick={() => handleClockIn(assignment.id)}
              disabled={disabled || isLoading('clockIn') || !canAddMoreEntries(assignment)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading('clockIn') ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              End Break
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleEndShift(assignment.id)}
              disabled={disabled || isLoading('endShift')}
            >
              {isLoading('endShift') ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
              ) : (
                <Square className="h-3 w-3 mr-1" />
              )}
              End Shift
            </Button>
          </>
        ) : null}
      </div>
    );
  };

  // Format time for display
  const formatTime = (timeString?: string | Date, format24hr = false) => {
    if (!timeString) return format24hr ? '' : '-';
    try {
      const date = new Date(timeString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const formattedMinute = minutes < 10 ? `0${minutes}` : minutes;

      if (format24hr) {
        const formattedHour = hours < 10 ? `0${hours}` : hours;
        return `${formattedHour}:${formattedMinute}`;
      }

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;
      return `${formattedHour}:${formattedMinute} ${ampm}`;
    } catch (error) {
      return format24hr ? '' : '-';
    }
  };

  const handleTimeUpdate = async () => {
    if (!editingCell) return;

    const { entryId, field } = editingCell;

    try {
      await makeApiCall(`/api/time-entries/${entryId}`, 'PUT', {
        [field]: editValue,
      });
      toast({
        title: 'Time Updated',
        description: 'The time entry has been successfully updated.',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Could not update time entry.',
        variant: 'destructive',
      });
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Calculate total hours for a worker
  const calculateTotalHours = (timeEntries: TimeEntryType[]): number => {
    let totalMinutes = 0;
    timeEntries.forEach(entry => {
      if (entry.clockIn && entry.clockOut) {
        const start = new Date(entry.clockIn);
        const end = new Date(entry.clockOut);
        totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
      }
    });
    return totalMinutes / 60;
  };

  // Get workers that can be affected by master actions
  const clockedInWorkers = assignments.filter(a => getWorkerStatus(a) === 'clocked_in');
  const activeWorkers = assignments.filter(a => {
    const status = getWorkerStatus(a);
    return status === 'clocked_in' || status === 'clocked_out';
  });

  // Calculate assignment statistics by role
  const roleStats = useMemo(() => {
    const stats: Record<RoleCode, { assigned: number; required: number }> = {
      'CC': { assigned: 0, required: 0 },
      'SH': { assigned: 0, required: 0 },
      'FO': { assigned: 0, required: 0 },
      'RFO': { assigned: 0, required: 0 },
      'RG': { assigned: 0, required: 0 },
      'GL': { assigned: 0, required: 0 },
    };

    // Count assigned workers by role
    assignments.forEach(assignment => {
      // Ensure the role code exists in our stats object
      if (!stats[assignment.roleCode]) {
        console.warn(`Unknown role code: ${assignment.roleCode}`);
        return;
      }

      if (assignment.userId) {
        stats[assignment.roleCode as RoleCode].assigned++;
      }
      // Count required positions
      stats[assignment.roleCode as RoleCode].required++;
    });

    return stats;
  }, [assignments]);

  // Calculate total stats
  const totalAssigned = Object.values(roleStats).reduce((sum, stat) => sum + stat.assigned, 0);
  const totalRequired = Object.values(roleStats).reduce((sum, stat) => sum + stat.required, 0);

  const showSecondEntryColumn = useMemo(() =>
    assignments.some(a => a.timeEntries.some(e => e.entryNumber === 1 && e.clockOut))
  , [assignments]);

  const showThirdEntryColumn = useMemo(() =>
    assignments.some(a => a.timeEntries.some(e => e.entryNumber === 2 && e.clockOut))
  , [assignments]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Tracking & Worker Assignment
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Assign workers and track up to 3 in/out periods per worker with smart break management
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm">
                <span className="font-medium">Total: {totalAssigned}/{totalRequired}</span>
              </div>
              {Object.entries(roleStats).map(([roleCode, stats]) => (
                stats.required > 0 && (
                  <div key={roleCode} className="text-xs">
                    <Badge variant="outline" className="mr-1">{roleCode}</Badge>
                    <span className={stats.assigned === stats.required ? 'text-green-600' : 'text-orange-600'}>
                      {stats.assigned}/{stats.required}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {/* Worker Requirements Management */}
            <WorkerRequirementsManager
              shiftId={shiftId}
              requirements={workerRequirements}
              onRequirementsUpdate={handleRequirementsUpdate}
              onAssignmentStructureChange={handleAssignmentStructureChange}
              disabled={isTimeTrackingDisabled}
            />

            <Button
              variant="outline"
              onClick={() => setShowQuickEditor(!showQuickEditor)}
              className="flex items-center gap-2"
              disabled={isTimeTrackingDisabled}
            >
              <Edit className="h-4 w-4" />
              Quick Edit
            </Button>

            {!isShiftCompleted && (
              <>
                <Button
                  variant="outline"
                  onClick={handleMasterStartBreak}
                  disabled={isTimeTrackingDisabled || clockedInWorkers.length === 0 || actionLoading.has('masterStartBreak')}
                >
                  {actionLoading.has('masterStartBreak') ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                  ) : (
                    <Coffee className="h-4 w-4 mr-2" />
                  )}
                  Start Break All ({clockedInWorkers.length})
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleMasterEndShift}
                  disabled={isTimeTrackingDisabled || activeWorkers.length === 0 || actionLoading.has('masterEndShift')}
                >
                  {actionLoading.has('masterEndShift') ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  End All Shifts ({activeWorkers.length})
                </Button>
                <Button
                  onClick={finalizeTimesheet}
                  disabled={isTimeTrackingDisabled || !canFinalizeTimesheet || actionLoading.has('finalizeTimesheet')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {actionLoading.has('finalizeTimesheet') ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Finalize Timesheet
                </Button>
              </>
            )}
            {isShiftCompleted && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-md text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs sm:text-sm font-medium">
                    <span className="hidden sm:inline">Shift Completed - Time Tracking Locked</span>
                    <span className="sm:hidden">Shift Completed</span>
                  </span>
                </div>
                {timesheets.length > 0 && (
                  <TimesheetApprovalButton
                    timesheetId={timesheets[0].id}
                    status={timesheets[0].status as TimesheetStatus}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Quick Requirements Editor */}
      {showQuickEditor && !isShiftCompleted && (
        <div className="border-b bg-gray-50 p-4">
          <QuickRequirementsEditor
            shiftId={shiftId}
            requirements={workerRequirements}
            onRequirementsUpdate={handleRequirementsUpdate}
            onAssignmentStructureChange={handleAssignmentStructureChange}
            disabled={isTimeTrackingDisabled}
          />
        </div>
      )}

      <CardContent>
        <div className="time-tracking-scroll-container overflow-x-auto">
          <Table className="time-tracking-table min-w-full w-max">
            <TableHeader>
            <TableRow>
              <TableHead className="w-20 sticky left-0 bg-background z-10 border-r">Avatar</TableHead>
              <TableHead>Worker Assignment</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">In 1</TableHead>
              <TableHead className="text-center">Out 1</TableHead>
              {showSecondEntryColumn && (
                <>
                  <TableHead className="text-center">In 2</TableHead>
                  <TableHead className="text-center">Out 2</TableHead>
                </>
              )}
              {showThirdEntryColumn && (
                <>
                  <TableHead className="text-center">In 3</TableHead>
                  <TableHead className="text-center">Out 3</TableHead>
                </>
              )}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Hours</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => {
              const status = getWorkerStatus(assignment);
              const totalHours = calculateTotalHours(assignment.timeEntries);

              // Check if worker's shift has been ended or is no show
              const isShiftEnded = assignment.status === 'ShiftEnded';
              const isNoShow = assignment.status === 'NoShow';

              return (
                <TableRow key={assignment.id}>
                  {/* Avatar Column - 96px x 96px - Sticky */}
                  <TableCell className="w-20 sticky left-0 bg-background z-10 border-r align-top pt-2">
                    <div className="flex flex-col items-center text-center">
                      {assignment.user ? (
                        <>
                          <Avatar
                            src={assignment.user.avatarUrl}
                            name={assignment.user.name}
                            userId={assignment.user.id}
                            className="w-16 h-16"
                            size="md"
                            enableSmartCaching={true}
                          />
                          <p className="text-[10px] leading-tight mt-1">{assignment.user.name}</p>
                        </>
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-gray-300"
                        >
                          <UserIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="min-w-[200px]">
                      <EnhancedWorkerSelector
                        users={availableUsers}
                        selectedUserId={assignment.userId || null}
                        onChange={(userId) => onAssignmentUpdate(assignment.id, userId, assignment.roleCode)}
                        disabled={isTimeTrackingDisabled}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ROLE_DEFINITIONS[assignment.roleCode]?.badgeClasses || ''}
                    >
                      {assignment.roleCode}
                    </Badge>
                  </TableCell>

                  {/* Time entries for 3 periods - separate columns for in/out */}
                  {/* Time entries for 3 periods - separate columns for in/out */}
                  {((): React.ReactNode => {
                    const renderTimeCell = (entry: TimeEntryType | undefined, field: 'clockIn' | 'clockOut') => {
                      const value = entry ? entry[field] : undefined;
                      const isClockOut = field === 'clockOut';
                      const canEdit = entry && (isClockOut ? entry.clockIn : true) && !isShiftCompleted;

                      return (
                        <TableCell
                          className={`text-center ${canEdit ? 'cursor-pointer hover:bg-gray-700/30' : ''}`}
                          onClick={() => {
                            if (canEdit) {
                              setEditingCell({ entryId: entry.id, field });
                              setEditValue(formatTime(value, true));
                            }
                          }}
                        >
                          {editingCell?.entryId === entry?.id && editingCell?.field === field ? (
                            <input
                              type="time"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleTimeUpdate}
                              onKeyDown={(e) => e.key === 'Enter' && handleTimeUpdate()}
                              className="w-24 bg-background text-center"
                              autoFocus
                            />
                          ) : (
                            <div className={`text-xs ${isClockOut ? 'text-muted-foreground' : ''} ${value ? 'font-medium' : 'text-gray-400'}`}>
                              {formatTime(value?.toString())}
                            </div>
                          )}
                        </TableCell>
                      );
                    };

                    const entry1 = assignment.timeEntries.find(e => e.entryNumber === 1);
                    const entry2 = assignment.timeEntries.find(e => e.entryNumber === 2);
                    const entry3 = assignment.timeEntries.find(e => e.entryNumber === 3);

                    return (
                      <>
                        {renderTimeCell(entry1, 'clockIn')}
                        {renderTimeCell(entry1, 'clockOut')}
                        {showSecondEntryColumn && (
                          <>
                            {renderTimeCell(entry2, 'clockIn')}
                            {renderTimeCell(entry2, 'clockOut')}
                          </>
                        )}
                        {showThirdEntryColumn && (
                          <>
                            {renderTimeCell(entry3, 'clockIn')}
                            {renderTimeCell(entry3, 'clockOut')}
                          </>
                        )}
                      </>
                    );
                  })()}

                  <TableCell>
                    {/* Only show status badge if worker hasn't ended shift or is no show */}
                    {!isShiftEnded && !isNoShow && getStatusBadge(status)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {totalHours > 0 ? `${totalHours.toFixed(2)} hrs` : '-'}
                  </TableCell>
                  <TableCell>{renderActionButtons(assignment)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
