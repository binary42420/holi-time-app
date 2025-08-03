"use client";

import { Badge } from "@/components/ui/badge";
import { AssignedWorkerCard } from "./AssignedWorkerCard";
import { EmptyAssignmentSlot } from "./EmptyAssignmentSlot";
import { ROLE_DEFINITIONS } from "@/lib/constants";
import { Assignment, RoleCode, User } from "@/lib/types";

interface AssignmentGroupProps {
  roleCode: RoleCode;
  assignments: Assignment[];
  availableEmployees: User[];
  requiredCount: number;
  shiftId: string;
}

export function AssignmentGroup({ roleCode, assignments, availableEmployees, requiredCount, shiftId }: AssignmentGroupProps) {
  const roleDef = ROLE_DEFINITIONS[roleCode];
  const assignedCount = assignments.length;

  const slots = [
    ...assignments.map(a => ({ type: 'assigned', assignment: a })),
    ...Array(Math.max(0, requiredCount - assignedCount)).fill(null).map((_, index) => ({ 
      type: 'empty', 
      id: `empty-${roleCode}-${index}` 
    }))
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`${roleDef.textColor} ${roleDef.cardBgColor}`}>
          {roleCode}
        </Badge>
        <span className="font-medium text-gray-800 dark:text-gray-200">{roleDef.name}</span>
        <span className="text-sm text-muted-foreground">
          ({assignedCount}/{requiredCount} assigned)
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {slots.map((slot, index) => (
          slot.type === 'assigned' ? (
            <AssignedWorkerCard key={slot.assignment.id} assignment={slot.assignment} />
          ) : (
            <EmptyAssignmentSlot
              key={slot.id}
              roleCode={roleCode}
              availableEmployees={availableEmployees.filter(emp => !assignments.some(a => a.user?.id === emp.id))}
              shiftId={shiftId}
              assignmentId={slot.id}
            />
          )
        ))}
      </div>
    </div>
  );
}