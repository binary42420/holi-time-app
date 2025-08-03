"use client";

import React, { useEffect } from 'react';
import { ErrorBoundary } from "@/components/error-boundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { format } from 'date-fns';

import { IShiftManagerProps } from './types';
import { useShiftManager } from './hooks';
import ShiftStats from './shift-stats';
import WorkerCard from './worker-card';
import ShiftActions from './shift-actions';

const ShiftManager: React.FC<IShiftManagerProps> = ({ shift, onUpdate, isOnline = true }) => {
  const {
    loadingStates,
    processingAction,
    isProcessing,
    handleClockAction,
    handleEndShift,
    handleEndAllShifts,
    handleFinalizeTimesheet,
  } = useShiftManager(shift, onUpdate, isOnline);

  const [lastUpdateTime, setLastUpdateTime] = React.useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isProcessing && isOnline) {
        onUpdate();
        setLastUpdateTime(new Date());
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isProcessing, isOnline, onUpdate]);

  return (
    <ErrorBoundary context={{ component: 'ShiftManager', shiftId: shift.id }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isProcessing ? processingAction : `Last updated: ${format(lastUpdateTime, 'HH:mm:ss')}`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onUpdate();
              setLastUpdateTime(new Date());
            }}
            disabled={isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <ShiftStats assignedPersonnel={shift.assignedPersonnel} />

        <Card>
          <CardHeader>
            <CardTitle>Assigned Personnel</CardTitle>
            <CardDescription>
              {shift.assignedPersonnel.length} workers assigned to this shift
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shift.assignedPersonnel.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  onClockAction={handleClockAction}
                  onEndShift={handleEndShift}
                  loading={
                    loadingStates[`${worker.id}-clock_in`] ||
                    loadingStates[`${worker.id}-clock_out`] ||
                    loadingStates[`${worker.id}-end`] ||
                    isProcessing
                  }
                  isOnline={isOnline}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <ShiftActions
          shift={shift}
          onEndAllShifts={handleEndAllShifts}
          onFinalizeTimesheet={handleFinalizeTimesheet}
          loading={isProcessing}
          isOnline={isOnline}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ShiftManager;
