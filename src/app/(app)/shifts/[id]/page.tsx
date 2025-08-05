'use client';

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-states";
import ShiftPageProvider from "@/features/shift-management/ShiftPageProvider";
import { useShiftPageData } from "@/features/shift-management/hooks/useShiftPageData";
import { ShiftWithDetails, type RoleCode } from "@/lib/types";
import { ShiftDetailsLayout } from "@/features/shift-management/components/ShiftDetailsLayout";
import { SchedulingConflictDialog } from "@/components/SchedulingConflictDialog";
import { apiService } from "@/lib/services/api";
import { useToast } from "@/hooks/use-toast";

function ShiftDetailsContent() {
  const params = useParams();
  const shiftId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { toast } = useToast();
  
  // Conflict dialog state
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    conflicts: any[];
    currentShift: any;
    workerName: string;
    userId: string;
    roleCode: string;
  }>({
    open: false,
    conflicts: [],
    currentShift: {},
    workerName: '',
    userId: '',
    roleCode: ''
  });

  const {
    shift,
    assignments,
    users,
    isShiftLoading,
    assignWorker,
    unassignWorker,
    clockIn,
    clockOut,
    endShift,
    refetch,
  } = useShiftPageData(shiftId);

  if (isShiftLoading) {
    return <LoadingSpinner />;
  }

  if (!shift) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Shift Not Found</h2>
          <p className="text-gray-400">
            The shift you are looking for does not exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  if (!assignments || !users) {
    return <div>Data incomplete.</div>;
  }

  const sortedAssignments = [...assignments].sort((a, b) => {
    if (a.user && b.user) {
      const aFirstName = a.user.name.split(' ')[0];
      const bFirstName = b.user.name.split(' ')[0];
      return aFirstName.localeCompare(bFirstName);
    }
    return 0;
  });

  const typedShift = shift as ShiftWithDetails;

  const handleEditShift = () => {
    router.push(`/shifts/${shiftId}/edit`);
  };

  const handleAssignmentUpdate = async (assignmentId: string, userId: string | null, roleCode?: string) => {
    console.log('handleAssignmentUpdate called:', { assignmentId, userId, roleCode });

    if (userId && roleCode) {
      console.log('Assigning worker:', { userId, roleCode });
      
      // Check for scheduling conflicts first
      try {
        const conflictCheck = await apiService.checkSchedulingConflicts(shiftId, userId);
        
        if (conflictCheck.hasConflicts && conflictCheck.conflicts.length > 0) {
          // Show conflict dialog
          const worker = users.find(u => u.id === userId);
          setConflictDialog({
            open: true,
            conflicts: conflictCheck.conflicts,
            currentShift: {
              date: shift?.date,
              startTime: shift?.startTime,
              endTime: shift?.endTime,
              jobName: shift?.job?.name,
              companyName: shift?.job?.company?.name,
            },
            workerName: worker?.name || 'Unknown Worker',
            userId,
            roleCode
          });
          return; // Don't proceed with assignment
        }
        
        // No conflicts, proceed with assignment
        assignWorker.mutate({ userId, roleCode });
      } catch (error: any) {
        // If conflict check fails, show error but allow assignment to proceed
        console.error('Error checking conflicts:', error);
        toast({
          title: "Warning",
          description: "Could not check for scheduling conflicts. Proceeding with assignment.",
          variant: "destructive",
        });
        assignWorker.mutate({ userId, roleCode });
      }
    } else if (assignmentId && !assignmentId.startsWith('placeholder-')) {
      console.log('Unassigning worker:', assignmentId);
      unassignWorker.mutate(assignmentId);
    } else if (assignmentId.startsWith('placeholder-')) {
      console.log('Cannot unassign placeholder assignment:', assignmentId);
      // For placeholder assignments, we can't unassign since they don't exist in DB
      // This is expected behavior
    } else {
      console.log('No action taken - insufficient parameters');
    }
  };

  const handleConflictConfirm = () => {
    // Proceed with assignment despite conflicts
    assignWorker.mutate({ 
      userId: conflictDialog.userId, 
      roleCode: conflictDialog.roleCode,
      ignoreConflicts: true 
    });
    setConflictDialog(prev => ({ ...prev, open: false }));
  };

  const handleConflictCancel = () => {
    setConflictDialog(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <SchedulingConflictDialog
        open={conflictDialog.open}
        onOpenChange={(open) => setConflictDialog(prev => ({ ...prev, open }))}
        conflicts={conflictDialog.conflicts}
        currentShift={conflictDialog.currentShift}
        workerName={conflictDialog.workerName}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
        isLoading={assignWorker.isPending}
      />
    <ShiftDetailsLayout
      shift={typedShift}
      assignments={sortedAssignments}
      users={users}
      onAssignmentUpdate={handleAssignmentUpdate}
      onEditShift={handleEditShift}
      onClockIn={(assignmentId) => clockIn.mutate(assignmentId)}
      onClockOut={(assignmentId) => clockOut.mutate(assignmentId)}
      onEndShift={() => endShift.mutate()}
      onRefresh={refetch}
    />
    </>
  );
}

export default function ShiftDetailsPage() {
  return (
    <ShiftPageProvider>
      <ShiftDetailsContent />
    </ShiftPageProvider>
  );
}
