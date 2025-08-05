"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  User,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface ConflictInfo {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  roleOnShift: string;
  jobName?: string;
  companyName?: string;
  status: string;
}

interface CurrentShiftInfo {
  date: string;
  startTime: string;
  endTime: string;
  jobName?: string;
  companyName?: string;
}

interface SchedulingConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictInfo[];
  currentShift: CurrentShiftInfo;
  workerName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ROLE_NAMES: Record<string, string> = {
  'CC': 'Crew Chief',
  'SH': 'Stagehand',
  'FO': 'Fork Operator',
  'RFO': 'Reach Fork Operator',
  'RG': 'Rigger',
  'GL': 'General Laborer',
};

const STATUS_COLORS: Record<string, string> = {
  'Assigned': 'bg-blue-100 text-blue-800',
  'ClockedIn': 'bg-green-100 text-green-800',
  'OnBreak': 'bg-yellow-100 text-yellow-800',
  'ClockedOut': 'bg-gray-100 text-gray-800',
  'ShiftEnded': 'bg-purple-100 text-purple-800',
};

export function SchedulingConflictDialog({
  open,
  onOpenChange,
  conflicts,
  currentShift,
  workerName,
  onConfirm,
  onCancel,
  isLoading = false
}: SchedulingConflictDialogProps) {
  const formatTime = (timeString: string) => {
    try {
      return format(new Date(timeString), 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Scheduling Conflict Detected
          </DialogTitle>
          <DialogDescription>
            <strong>{workerName}</strong> is already assigned to {conflicts.length === 1 ? 'another shift' : 'other shifts'} at this time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Shift Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Shift You're Trying to Assign
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{currentShift.jobName || 'Unknown Job'}</span>
                {currentShift.companyName && (
                  <span className="text-blue-600">• {currentShift.companyName}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>{formatDate(currentShift.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>{formatTime(currentShift.startTime)} - {formatTime(currentShift.endTime)}</span>
              </div>
            </div>
          </div>

          {/* Conflicting Shifts */}
          <div className="space-y-3">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Conflicting Assignment{conflicts.length > 1 ? 's' : ''}
            </h3>
            
            {conflicts.map((conflict, index) => (
              <Alert key={conflict.shiftId} variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-red-600" />
                          <span className="font-medium">{conflict.jobName || 'Unknown Job'}</span>
                          {conflict.companyName && (
                            <span className="text-red-600">• {conflict.companyName}</span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-red-500" />
                            <span>{formatDate(conflict.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-red-500" />
                            <span>{formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}</span>
                          </div>
                          {conflict.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-red-500" />
                              <span>{conflict.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-red-500" />
                            <span>Role: {ROLE_NAMES[conflict.roleOnShift] || conflict.roleOnShift}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <Badge 
                          variant="outline" 
                          className={STATUS_COLORS[conflict.status] || 'bg-gray-100 text-gray-800'}
                        >
                          {conflict.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>

          {/* Warning Message */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Double booking warning:</strong> Assigning this worker will create a scheduling conflict. 
              The worker may not be able to fulfill both assignments. Please confirm if you want to proceed anyway.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel Assignment
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {isLoading ? 'Assigning...' : 'Assign Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}