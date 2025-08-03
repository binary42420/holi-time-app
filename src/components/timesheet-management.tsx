"use client"

import React, { useState } from "react"
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'

import { Avatar } from '@/components/Avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { Clock, ClockIcon, FileText, Download, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Assignment, RoleCode, TimeEntry } from "@/lib/types";
import { format } from "date-fns"

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

interface ButtonState {
  text: string;
  action: string;
  variant: ButtonVariant;
}

interface TimesheetManagementProps {
  shiftId: string;
  assignedPersonnel: Assignment[];
  onUpdate: () => void;
}

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; color: string; bgColor: string; borderColor: string }> = {
  'CC': { name: 'Crew Chief', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  'SH': { name: 'Stage Hand', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  'FO': { name: 'Fork Operator', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  'RFO': { name: 'Reach Fork Operator', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  'RG': { name: 'Rigger', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  'GL': { name: 'General Labor', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
} as const

export default function TimesheetManagement({
  shiftId,
  assignedPersonnel,
  onUpdate
}: TimesheetManagementProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClockAction = async (assignmentId: string, action: 'clock_in' | 'clock_out') => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action.replace('_', ' ')}`)
      }

      const worker = assignedPersonnel.find(w => w.id === assignmentId)
      if (worker?.user) {
        toast({
          title: action === 'clock_in' ? "Clocked In" : "Clocked Out",
          description: `${worker.user.name} has been ${action === 'clock_in' ? 'clocked in' : 'clocked out'} successfully`,
        })
      }
      onUpdate()
    } catch (error) {
      console.error(`Error ${action}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action.replace('_', ' ')}`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const endWorkerShift = async (assignmentId: string, workerName: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end shift')
      }

      toast({
        title: "Shift Ended",
        description: `${workerName}'s shift has been ended`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error ending shift:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end shift",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNoShow = async (assignmentId: string, workerName: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/no-show`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark as no-show');
      }

      toast({
        title: 'Marked as No-Show',
        description: `${workerName} has been marked as a no-show.`,
      });
      onUpdate();
    } catch (error) {
      console.error('Error marking as no-show:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark as no-show',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const endAllShifts = async () => {
    const activeWorkers = assignedPersonnel.filter(w => w.status !== 'Shift Ended' && w.status !== 'shift_ended')
    if (activeWorkers.length === 0) {
      toast({
        title: "No Active Workers",
        description: "All workers have already ended their shifts",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end all shifts')
      }

      toast({
        title: "All Shifts Ended",
        description: `Ended shifts for ${activeWorkers.length} workers`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error ending all shifts:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end all shifts",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const finalizeTimesheet = async () => {
    const activeWorkers = assignedPersonnel.filter(w => w.status !== 'Shift Ended' && w.status !== 'shift_ended')
    if (activeWorkers.length > 0) {
      toast({
        title: "Cannot Finalize",
        description: `${activeWorkers.length} workers have not ended their shifts yet`,
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/finalize-timesheet-simple`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to finalize timesheet')
      }

      const result = await response.json()
      toast({
        title: "Timesheet Finalized",
        description: "Timesheet has been finalized and is pending client approval",
      })

      if (result.timesheetId) {
        window.open(`/timesheets/${result.timesheetId}/approve`, '_blank')
      }

      onUpdate()
    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize timesheet",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTimesheet = async () => {
    try {
      const timesheetResponse = await fetch(`/api/timesheets?shiftId=${shiftId}`)
      if (!timesheetResponse.ok) {
        throw new Error('No timesheet found for this shift')
      }

      const timesheetData = await timesheetResponse.json()
      if (!timesheetData.timesheets || timesheetData.timesheets.length === 0) {
        toast({
          title: "No Timesheet",
          description: "Please finalize the timesheet first before downloading",
          variant: "destructive",
        })
        return
      }

      const timesheetId = timesheetData.timesheets[0].id

      const pdfResponse = await fetch(`/api/timesheets/${timesheetId}/pdf`)
      if (!pdfResponse.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await pdfResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet-${shiftId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "PDF Downloaded",
        description: "Timesheet PDF has been downloaded successfully",
      })
    } catch (error) {
      console.error('Error downloading timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download timesheet",
        variant: "destructive",
      })
    }
  }

  const getButtonState = (worker: Assignment): { primary: ButtonState | null; secondary: ButtonState | null } => {
    const timeEntries = (worker.timeEntries as TimeEntry[] || []).filter(e => e.clockIn);
    const clockInCount = timeEntries.length;
    const clockOutCount = timeEntries.filter(e => e.clockOut).length;

    if (worker.status === 'NoShow' || worker.status === 'ShiftEnded') {
      return { primary: null, secondary: null };
    }

    if (clockInCount === 0) {
      return {
        primary: { text: 'Start Shift', action: 'clock_in', variant: 'default' },
        secondary: { text: 'No Show', action: 'no_show', variant: 'destructive' },
      };
    }

    if (clockInCount > clockOutCount) {
      return {
        primary: { text: 'Clock Out', action: 'clock_out', variant: 'outline' },
        secondary: { text: 'End Shift', action: 'end_shift', variant: 'destructive' },
      };
    }

    if (clockInCount === clockOutCount && clockInCount < 3) {
      return {
        primary: { text: 'Clock In', action: 'clock_in', variant: 'default' },
        secondary: { text: 'End Shift', action: 'end_shift', variant: 'destructive' },
      };
    }

    return { primary: null, secondary: { text: 'End Shift', action: 'end_shift', variant: 'destructive' } };
  };

  const calculateTotalHours = (timeEntries: TimeEntry[]) => {
    if (!timeEntries || timeEntries.length === 0) return '0.00';

    const totalMilliseconds = timeEntries.reduce((acc, entry) => {
      if (entry.clockIn && entry.clockOut) {
        const clockInTime = new Date(entry.clockIn).getTime();
        const clockOutTime = new Date(entry.clockOut).getTime();
        return acc + (clockOutTime - clockInTime);
      }
      return acc;
    }, 0);

    return (totalMilliseconds / (1000 * 60 * 60)).toFixed(2);
  };

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '-'
    try {
      const date = new Date(timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;

      if (minutes === 0) {
        return `${formattedHour}:00 ${ampm}`;
      }

      const formattedMinute = minutes < 10 ? `0${minutes}` : minutes;
      return `${formattedHour}:${formattedMinute} ${ampm}`;
    } catch (error) {
      return '-';
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Timesheet Management
        </CardTitle>
        <CardDescription>
          Manage clock in/out times and track worker hours
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 bg-gray-800 z-10">
              <TableRow>
                <TableHead className="p-2 sm:p-4 sticky left-0 bg-gray-800 z-20 min-w-[160px]">Employee</TableHead>
                <TableHead className="p-2 sm:p-4 sticky left-[160px] bg-gray-800 z-20 min-w-[100px]">Role</TableHead>
                <TableHead className="p-2 sm:p-4 text-center min-w-[90px]">IN 1</TableHead>
                <TableHead className="p-2 sm:p-4 text-center min-w-[90px]">OUT 1</TableHead>
                <TableHead className="p-2 sm:p-4 text-center min-w-[90px]">IN 2</TableHead>
                <TableHead className="p-2 sm:p-4 text-center min-w-[90px]">OUT 2</TableHead>
                <TableHead className="p-2 sm:p-4 text-center min-w-[90px]">IN 3</TableHead>
                <TableHead className="p-2 sm:p-4 text-center min-w-[90px]">OUT 3</TableHead>
                <TableHead className="p-2 sm:p-4 min-w-[110px]">Total Hrs</TableHead>
                <TableHead className="p-2 sm:p-4 sticky right-0 bg-gray-800 z-20 min-w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedPersonnel.filter(p => p.user).map((worker) => {
                const roleDef = ROLE_DEFINITIONS[worker.roleCode as RoleCode];
                const buttonState = getButtonState(worker);
                const sortedTimeEntries = [...(worker.timeEntries as TimeEntry[] || [])]
                  .filter(e => e.clockIn)
                  .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

                return (
                  <TableRow key={worker.id} className={`${roleDef?.bgColor || 'bg-gray-50'}`}>
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={worker.user!.avatarUrl}
                          name={worker.user!.name}
                          userId={worker.user!.id}
                          size="xs"
                          enableSmartCaching={true}
                          className="h-8 w-8"
                        />
                        <div>
                          <div className="font-medium text-sm sm:text-base">{worker.user!.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-2 sm:p-4">
                      <Badge variant="outline" className={`${roleDef?.color || 'text-gray-700'}`}>
                        {roleDef?.name || worker.roleCode}
                      </Badge>
                    </TableCell>

                    {[...Array(3)].map((_, i) => {
                      const entry = sortedTimeEntries[i];
                      const prevEntry = sortedTimeEntries[i - 1];
                      
                      const showIn = i === 0 || (prevEntry && prevEntry.clockOut);
                      const showOut = showIn && entry;

                      return (
                        <React.Fragment key={i}>
                          <TableCell className={`p-2 sm:p-4 text-center ${showIn ? '' : 'invisible'}`}>
                            {entry?.clockIn ? formatTime(entry.clockIn.toString()) : '-'}
                          </TableCell>
                          <TableCell className={`p-2 sm:p-4 text-center ${showOut ? '' : 'invisible'}`}>
                            {entry?.clockOut ? formatTime(entry.clockOut.toString()) : '-'}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}

                    <TableCell className="p-2 sm:p-4">
                      {calculateTotalHours(sortedTimeEntries)}
                    </TableCell>

                    <TableCell className="p-2 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                        {buttonState.primary && (
                          <Button
                            size="lg"
                            variant={buttonState.primary.variant}
                            onClick={() => {
                              if ('vibrate' in navigator) navigator.vibrate(50);
                              handleClockAction(worker.id, buttonState.primary!.action as 'clock_in' | 'clock_out');
                            }}
                            disabled={isProcessing}
                            className="w-full min-h-[48px] sm:w-auto"
                          >
                            <Clock className="h-5 w-5 mr-2" />
                            <span className="text-base">{buttonState.primary.text}</span>
                          </Button>
                        )}
                        {buttonState.secondary && (
                          <Button
                            size="lg"
                            variant={buttonState.secondary.variant}
                            onClick={() => {
                              if (buttonState.secondary?.action === 'no_show') {
                                handleNoShow(worker.id, worker.user!.name);
                              } else if (buttonState.secondary?.action === 'end_shift') {
                                endWorkerShift(worker.id, worker.user!.name);
                              }
                            }}
                            disabled={isProcessing}
                            className="w-full min-h-[48px] sm:w-auto"
                          >
                            {buttonState.secondary.text}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t gap-4 p-4 sm:p-0">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isProcessing || assignedPersonnel.filter(w => (w as any).status !== 'Shift Ended' && (w as any).status !== 'shift_ended').length === 0}
                  className="flex-grow"
                >
                  <Users className="h-4 w-4 mr-2" />
                  End All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End All Shifts</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to end shifts for all active workers? This will:
                                  <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Clock out all currently clocked-in workers</li>
                                    <li>Mark all worker statuses as Shift Ended</li>
                                  </ul>
                                  <div className="mt-3 p-3 bg-muted rounded">
                                    <strong>Affected workers:</strong>
                                    <ul className="mt-1">
                                      {assignedPersonnel
                                        .filter(w => w.user && (w as any).status !== 'Shift Ended' && (w as any).status !== 'shift_ended')
                                        .map(w => {
                                          const roleDef = ROLE_DEFINITIONS[w.roleCode as RoleCode];
                                          return (
                                            <li key={w.id} className="text-sm">• {w.user!.name} ({roleDef?.name || w.roleCode})</li>
                                          )
                                        })}
                                    </ul>
                                  </div>
                                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={endAllShifts}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    End All Shifts
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              onClick={downloadTimesheet}
              variant="outline"
              disabled={isProcessing}
              className="flex-grow"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={finalizeTimesheet}
              disabled={isProcessing || assignedPersonnel.some(w => (w as any).status !== 'Shift Ended' && (w as any).status !== 'shift_ended')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex-grow"
            >
              <FileText className="h-4 w-4 mr-2" />
              Finalize
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
