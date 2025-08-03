"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShiftPageData } from "../../hooks/useShiftPageData";
import { RoleCode, User } from "@/lib/types";

interface EmptyAssignmentSlotProps {
  roleCode: RoleCode;
  availableEmployees: User[];
  shiftId: string;
  assignmentId: string;
}

export function EmptyAssignmentSlot({ roleCode, availableEmployees, shiftId, assignmentId }: EmptyAssignmentSlotProps) {
  const { assignWorker } = useShiftPageData(shiftId);

  const handleAssign = (employeeId: string) => {
    assignWorker.mutate({ userId: employeeId, roleCode });
  };

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Select onValueChange={handleAssign}>
        <SelectTrigger className="w-full h-full text-lg">
          <SelectValue placeholder="Assign..." />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 text-white border-gray-700 z-50">
          {availableEmployees.map(employee => (
            <SelectItem key={employee.id} value={employee.id} className="hover:bg-gray-700 focus:bg-gray-700">
              <div className="flex items-center justify-between w-full">
                <span>{employee.name}</span>
              </div>
            </SelectItem>
          ))}
          {availableEmployees.length === 0 && (
            <SelectItem value="no-workers" disabled className="text-gray-400">
              No eligible workers available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}