"use client";

import { UnifiedStatusBadge } from "@/components/ui/unified-status-badge";

interface WorkerStatusBadgeProps {
  status: string | undefined;
}

export function WorkerStatusBadge({ status }: WorkerStatusBadgeProps) {
  if (!status) return null;
  
  const s = status.toLowerCase();
  
  // Map status strings to our unified status keys
  let unifiedStatus = 'Assigned'; // default
  
  if (s.includes('clocked in')) {
    unifiedStatus = 'ClockedIn';
  } else if (s.includes('not clocked in') || s.includes('assigned')) {
    unifiedStatus = 'Assigned';
  } else if (s.includes('ended')) {
    unifiedStatus = 'ShiftEnded';
  } else if (s.includes('break')) {
    unifiedStatus = 'OnBreak';
  } else if (s.includes('no show')) {
    unifiedStatus = 'NoShow';
  }
  
  return <UnifiedStatusBadge status={unifiedStatus} size="sm" />;
}