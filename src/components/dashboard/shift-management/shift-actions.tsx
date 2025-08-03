import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StopCircle, FileText, UserMinus } from "lucide-react";
import { IShiftActionsProps } from './types';
import Link from 'next/link';
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

const ShiftActions: React.FC<IShiftActionsProps> = ({ shift, onEndAllShifts, onFinalizeTimesheet, loading, isOnline }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const canEndAllShifts = shift.assignedPersonnel.some(w => w.status !== 'ShiftEnded');
  const canFinalizeTimesheet = shift.assignedPersonnel.every(w => w.status === 'ShiftEnded');
  const isUserAssigned = shift.assignedPersonnel.some(p => p.userId === user?.id);

  const handleDropShift = async () => {
    try {
      const response = await fetch(`/api/shifts/${shift.id}/drop`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to drop shift');
      }
      toast({
        title: 'Shift Dropped',
        description: data.message,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Actions</CardTitle>
        <CardDescription>
          Perform actions on all workers at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!isOnline || !canEndAllShifts || loading}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                End All Shifts
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End All Active Shifts?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end shifts for all workers who haven't completed their shifts yet.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onEndAllShifts}>
                  End All Shifts
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {shift.timesheet ? (
            <Link href={`/timesheets/${shift.timesheet.id}`} passHref>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                View Timesheet
              </Button>
            </Link>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={!isOnline || !canFinalizeTimesheet || loading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Finalize Timesheet
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize Timesheet?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a final timesheet for client approval.
                    Make sure all workers have completed their shifts.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onFinalizeTimesheet}>
                    Finalize Timesheet
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isUserAssigned && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!isOnline || loading}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Drop My Shift
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Drop this shift?</AlertDialogTitle>
                  <AlertDialogDescription>
                    If the shift is more than 24 hours away, you will be unassigned.
                    If it's within 24 hours, your slot will be opened up for others to claim.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDropShift}>
                    Confirm Drop
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftActions;
