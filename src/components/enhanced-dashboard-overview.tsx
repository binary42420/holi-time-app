import React from 'react';
import { EnhancedColorfulDashboard } from '@/components/enhanced-colorful-dashboard';
import { cn } from '@/lib/utils';

interface DashboardMetrics {
  jobs: {
    total: number;
    active: number;
    pending: number;
    completed: number;
    onHold: number;
    cancelled: number;
  };
  shifts: {
    total: number;
    today: number;
    tomorrow: number;
    thisWeek: number;
    active: number;
    pending: number;
    completed: number;
    understaffed: number;
    upcoming?: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      job: { name: string };
    }>;
  };
  personnel: {
    totalRequired: number;
    totalAssigned: number;
    currentlyWorking: number;
    onBreak: number;
    completed: number;
    noShows: number;
  };
  timesheets: {
    draft: number;
    pendingCompany: number;
    pendingManager: number;
    completed: number;
    rejected: number;
  };
  companies: {
    total: number;
    active: number;
  };
}

interface EnhancedDashboardOverviewProps {
  metrics: DashboardMetrics;
  className?: string;
}

export function EnhancedDashboardOverview({ metrics, className }: EnhancedDashboardOverviewProps) {
  return <EnhancedColorfulDashboard metrics={metrics} className={className} />;
}