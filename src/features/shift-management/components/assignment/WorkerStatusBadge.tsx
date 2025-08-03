"use client";

import { Badge } from "@mantine/core";

interface WorkerStatusBadgeProps {
  status: string | undefined;
}

export function WorkerStatusBadge({ status }: WorkerStatusBadgeProps) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('clocked in')) {
    return <Badge color="green">Clocked In</Badge>;
  }
  if (s.includes('not clocked in') || s.includes('assigned')) {
    return <Badge color="gray">Not Clocked In</Badge>;
  }
  if (s.includes('ended')) {
    return <Badge color="red">Shift Ended</Badge>;
  }
  return <Badge color="blue">{status}</Badge>;
}