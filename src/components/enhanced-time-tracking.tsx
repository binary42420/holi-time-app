'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar } from '@/components/Avatar';
import {
  Clock,
  Play,
  Pause,
  Square,
  Coffee,
  AlertTriangle,
  Users,
  CheckCircle,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import type { RoleCode } from '@/lib/types';

interface TimeEntry {
  id: string;
  entryNumber: number;
  clockIn?: string;
  clockOut?: string;
  isActive?: boolean;
}

interface WorkerData {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  roleCode: RoleCode;
  status: string;
  timeEntries: TimeEntry[];
}

interface EnhancedTimeTrackingProps {
  shiftId: string;
  workers: WorkerData[];
  onRefresh: () => void;
  disabled?: boolean;
}

// Worker status types
type WorkerStatus = 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out' | 'shift_ended' | 'no_show';

export default function EnhancedTimeTracking({
  shiftId,
  workers,
  onRefresh,
  disabled = false
}: EnhancedTimeTrackingProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // Determine worker status based on time entries
  const getWorkerStatus = (worker: WorkerData): WorkerStatus => {
    if (worker.status === 'no_show') return 'no_show';
    if (worker.status === 'shift_ended') return 'shift_ended';
    
    const activeEntry = worker.timeEntries.find(entry => entry.isActive);
    if (activeEntry) {
      return 'clocked_in';
    }
    
    const hasAnyEntry = worker.timeEntries.length > 0;
    if (hasAnyEntry) {
      return 'clocked_out';
    }
    
    return 'not_started';
  };

  // Get current entry number for next clock in
  const getNextEntryNumber = (worker: WorkerData): number => {
    const maxEntry = Math.max(0, ...worker.timeEntries.map(e => e.entryNumber || 1));
    return Math.min(maxEntry + 1, 3); // Max 3 entries
  };

  // Check if worker can have more entries
  const canAddMoreEntries = (worker: WorkerData): boolean => {
    return worker.timeEntries.length < 3;
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
  const handleClockIn = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    if (!canAddMoreEntries(worker)) {
      toast({
        title: 'Maximum Entries Reached',
        description: 'This worker has already reached the maximum of 3 time entries.',
        variant: 'destructive'
      });
      return;
    }

    const actionKey = `clockIn-${workerId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/clock-in`, 'POST', {
        workerId,
        entryNumber: getNextEntryNumber(worker)
      });

      toast({
        title: 'Success',
        description: `${worker.user.name} clocked in successfully`,
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
  const handleClockOut = async (workerId: string) => {
    const actionKey = `clockOut-${workerId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/clock-out`, 'POST', {
        workerId
      });

      const worker = workers.find(w => w.id === workerId);
      toast({
        title: 'Success',
        description: `${worker?.user.name} is now on break`,
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
  const handleEndShift = async (workerId: string) => {
    const actionKey = `endShift-${workerId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/end-worker-shift`, 'POST', {
        workerId
      });

      const worker = workers.find(w => w.id === workerId);
      toast({
        title: 'Success',
        description: `${worker?.user.name}'s shift has ended`,
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
  const handleNoShow = async (workerId: string) => {
    const actionKey = `noShow-${workerId}`;
    setActionLoading(prev => new Set(prev).add(actionKey));

    try {
      await makeApiCall(`/api/shifts/${shiftId}/mark-no-show`, 'POST', {
        workerId
      });

      const worker = workers.find(w => w.id === workerId);
      toast({
        title: 'Success',
        description: `${worker?.user.name} marked as no show`,
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
    const clockedInWorkers = workers.filter(w => getWorkerStatus(w) === 'clocked_in');
    
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
    const activeWorkers = workers.filter(w => {
      const status = getWorkerStatus(w);
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

  // Get status badge
  const getStatusBadge = (status: WorkerStatus) => {
    switch (status) {
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
  const renderActionButtons = (worker: WorkerData) => {
    const status = getWorkerStatus(worker);
    const isLoading = (action: string) => actionLoading.has(`${action}-${worker.id}`);

    if (status === 'shift_ended' || status === 'no_show') {
      return <span className="text-sm text-gray-500">No actions available</span>;
    }

    // Check if worker's shift has been ended
    const isShiftEnded = worker.status === 'ShiftEnded' || worker.status === 'Shift Ended';

    // Check if worker is marked as no show
    const isNoShow = worker.status === 'NoShow' || worker.status === 'no_show';

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
              onClick={() => handleClockIn(worker.id)}
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
              onClick={() => handleNoShow(worker.id)}
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
              onClick={() => handleClockOut(worker.id)}
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
              onClick={() => handleEndShift(worker.id)}
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
              onClick={() => handleClockIn(worker.id)}
              disabled={disabled || isLoading('clockIn') || !canAddMoreEntries(worker)}
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
              onClick={() => handleEndShift(worker.id)}
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
  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      const hours = date.getHours();
      const minutes = date.getMinutes();

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;

      if (minutes === 0) {
        return `${formattedHour}:00 ${ampm}`;
      }

      const formattedMinute = minutes < 10 ? `0${minutes}` : minutes;
      return `${formattedHour}:${formattedMinute} ${ampm}`;
    } catch (error) {
      return '-';
    }
  };

  // Calculate total hours for a worker
  const calculateTotalHours = (timeEntries: TimeEntry[]): number => {
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
  const clockedInWorkers = workers.filter(w => getWorkerStatus(w) === 'clocked_in');
  const activeWorkers = workers.filter(w => {
    const status = getWorkerStatus(w);
    return status === 'clocked_in' || status === 'clocked_out';
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Enhanced Time Tracking
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track up to 3 in/out periods per worker with smart break management
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleMasterStartBreak}
              disabled={disabled || clockedInWorkers.length === 0 || actionLoading.has('masterStartBreak')}
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
              disabled={disabled || activeWorkers.length === 0 || actionLoading.has('masterEndShift')}
            >
              {actionLoading.has('masterEndShift') ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              End All Shifts ({activeWorkers.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
            <TableRow>
              <TableHead className="w-20 sticky left-0 bg-background z-10 border-r">Avatar</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">In 1</TableHead>
              <TableHead className="text-center">Out 1</TableHead>
              <TableHead className="text-center">In 2</TableHead>
              <TableHead className="text-center">Out 2</TableHead>
              <TableHead className="text-center">In 3</TableHead>
              <TableHead className="text-center">Out 3</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Hours</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => {
              const status = getWorkerStatus(worker);
              const totalHours = calculateTotalHours(worker.timeEntries);

              // Check if worker's shift has been ended or is no show
              const isShiftEnded = worker.status === 'ShiftEnded' || worker.status === 'Shift Ended';
              const isNoShow = worker.status === 'NoShow' || worker.status === 'no_show';

              return (
                <TableRow key={worker.id}>
                  {/* Avatar Column - 96px x 96px - Sticky */}
                  <TableCell className="w-20 sticky left-0 bg-background z-10 border-r">
                    <div className="flex justify-center">
                      <Link href={`/employees/${worker.user.id}`}>
                        <Avatar
                          src={worker.user.avatarUrl}
                          name={worker.user.name}
                          userId={worker.user.id}
                          size="xl"
                          enableSmartCaching={true}
                          className="w-24 h-24 cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{worker.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ROLE_DEFINITIONS[worker.roleCode]?.badgeClasses || ''}
                    >
                      {worker.roleCode}
                    </Badge>
                  </TableCell>
                  
                  {/* Time entries for 3 periods - separate columns for in/out */}
                  {[1, 2, 3].map((entryNum) => {
                    const entry = worker.timeEntries.find(e => e.entryNumber === entryNum);
                    return (
                      <React.Fragment key={entryNum}>
                        <TableCell className="text-center">
                          <div className="text-xs font-medium">
                            {formatTime(entry?.clockIn)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-xs font-medium text-muted-foreground">
                            {formatTime(entry?.clockOut)}
                          </div>
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                  
                  <TableCell>
                    {/* Only show status badge if worker hasn't ended shift or is no show */}
                    {!isShiftEnded && !isNoShow && getStatusBadge(status)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {totalHours.toFixed(2)} hrs
                  </TableCell>
                  <TableCell>{renderActionButtons(worker)}</TableCell>
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
