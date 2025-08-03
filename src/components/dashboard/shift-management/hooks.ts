import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/lib/error-handler";
import { ClockAction, ShiftWithDetails } from './types';

export const useShiftManager = (shift: ShiftWithDetails, onUpdate: () => void, isOnline: boolean) => {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const isProcessing = Object.values(loadingStates).some(Boolean) || processingAction !== null;

  const handleApiCall = async (
    endpoint: string,
    method: 'POST' | 'GET' = 'POST',
    body: any = null,
    actionName: string,
    loadingKey: string,
    successMessage: string
  ) => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: `Cannot ${actionName} while offline.`,
        variant: "destructive",
      });
      return null;
    }

    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setProcessingAction(`${actionName}...`);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${actionName}`);
      }

      toast({
        title: "Success",
        description: successMessage,
      });

      onUpdate();
      return await response.json();
    } catch (error) {
      handleError(error as Error, {
        component: 'useShiftManager',
        action: actionName,
        shiftId: shift.id,
      });
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
      setProcessingAction(null);
    }
  };

  const handleClockAction = async (assignmentId: string, action: ClockAction) => {
    const worker = shift.assignedPersonnel.find(w => w.id === assignmentId);
    if (!worker) return;

    await handleApiCall(
      `/api/shifts/${shift.id}/assigned/${assignmentId}/clock`,
      'POST',
      { action },
      action === 'clock_in' ? 'Clocking In' : 'Clocking Out',
      `${assignmentId}-${action}`,
      `${worker.user.name} has been ${action === 'clock_in' ? 'clocked in' : 'clocked out'}.`
    );
  };

  const handleEndShift = async (assignmentId: string) => {
    const worker = shift.assignedPersonnel.find(w => w.id === assignmentId);
    if (!worker) return;

    await handleApiCall(
      `/api/shifts/${shift.id}/assigned/${assignmentId}/end-shift`,
      'POST',
      null,
      'Ending Shift',
      `${assignmentId}-end`,
      `${worker.user.name}'s shift has been ended.`
    );
  };

  const handleEndAllShifts = async () => {
    const activeWorkers = shift.assignedPersonnel.filter(w => w.status !== 'ShiftEnded');
    if (activeWorkers.length === 0) {
      toast({ title: "No active workers", description: "All shifts have already been ended." });
      return;
    }

    await handleApiCall(
      `/api/shifts/${shift.id}/end-all-shifts`,
      'POST',
      null,
      'Ending All Shifts',
      'end-all',
      `Ended shifts for ${activeWorkers.length} workers.`
    );
  };

  const handleFinalizeTimesheet = async () => {
    const incompleteWorkers = shift.assignedPersonnel.filter(w => w.status !== 'ShiftEnded');
    if (incompleteWorkers.length > 0) {
      toast({
        title: "Cannot Finalize",
        description: `${incompleteWorkers.length} workers haven't completed their shifts.`,
        variant: "destructive",
      });
      return;
    }

    const result = await handleApiCall(
      `/api/shifts/${shift.id}/finalize-timesheet-simple`,
      'POST',
      null,
      'Finalizing Timesheet',
      'finalize',
      "Timesheet finalized and ready for approval."
    );

    if (result?.timesheetId) {
      window.open(`/timesheets/${result.timesheetId}/approve`, '_blank');
    }
  };

  return {
    loadingStates,
    processingAction,
    isProcessing,
    handleClockAction,
    handleEndShift,
    handleEndAllShifts,
    handleFinalizeTimesheet,
  };
};
