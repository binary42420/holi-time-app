'use client';

import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-states";
import ShiftPageProvider from "@/features/shift-management/ShiftPageProvider";
import { useShiftPageData } from "@/features/shift-management/hooks/useShiftPageData";
import { ShiftWithDetails, type RoleCode } from "@/lib/types";
import { ShiftDetailsLayout } from "@/features/shift-management/components/ShiftDetailsLayout";

function ShiftDetailsContent() {
  const params = useParams();
  const shiftId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

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

  const handleAssignmentUpdate = (assignmentId: string, userId: string | null, roleCode?: string) => {
    console.log('handleAssignmentUpdate called:', { assignmentId, userId, roleCode });

    if (userId && roleCode) {
      console.log('Assigning worker:', { userId, roleCode });
      assignWorker.mutate({ userId, roleCode });
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

  return (
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
  );
}

export default function ShiftDetailsPage() {
  return (
    <ShiftPageProvider>
      <ShiftDetailsContent />
    </ShiftPageProvider>
  );
}
