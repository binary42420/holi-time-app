'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Shift, User as UserType, Assignment, WorkerRole, RoleCode } from '@/lib/types';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import { PencilIcon } from '@/components/IconComponents';
import { User, CheckCircle, AlertTriangle } from "lucide-react";
import EnhancedWorkerSelector from '@/components/EnhancedWorkerSelector';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { format } from 'date-fns';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { LoadingSpinner, ButtonLoading } from '@/components/loading-states';
import { useToast } from "@/hooks/use-toast";

interface UnifiedTimeTrackingProps {
  shift: Shift;
  users: UserType[];
  onAssignmentUpdate: (assignmentId: string, userId: string | null) => void;
  onEditShift: () => void;
  onClockIn: (assignmentId: string) => Promise<void>;
  onClockOut: (assignmentId: string) => Promise<void>;
  onEndShift: () => Promise<void>;
  isLoading?: boolean;
}

// Separate components to avoid conditional rendering hooks issues
const PlaceholderSlot: React.FC<{
  slot: any;
  users: UserType[];
  onSelectChange: (id: string, userId: string | null) => void;
}> = React.memo(function PlaceholderSlot({ slot, users, onSelectChange }) {
  return (
  <div className="p-4">
    <div className="flex items-center mb-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-gray-500">?</div>
      <div className="flex-grow flex items-center">
        <EnhancedWorkerSelector
          users={users}
          selectedUserId={null}
          onChange={(userId) => onSelectChange(slot.id, userId)}
          showQuestionMark
          requiredRole={slot.roleCode}
        />
        <div className="ml-4">
          <RoleBadge roleCode={slot.roleCode as RoleCode} />
        </div>
      </div>
    </div>
    <div className="flex items-center p-4 bg-gray-900/50 rounded-md" style={{ minWidth: '500px' }}>
      <div className="w-1/4">--:--</div>
      <div className="w-1/4">--:--</div>
      <div className="w-1/4">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-600 text-gray-100">
          Not Clocked In
        </span>
      </div>
      <div className="w-1/4">
        <button className="px-3 py-1 text-sm font-medium text-white bg-green-600 opacity-50 rounded-md cursor-not-allowed" disabled>
          Start Shift
        </button>
      </div>
    </div>
  </div>
  );
});

const AssignmentSlot: React.FC<{
  assignment: Assignment;
  users: UserType[];
  onSelectChange: (id: string, userId: string | null) => void;
  onClockIn: (id: string) => void;
  onClockOut: (id: string) => void;
  processingActions: Set<string>;
  formatTime: (time?: string | Date | null) => string;
}> = React.memo(function AssignmentSlot({ assignment, users, onSelectChange, onClockIn, onClockOut, processingActions, formatTime }) {
  const lastTimeEntry = assignment.timeEntries?.[assignment.timeEntries.length - 1];
  const status = lastTimeEntry && lastTimeEntry.clockIn && !lastTimeEntry.clockOut ? 'Clocked In' : 'Clocked Out';
  const selectedUser = assignment.user || users.find(u => u.id === assignment.userId);

  // Check if worker's shift has been ended
  const isShiftEnded = assignment.status === 'ShiftEnded';

  // Check if worker is marked as no show
  const isNoShow = assignment.status === 'NoShow';

  return (
    <div className="overflow-x-auto">
      <div className="p-4 min-w-[600px] flex">
        {/* Sticky Avatar Column - 112px x 112px */}
        <div className="flex-shrink-0 mr-6 sticky left-4 z-10">
          {selectedUser ? (
            <Link href={`/employees/${selectedUser.id}`}>
              <Avatar
                src={selectedUser.avatarUrl}
                name={selectedUser.name}
                userId={selectedUser.id}
                size="xl"
                enableSmartCaching={true}
                className="w-28 h-28 bg-gray-800 border-2 border-gray-600"
              />
            </Link>
          ) : (
            <div
              className="w-28 h-28 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 border-2 border-gray-500"
              style={{ width: '112px', height: '112px' }}
            >
              <User className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          <div className="flex items-center mb-4">
            {/* Worker Info and Controls */}
            <div className="flex items-center">
              <div className="mr-4">
                <RoleBadge roleCode={assignment.roleCode as RoleCode} />
              </div>
              <EnhancedWorkerSelector
                users={users}
                selectedUserId={assignment.userId}
                onChange={(userId) => onSelectChange(assignment.id, userId)}
                requiredRole={assignment.roleCode}
              />
            </div>
          </div>

          {/* Time Tracking Data */}
          <div className="mt-4">
            <div className="flex items-center p-4 bg-gray-900/50 rounded-md" style={{ minWidth: '500px' }}>
              <div className="w-1/4">
                <div className="text-xs text-gray-400 mb-1">Clock In</div>
                <div className="font-medium">{formatTime(lastTimeEntry?.clockIn)}</div>
              </div>
              <div className="w-1/4">
                <div className="text-xs text-gray-400 mb-1">Clock Out</div>
                <div className="font-medium">{formatTime(lastTimeEntry?.clockOut)}</div>
              </div>
              <div className="w-1/4">
                <div className="text-xs text-gray-400 mb-1">Status</div>
                {/* Only show status badge if worker hasn't ended shift or is no show */}
                {!isShiftEnded && !isNoShow && (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    status === 'Clocked In'
                      ? 'bg-green-800 text-green-100'
                      : 'bg-gray-600 text-gray-100'
                  }`}>
                    {status}
                  </span>
                )}
                {/* Show empty space when shift ended or no show to maintain layout */}
                {(isShiftEnded || isNoShow) && (
                  <div className="h-5"></div>
                )}
              </div>
              <div className="w-1/4">
                <div className="flex items-center space-x-2">
                  {isNoShow ? (
                    // Show "No Show" badge when worker is marked as no show
                    <span className="px-3 py-1 text-sm font-medium rounded-md bg-red-600 text-red-100 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No Show
                    </span>
                  ) : isShiftEnded ? (
                    // Show "Shift Ended" badge when worker's shift has been ended
                    <span className="px-3 py-1 text-sm font-medium rounded-md bg-gray-600 text-gray-100 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Shift Ended
                    </span>
                  ) : status === 'Clocked In' ? (
                    <button
                      onClick={() => onClockOut(assignment.id)}
                      disabled={processingActions.has(`clockOut-${assignment.id}`)}
                      className="px-3 py-1 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {processingActions.has(`clockOut-${assignment.id}`) && <LoadingSpinner size="xs" />}
                      Clock Out
                    </button>
                  ) : (
                    <button
                      onClick={() => onClockIn(assignment.id)}
                      disabled={!assignment.userId || processingActions.has(`clockIn-${assignment.id}`)}
                      className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {processingActions.has(`clockIn-${assignment.id}`) && <LoadingSpinner size="xs" />}
                      Start Shift
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const UnifiedTimeTrackingComponent: React.FC<UnifiedTimeTrackingProps> = ({
  shift,
  users,
  onAssignmentUpdate,
  onEditShift,
  onClockIn,
  onClockOut,
  onEndShift,
  isLoading = false,
}) => {
  const { toast } = useToast();
  const [pendingEndAssignment, setPendingEndAssignment] = useState<string | null>(null);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const processingTimeouts = useRef<Map<string, any>>(new Map());

  // Debug: Track render count to help identify hooks issues
  const renderCount = useRef(0);
  renderCount.current += 1;


  // Helper function to safely remove processing action
  const removeProcessingAction = useCallback((actionKey: string) => {
    // Clear timeout if it exists
    const timeout = processingTimeouts.current.get(actionKey);
    if (timeout) {
      clearTimeout(timeout);
      processingTimeouts.current.delete(actionKey);
    }

    // Remove from processing set
    setProcessingActions(prev => {
      const newSet = new Set(prev);
      newSet.delete(actionKey);
      return newSet;
    });
  }, []);

  // Helper function to safely add processing action with timeout
  const addProcessingAction = useCallback((actionKey: string, timeoutMs: number = 30000) => {
    setProcessingActions(prev => {
      const newSet = new Set(prev);
      newSet.add(actionKey);
      return newSet;
    });

    // Set timeout to automatically clear stuck processing states
    const timeout = setTimeout(() => {
      console.warn('Processing action timed out, clearing:', actionKey);
      // Use the ref to avoid circular dependency
      const timeoutRef = processingTimeouts.current.get(actionKey);
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        processingTimeouts.current.delete(actionKey);
      }
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }, timeoutMs);

    processingTimeouts.current.set(actionKey, timeout);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      processingTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      processingTimeouts.current.clear();
    };
  }, []);

  const sortedAssignments = useMemo(() => {
    const roleOrder: WorkerRole[] = ['CC', 'RG', 'RFO', 'FO', 'SH', 'GL'];

    const slots: (Assignment | { isPlaceholder: true; roleCode: RoleCode; id: string })[] = [];
    const personnel = [...shift.assignedPersonnel];

    const requirements: { roleCode: RoleCode, count: number }[] = [
      { roleCode: 'CC', count: (shift as any).requiredCrewChiefs },
      { roleCode: 'RG', count: (shift as any).requiredRiggers },
      { roleCode: 'RFO', count: (shift as any).requiredReachForkOperators },
      { roleCode: 'FO', count: (shift as any).requiredForkOperators },
      { roleCode: 'SH', count: (shift as any).requiredStagehands },
      { roleCode: 'GL', count: (shift as any).requiredGeneralLaborers },
    ];

    // Process requirements in the correct order to maintain role sorting
    roleOrder.forEach(roleCode => {
      const requirement = requirements.find(req => req.roleCode === roleCode);
      if (!requirement || requirement.count === 0) return;

      for (let i = 0; i < requirement.count; i++) {
        const assignedIndex = personnel.findIndex(p => p.roleCode === roleCode && !slots.some(s => s.id === p.id));

        if (assignedIndex !== -1) {
          const assignedPerson = personnel.splice(assignedIndex, 1)[0];
          slots.push(assignedPerson);
        } else {
          slots.push({
            id: `new-placeholder-${roleCode}-${i}`,
            roleCode: roleCode,
            isPlaceholder: true,
          });
        }
      }
    });

    // Add any remaining personnel that don't match requirements
    personnel.forEach(p => slots.push(p));

    // Debug logging
    console.log('Final slots order:', slots.map(s => ({
      id: s.id,
      roleCode: s.roleCode,
      isPlaceholder: 'isPlaceholder' in s,
      userName: 'user' in s ? s.user?.name : 'Placeholder'
    })));

    return slots;
  }, [shift.assignedPersonnel, shift.id, shift]); // Include shift dependency for required worker counts

  const handleSelectChange = (assignmentId: string, newUserId: string | null) => {
    onAssignmentUpdate(assignmentId, newUserId);
  };

  const validateClockAction = (assignment: Assignment, action: 'clockIn' | 'clockOut'): string | null => {
    const now = new Date();
    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.endTime);

    if (action === 'clockIn') {
      // TIME VALIDATION DISABLED - Workers can clock in at any time
      // This allows for early arrivals, late starts, emergency coverage, etc.

      // Note: Removed shift start time validation to allow flexible clock-in times
      // Note: Removed shift end time validation to allow extended work periods

      // Check for existing active entry
      const activeEntry = assignment.timeEntries?.find(entry => 
        entry.clockIn && !entry.clockOut
      );
      if (activeEntry) {
        return 'Employee is already clocked in';
      }

      // Check maximum entries (3)
      const entryCount = assignment.timeEntries?.length || 0;
      if (entryCount >= 3) {
        return 'Maximum time entries (3) reached for this shift';
      }
    }

    if (action === 'clockOut') {
      const activeEntry = assignment.timeEntries?.find(entry => 
        entry.clockIn && !entry.clockOut
      );
      
      if (!activeEntry) {
        return 'No active clock-in found to clock out';
      }

      // Check minimum work period (15 minutes)
      const clockInTime = new Date(activeEntry.clockIn);
      const minWorkPeriod = 15 * 60 * 1000; // 15 minutes in ms
      if (now.getTime() - clockInTime.getTime() < minWorkPeriod) {
        return 'Minimum work period of 15 minutes required';
      }
    }

    return null; // No validation errors
  };

  const handleRequestEndShift = (assignmentId: string) => {
    setPendingEndAssignment(assignmentId);
  };

  const confirmEndShift = async () => {
    if (pendingEndAssignment) {
      try {
        setProcessingActions(prev => new Set(prev).add('endShift'));
        await onEndShift();
        toast({
          title: "Success",
          description: "Shift ended successfully",
          type: "success"
        });
        setPendingEndAssignment(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to end shift. Please try again.",
          type: "error"
        });
      } finally {
        setProcessingActions(prev => {
          const newSet = new Set(prev);
          newSet.delete('endShift');
          return newSet;
        });
      }
    }
  };

  const handleClockIn = useCallback(async (assignmentId: string) => {
    // Prevent duplicate requests for the same assignment
    const actionKey = `clockIn-${assignmentId}`;
    if (processingActions.has(actionKey)) {
      console.log('Clock in already in progress for assignment:', assignmentId);
      return;
    }

    const assignment = sortedAssignments.find(s => s.id === assignmentId) as Assignment;
    const error = validateClockAction(assignment, 'clockIn');
    if (error) {
      toast({
        title: "Cannot Clock In",
        description: error,
        type: "error"
      });
      return;
    }

    try {
      // Add processing state with timeout safety
      addProcessingAction(actionKey);

      console.log('Starting clock in for assignment:', assignmentId);
      await onClockIn(assignmentId);

      toast({
        title: "Success",
        description: "Employee clocked in successfully",
        type: "success"
      });
    } catch (error) {
      console.error('Clock in failed for assignment:', assignmentId, error);
      toast({
        title: "Error",
        description: "Failed to clock in. Please try again.",
        type: "error"
      });
    } finally {
      // Always clean up processing state
      removeProcessingAction(actionKey);
      console.log('Cleaned up processing state for:', actionKey);
    }
  }, [sortedAssignments, onClockIn, addProcessingAction, removeProcessingAction]);

  const handleClockOut = useCallback(async (assignmentId: string) => {
    // Prevent duplicate requests for the same assignment
    const actionKey = `clockOut-${assignmentId}`;
    if (processingActions.has(actionKey)) {
      console.log('Clock out already in progress for assignment:', assignmentId);
      return;
    }

    const assignment = sortedAssignments.find(s => s.id === assignmentId) as Assignment;
    const error = validateClockAction(assignment, 'clockOut');
    if (error) {
      toast({
        title: "Cannot Clock Out",
        description: error,
        type: "error"
      });
      return;
    }

    try {
      // Add processing state with timeout safety
      addProcessingAction(actionKey);

      console.log('Starting clock out for assignment:', assignmentId);
      await onClockOut(assignmentId);

      toast({
        title: "Success",
        description: "Employee clocked out successfully",
        type: "success"
      });
    } catch (error) {
      console.error('Clock out failed for assignment:', assignmentId, error);
      toast({
        title: "Error",
        description: "Failed to clock out. Please try again.",
        type: "error"
      });
    } finally {
      // Always clean up processing state
      removeProcessingAction(actionKey);
      console.log('Cleaned up processing state for:', actionKey);
    }
  }, [sortedAssignments, onClockOut, addProcessingAction, removeProcessingAction]);

  const formatTime = (isoString?: string | Date | null) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
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
      return '--:--';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Worker Assignments & Time Tracking</h3>
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 bg-gray-700 rounded-md animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-700 rounded-md animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700 animate-pulse">
              <div className="p-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-600 mr-4"></div>
                  <div className="flex-grow">
                    <div className="h-4 bg-gray-600 rounded mb-2 w-1/3"></div>
                    <div className="h-4 bg-gray-600 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gray-900/50 rounded-md">
                  <div className="w-1/4 h-4 bg-gray-600 rounded"></div>
                  <div className="w-1/4 h-4 bg-gray-600 rounded ml-4"></div>
                  <div className="w-1/4 h-4 bg-gray-600 rounded ml-4"></div>
                  <div className="w-1/4 h-8 bg-gray-600 rounded ml-4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Worker Assignments & Time Tracking</h3>
        <div className="flex items-center gap-2">
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && processingActions.size > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
                Processing: {Array.from(processingActions).join(', ')}
              </div>
              <button
                onClick={() => {
                  console.log('Manually clearing all processing actions');
                  processingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
                  processingTimeouts.current.clear();
                  setProcessingActions(new Set());
                }}
                className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded hover:bg-red-900/40"
                title="Clear stuck processing states"
              >
                Clear
              </button>
            </div>
          )}
          <button
            onClick={onEditShift}
            disabled={processingActions.size > 0}
            className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-md shadow-sm transition-colors"
          >
            <PencilIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Shift</span>
          </button>
          {/* Hide End Shift button if shift is completed */}
          {shift.status !== 'Completed' && (
            <button
              onClick={() => handleRequestEndShift(shift.id)}
              disabled={processingActions.size > 0}
              className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-md shadow-sm transition-colors"
            >
              {processingActions.has('endShift') && <LoadingSpinner size="xs" className="mr-1" />}
              <span className="hidden sm:inline">End Shift</span>
            </button>
          )}
          {/* Show Shift Completed badge when shift is completed */}
          {shift.status === 'Completed' && (
            <div className="flex items-center gap-2 text-sm bg-gray-600 text-gray-100 font-semibold py-2 px-3 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Shift Completed</span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-6">
        {sortedAssignments.map((slot, index) => {
          // Stable key generation to prevent hooks errors
          const stableKey = 'isPlaceholder' in slot ? `placeholder-${slot.id}` : `assignment-${slot.id}`;
          const isPlaceholder = 'isPlaceholder' in slot;

          return (
            <div key={stableKey} className="bg-gray-800 rounded-lg shadow-md border border-gray-700 relative overflow-hidden">
              {isPlaceholder ? (
                <PlaceholderSlot
                  slot={slot}
                  users={users}
                  onSelectChange={handleSelectChange}
                />
              ) : (
                <AssignmentSlot
                  assignment={slot as Assignment}
                  users={users}
                  onSelectChange={handleSelectChange}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                  processingActions={processingActions}
                  formatTime={formatTime}
                />
              )}
            </div>
          );
        })}
      </div>

      {pendingEndAssignment && (
        <Modal
          isOpen={!!pendingEndAssignment}
          onClose={() => setPendingEndAssignment(null)}
          title="Confirm End Shift"
        >
          <p>Are you sure you want to end this shift? This will clock out all active workers and finalize the shift. This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <button 
              onClick={() => setPendingEndAssignment(null)} 
              disabled={processingActions.has('endShift')}
              className="px-4 py-2 rounded bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              onClick={confirmEndShift} 
              disabled={processingActions.has('endShift')}
              className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processingActions.has('endShift') && <LoadingSpinner size="xs" />}
              Confirm
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders that could cause hooks errors
export const UnifiedTimeTracking = React.memo(UnifiedTimeTrackingComponent);