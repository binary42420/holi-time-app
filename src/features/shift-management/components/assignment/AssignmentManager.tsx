"use client";

import { useShift, useUsers } from "@/hooks/use-api";
import { AssignmentGroup } from "./AssignmentGroup";
import { ROLE_DEFINITIONS } from "@/lib/constants";
import { Assignment, RoleCode } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-states";
import { useMemo } from "react";

interface AssignmentManagerProps {
  shiftId: string;
  assignments: Assignment[];
}

export function AssignmentManager({ shiftId, assignments }: AssignmentManagerProps) {
  const { data: shift, isLoading: isShiftLoading } = useShift(shiftId);
  const { data: usersResponse, isLoading: areUsersLoading } = useUsers({ fetchAll: true });

  const availableEmployees = useMemo(() => usersResponse?.users ?? [], [usersResponse]);

  if (isShiftLoading || areUsersLoading) {
    return <LoadingSpinner />;
  }

  if (!shift || !usersResponse) {
    return <div>Error loading assignment data.</div>;
  }

  const workerRequirements = shift.workerRequirements || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">Assignment Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(Object.keys(ROLE_DEFINITIONS) as RoleCode[]).map((roleCode) => {
          const requirement = workerRequirements.find(r => r.roleCode === roleCode);
          if (!requirement || requirement.requiredCount === 0) return null;

          const filteredAssignments = assignments.filter(a => a.roleCode === roleCode);
          const assignedEmployeeIds = new Set(filteredAssignments.map(a => a.user?.id).filter(id => id));
          const unassignedEmployees = availableEmployees.filter(emp => !assignedEmployeeIds.has(emp.id));

          return (
            <AssignmentGroup
              key={roleCode}
              roleCode={roleCode}
              assignments={filteredAssignments}
              availableEmployees={unassignedEmployees}
              requiredCount={requirement.requiredCount}
              shiftId={shiftId}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}