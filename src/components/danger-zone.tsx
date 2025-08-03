'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { CascadeDeleteDialog } from './cascade-delete-dialog';
import { UserRole } from '@prisma/client';
import ShiftActions from './dashboard/shift-management/shift-actions';
import { Shift } from '@/lib/types';
import { ShiftWithDetails } from './dashboard/shift-management/types';

interface DangerZoneProps {
  entityType: 'company' | 'job' | 'shift';
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
  redirectTo?: string;
  onEndShift?: () => void;
  onFinalizeTimesheet?: () => void;
  shift?: Shift | ShiftWithDetails;
  className?: string;
}

export function DangerZone({
  entityType,
  entityId,
  entityName,
  onSuccess,
  redirectTo,
  onEndShift,
  onFinalizeTimesheet,
  shift,
  className
}: DangerZoneProps) {
  const { data: session } = useSession();

  if (session?.user?.role !== UserRole.Admin) {
    return null;
  }

  // Helper function to check if shift has the ShiftWithDetails structure
  const isShiftWithDetails = (shift: Shift | ShiftWithDetails): shift is ShiftWithDetails => {
    return shift && 'timesheet' in shift;
  };

  // Convert Shift to ShiftWithDetails format if needed
  const getShiftForActions = (shift: Shift | ShiftWithDetails): ShiftWithDetails | undefined => {
    if (!shift) return undefined;
    
    if (isShiftWithDetails(shift)) {
      return shift;
    }
    
    // Convert Shift to ShiftWithDetails format
    const basicShift = shift as Shift;
    return {
      ...basicShift,
      timesheet: basicShift.timesheets && basicShift.timesheets.length > 0 ? basicShift.timesheets[0] : null
    } as ShiftWithDetails;
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'company':
        return 'Company';
      case 'job':
        return 'Job';
      case 'shift':
        return 'Shift';
      default:
        return 'Entity';
    }
  };

  const getDescription = () => {
    switch (entityType) {
      case 'company':
        return 'Permanently delete this company and all associated jobs, shifts, and data. This action affects the most data and cannot be undone.';
      case 'job':
        return 'Permanently delete this job and all associated shifts and data. This action cannot be undone.';
      case 'shift':
        return 'Permanently delete this shift and all associated data. This action cannot be undone.';
      default:
        return 'Permanently delete this entity and all associated data.';
    }
  };

  return (
    <Card className={`border-red-400 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-600" />
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </div>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Delete {getEntityTypeLabel()}</p>
            <p className="text-sm text-muted-foreground">
              Once you delete this {getEntityTypeLabel().toLowerCase()}, there is no going back.
            </p>
          </div>
          <CascadeDeleteDialog
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
            onSuccess={onSuccess}
            redirectTo={redirectTo}
          />
        </div>
        {entityType === 'shift' && shift && (
          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="font-medium">End Shift</p>
              <p className="text-sm text-muted-foreground">
                This will finalize the shift and clock out any workers who are still clocked in.
              </p>
            </div>
            {(() => {
              const shiftForActions = getShiftForActions(shift);
              return shiftForActions ? (
                <ShiftActions
                  shift={shiftForActions}
                  onEndAllShifts={onEndShift}
                  onFinalizeTimesheet={onFinalizeTimesheet}
                  loading={false}
                  isOnline={true}
                />
              ) : null;
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
