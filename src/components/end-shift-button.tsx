'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface EndShiftButtonProps {
  shiftId: string;
  assignedPersonnel: Array<{
    id: string;
    user: { name: string };
    status: string;
    timeEntries: Array<{
      clockIn: string;
      clockOut?: string;
      isActive?: boolean;
    }>;
  }>;
  disabled?: boolean;
  className?: string;
}

export default function EndShiftButton({
  shiftId,
  assignedPersonnel,
  disabled = false,
  className = ''
}: EndShiftButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if all workers are clocked out
  const getWorkerStatus = () => {
    const activeWorkers = assignedPersonnel.filter(worker => 
      worker.timeEntries.some(entry => !entry.clockOut || entry.isActive)
    );
    
    const clockedOutWorkers = assignedPersonnel.filter(worker =>
      worker.timeEntries.length > 0 && 
      worker.timeEntries.every(entry => entry.clockOut && !entry.isActive)
    );

    return {
      total: assignedPersonnel.length,
      active: activeWorkers.length,
      clockedOut: clockedOutWorkers.length,
      activeWorkers,
      canFinalize: activeWorkers.length === 0 && assignedPersonnel.length > 0
    };
  };

  const workerStatus = getWorkerStatus();

  const handleEndShiftClick = () => {
    if (!workerStatus.canFinalize) {
      toast({
        title: 'Cannot End Shift',
        description: `${workerStatus.active} worker(s) are still clocked in. Please clock out all workers before ending the shift.`,
        variant: 'destructive'
      });
      return;
    }
    
    setShowConfirmDialog(true);
  };

  const handleConfirmEndShift = async () => {
    try {
      setIsProcessing(true);

      const response = await api.post(`/shifts/${shiftId}/finalize-timesheet`, {});

      toast({
        title: 'Shift Ended Successfully',
        description: 'Timesheet has been created and submitted for client approval.',
      });

      setShowConfirmDialog(false);

      // Navigate to the timesheet review page after a short delay
      setTimeout(() => {
        toast({
          title: 'Timesheet Ready',
          description: 'Click here to view the timesheet for client approval.',
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/timesheets/${response.timesheetId}/unified-review`)}
            >
              View Timesheet
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ),
        });
      }, 2000);

    } catch (error) {
      console.error('Error ending shift:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to end shift. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleEndShiftClick}
        disabled={disabled || isProcessing}
        className={`${className} ${
          workerStatus.canFinalize 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-gray-400 cursor-not-allowed'
        }`}
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Ending Shift...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            End Shift
          </>
        )}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              End Shift & Create Timesheet
            </DialogTitle>
            <DialogDescription>
              This will finalize the shift and create a timesheet for client approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Worker Status Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Worker Status Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total Workers:</span>
                  <Badge variant="outline">{workerStatus.total}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Clocked Out:</span>
                  <Badge variant="default" className="bg-green-500">
                    {workerStatus.clockedOut}
                  </Badge>
                </div>
                {workerStatus.active > 0 && (
                  <div className="col-span-2 flex items-center justify-between">
                    <span>Still Active:</span>
                    <Badge variant="destructive">{workerStatus.active}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Warning if workers still active */}
            {workerStatus.active > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{workerStatus.active} worker(s) are still clocked in:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    {workerStatus.activeWorkers.map(worker => (
                      <li key={worker.id} className="text-sm">
                        {worker.user.name}
                      </li>
                    ))}
                  </ul>
                  Please clock out all workers before ending the shift.
                </AlertDescription>
              </Alert>
            )}

            {/* Success message if ready */}
            {workerStatus.canFinalize && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All workers have been clocked out. The shift is ready to be finalized.
                </AlertDescription>
              </Alert>
            )}

            {/* Next steps */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                What happens next?
              </h4>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Timesheet will be created with all worker hours</li>
                <li>Status will change to "Pending Client Approval"</li>
                <li>Client will be able to review and sign the timesheet</li>
                <li>After client approval, admin can provide final approval</li>
                <li>PDF will be generated for download</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmEndShift}
              disabled={!workerStatus.canFinalize || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm End Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
