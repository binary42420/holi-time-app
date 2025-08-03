import { useShift, useUsers, useApiMutation } from '@/hooks/use-api';
import { apiService } from '@/lib/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { RoleCode } from '@/lib/types';
import { useMemo } from 'react';

// Helper function to generate placeholder assignments based on worker requirements
function generateAssignmentsWithPlaceholders(shift: any) {
  if (!shift) return [];

  const existingAssignments = shift.assignedPersonnel || [];
  const assignments = [...existingAssignments];

  // Define role requirements mapping
  const roleRequirements = [
    { roleCode: 'CC' as RoleCode, required: Math.max(shift.requiredCrewChiefs || 1, 1) },
    { roleCode: 'SH' as RoleCode, required: shift.requiredStagehands || 0 },
    { roleCode: 'FO' as RoleCode, required: shift.requiredForkOperators || 0 },
    { roleCode: 'RFO' as RoleCode, required: shift.requiredReachForkOperators || 0 },
    { roleCode: 'RG' as RoleCode, required: shift.requiredRiggers || 0 },
    { roleCode: 'GL' as RoleCode, required: shift.requiredGeneralLaborers || 0 },
  ];

  // For each role, ensure we have enough assignments (including placeholders)
  roleRequirements.forEach(({ roleCode, required }) => {
    const existingForRole = assignments.filter(a => a.roleCode === roleCode);
    const needed = required - existingForRole.length;

    // Create placeholder assignments for unfilled positions
    for (let i = 0; i < needed; i++) {
      assignments.push({
        id: `placeholder-${roleCode}-${i + existingForRole.length}`,
        shiftId: shift.id,
        userId: null,
        user: null,
        roleCode,
        status: 'Assigned',
        timeEntries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPlaceholder: true,
      });
    }
  });

  return assignments;
}

export const useShiftPageData = (shiftId: string) => {
  const queryClient = useQueryClient();

  const {
    data: shift,
    isLoading: isShiftLoading,
    error: shiftError,
    isFetching: isShiftFetching,
  } = useShift(shiftId);

  const { data: usersResponse } = useUsers({ fetchAll: true });
  const users = useMemo(() => usersResponse?.users ?? [], [usersResponse]);

  const assignments = useMemo(() => {
    return generateAssignmentsWithPlaceholders(shift);
  }, [shift]);

  const invalidateShiftQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['crewChiefPermissions', shiftId] });
  };

  const updateNotes = useApiMutation<void, string>(
    (notes) => apiService.updateShiftNotes(shiftId, notes),
    { onSuccess: invalidateShiftQueries, invalidateQueries: [['shift', shiftId]] }
  );

  const assignWorker = useApiMutation<void, { userId: string, roleCode: string }>(
    ({ userId, roleCode }) => {
      console.log('assignWorker mutation called:', { userId, roleCode });
      return apiService.assignWorker(shiftId, userId, roleCode);
    },
    {
      onSuccess: (data, variables) => {
        console.log('assignWorker mutation success:', { data, variables });
        invalidateShiftQueries();
      },
      onMutate: async ({ userId, roleCode }) => {
        console.log('assignWorker mutation onMutate:', { userId, roleCode });
        await queryClient.cancelQueries({ queryKey: ['shift', shiftId] });
        const previousShift = queryClient.getQueryData(['shift', shiftId]);
        queryClient.setQueryData(['shift', shiftId], (old: any) => {
          if (!old) return old;
          const userToAssign = users.find(u => u.id === userId);
          const newAssignment = {
            id: `temp-${Date.now()}`,
            shiftId,
            userId,
            roleCode,
            status: 'Assigned',
            user: userToAssign,
            timeEntries: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          return {
            ...old,
            assignedPersonnel: [...old.assignedPersonnel, newAssignment],
          };
        });
        return { previousShift };
      },
      onError: (err, variables, context) => {
        const typedContext = context as { previousShift?: any };
        if (typedContext?.previousShift) {
          queryClient.setQueryData(['shift', shiftId], typedContext.previousShift);
        }
      },
      onSettled: () => {
        invalidateShiftQueries();
      },
    }
  );

  const unassignWorker = useApiMutation<void, string>(
    (assignmentId) => apiService.unassignWorker(shiftId, assignmentId),
    { onSuccess: invalidateShiftQueries, invalidateQueries: [['shift', shiftId]] }
  );

  const clockIn = useApiMutation<void, string>(
    (assignmentId) => apiService.clockIn(shiftId, assignmentId),
    { onSuccess: invalidateShiftQueries, invalidateQueries: [['shift', shiftId]] }
  );

  const clockOut = useApiMutation<void, string>(
    (assignmentId) => apiService.clockOut(shiftId, assignmentId),
    { onSuccess: invalidateShiftQueries, invalidateQueries: [['shift', shiftId]] }
  );

  const endShift = useApiMutation<void, void>(
    () => apiService.endShift(shiftId),
    { onSuccess: invalidateShiftQueries, invalidateQueries: [['shift', shiftId]] }
  );

  return {
    shift,
    isShiftLoading,
    shiftError,
    assignments,
    users,
    updateNotes,
    assignWorker,
    unassignWorker,
    clockIn,
    clockOut,
    endShift,
    refetch: invalidateShiftQueries,
  };
};