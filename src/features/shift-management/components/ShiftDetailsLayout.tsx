'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import { ShiftHeader } from './ShiftHeader';
import { ShiftInfoCard } from './ShiftInfoCard';
import { StaffingOverviewCard } from './StaffingOverviewCard';
import { UnifiedTimeTracking } from './assignment/UnifiedTimeTracking';
import { AssignmentManager } from './assignment/AssignmentManager';
import EnhancedTimeTracking from '@/components/enhanced-time-tracking';
import UnifiedEnhancedTimeTracking from '@/components/unified-enhanced-time-tracking';
import { ShiftNotes } from './ShiftNotes';
import { ShiftPermissionsManager } from './ShiftPermissionsManager';
import { ShiftDangerZone } from './ShiftDangerZone';
import { ShiftWithDetails } from '@/lib/types';
import { FileText } from "lucide-react";

interface ShiftDetailsLayoutProps {
  shift: ShiftWithDetails;
  assignments: any[];
  users: any[];
  onAssignmentUpdate: (assignmentId: string, userId: string | null) => void;
  onEditShift: () => void;
  onClockIn: (assignmentId: string) => void;
  onClockOut: (assignmentId: string) => void;
  onEndShift: () => void;
  onRefresh?: () => void;
}

export function ShiftDetailsLayout({
  shift,
  assignments,
  users,
  onAssignmentUpdate,
  onEditShift,
  onClockIn,
  onClockOut,
  onEndShift,
  onRefresh,
}: ShiftDetailsLayoutProps) {
  // Check if shift has a timesheet
  const hasTimesheet = shift.timesheets && shift.timesheets.length > 0;
  const timesheet = hasTimesheet ? shift.timesheets[0] : null;

  return (
    <div className="space-y-6">
      <ShiftHeader shift={shift} />
      
      {/* Timesheet Link Section */}
      {hasTimesheet && timesheet && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-green-400" />
              <div>
                <h3 className="text-sm font-medium text-green-400">Timesheet Available</h3>
                <p className="text-xs text-green-300/80">
                  Status: {timesheet.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            </div>
            <Link
              href={`/timesheets?id=${timesheet.id}`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              View Timesheet
            </Link>
          </div>
        </div>
      )}
      
      <Tabs.Root defaultValue="overview">
        <Tabs.List className="flex border-b">
          <Tabs.Trigger value="overview" className="px-4 py-2 -mb-px border-b-2 border-transparent data-[state=active]:border-blue-500">Overview</Tabs.Trigger>
          <Tabs.Trigger value="time-tracking" className="px-4 py-2 -mb-px border-b-2 border-transparent data-[state=active]:border-blue-500">Time Tracking</Tabs.Trigger>
          <Tabs.Trigger value="details" className="px-4 py-2 -mb-px border-b-2 border-transparent data-[state=active]:border-blue-500">Details</Tabs.Trigger>
          <Tabs.Trigger value="settings" className="px-4 py-2 -mb-px border-b-2 border-transparent data-[state=active]:border-blue-500">Settings</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview" className="py-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <ShiftInfoCard shift={shift} />
            </div>
            <div className="lg:col-span-2">
              <StaffingOverviewCard shift={shift} assignments={assignments} />
            </div>
          </div>
        </Tabs.Content>
        <Tabs.Content value="time-tracking" className="py-6">
          <UnifiedEnhancedTimeTracking
            shiftId={shift.id}
            assignments={assignments}
            availableUsers={users}
            onAssignmentUpdate={onAssignmentUpdate}
            onRefresh={() => {
              // Trigger a refresh of the shift data without page reload
              onRefresh?.();
            }}
            shiftStatus={shift.status}
            timesheets={shift.timesheets}
          />
        </Tabs.Content>
        <Tabs.Content value="details" className="py-6">
          <ShiftNotes shiftId={shift.id} initialNotes={shift.notes || ""} />
        </Tabs.Content>
        <Tabs.Content value="settings" className="py-6">
          <ShiftPermissionsManager shift={shift} />
          <ShiftDangerZone shift={shift} onEndShift={onEndShift} onFinalizeTimesheet={() => {}} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}