import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { JobStatus, ShiftStatus, TimesheetStatus } from '@prisma/client';
import { subscribeToTimesheetUpdates } from '@/lib/realtime';

interface StatusBadgeProps {
  status: JobStatus | ShiftStatus | TimesheetStatus;
  timesheetId?: string; // For realtime updates
}

const statusColors: Record<JobStatus | ShiftStatus | TimesheetStatus, string> = {
  // Job Statuses
  Pending: 'bg-yellow-600 text-white',
  Active: 'bg-blue-600 text-white',
  OnHold: 'bg-purple-600 text-white',
  Completed: 'bg-green-600 text-white',
  Cancelled: 'bg-red-600 text-white',

  // Shift Statuses
  InProgress: 'bg-cyan-600 text-white',

  // Timesheet Statuses
  draft: 'bg-gray-600 text-white',
  pending_company_approval: 'bg-yellow-600 text-white',
  pending_manager_approval: 'bg-yellow-600 text-white',
  completed: 'bg-green-600 text-white',
  rejected: 'bg-red-600 text-white',
};

export function StatusBadge({ status: initialStatus, timesheetId }: StatusBadgeProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (!timesheetId) return;
    
    const unsubscribe = subscribeToTimesheetUpdates(timesheetId, (data) => {
      if (data.status) {
        setStatus(data.status);
      }
    });

    return () => unsubscribe();
  }, [timesheetId]);

  return (
    <Badge className={statusColors[status] || 'bg-gray-500 text-white'}>
      {status}
    </Badge>
  );
}
