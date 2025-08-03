"use client";

import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { Assignment } from "@/lib/types";
import { useShiftPageData } from "../../hooks/useShiftPageData";
import { WorkerStatusBadge } from "./WorkerStatusBadge";
import { format } from "date-fns";
import { ROLE_DEFINITIONS } from "@/lib/constants";

interface AssignedWorkerCardProps {
  assignment: Assignment;
}

export function AssignedWorkerCard({ assignment }: AssignedWorkerCardProps) {
  const { unassignWorker, clockIn, clockOut } = useShiftPageData(assignment.shiftId);
  const roleDef = ROLE_DEFINITIONS[assignment.roleCode] || ROLE_DEFINITIONS['GL'];

  const lastTimeEntry = assignment.timeEntries?.[assignment.timeEntries.length - 1];
  const status = lastTimeEntry && lastTimeEntry.clockIn && !lastTimeEntry.clockOut ? 'Clocked In' : 'Not Clocked In';

  const handleUnassign = () => {
    unassignWorker.mutate(assignment.id);
  };

  const handleClockAction = () => {
    if (status.toLowerCase().includes('clocked in')) {
      clockOut.mutate(assignment.id);
    } else {
      clockIn.mutate(assignment.id);
    }
  };

  return (
    <div className={`rounded-lg border-2 shadow-sm transition-all ${roleDef.borderColor} bg-white dark:bg-gray-900`}>
      <div className="flex flex-col h-full p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={assignment.user?.avatarUrl}
              name={assignment.user?.name || 'User'}
              userId={assignment.user?.id || ''}
              size="lg"
              enableSmartCaching={true}
              className={`h-12 w-12 border-2 ${roleDef.borderColor}`}
            />
            <div>
              <div className="font-bold text-gray-900 dark:text-white">{assignment.user?.name}</div>
              <div className={`text-sm font-medium ${roleDef.textColor}`}>{roleDef.name}</div>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50">
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unassign Worker</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to unassign {assignment.user?.name} from this shift?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnassign} className="bg-red-600 hover:bg-red-700">Unassign</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex-grow mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
            <WorkerStatusBadge status={status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Clocked In At</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {assignment.timeEntries.find(t => t.clockOut === null)
                ? format(new Date(assignment.timeEntries.find(t => t.clockOut === null)!.clockIn), 'p')
                : 'N/A'}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant={status.toLowerCase().includes('clocked in') ? 'outline' : 'default'}
            onClick={handleClockAction}
            disabled={unassignWorker.isPending || clockIn.isPending || clockOut.isPending}
            className="w-full"
          >
            {status.toLowerCase().includes('clocked in') ? 'Clock Out' : 'Clock In'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={unassignWorker.isPending || clockIn.isPending || clockOut.isPending}>End Shift</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Shift</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to end the shift for {assignment.user?.name}? This will clock them out and finalize their timesheet for this shift.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { /* End shift logic here */ }} className="bg-red-600 hover:bg-red-700">End Shift</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}