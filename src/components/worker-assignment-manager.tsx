"use client"

import React, { useState } from "react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/Avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, UserPlus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Assignment, RoleCode, TimeEntry } from "@/lib/types";
import { format } from "date-fns"
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

interface WorkerAssignmentManagerProps {
  shiftId: string;
  assignedPersonnel: Assignment[];
  workerRequirements: { roleCode: RoleCode; requiredCount: number }[];
  availableEmployees: any[];
  onUpdate: () => void;
}

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; roleColor: "purple" | "blue" | "green" | "yellow" | "red" | "gray"; cardBgColor: string; textColor: string; borderColor: string; }> = {
  'CC': { name: 'Crew Chief', roleColor: 'purple', cardBgColor: 'bg-purple-50 dark:bg-purple-900/30', textColor: 'text-purple-900 dark:text-purple-100', borderColor: 'border-purple-200 dark:border-purple-700' },
  'SH': { name: 'Stage Hand', roleColor: 'blue', cardBgColor: 'bg-blue-50 dark:bg-blue-900/30', textColor: 'text-blue-900 dark:text-blue-100', borderColor: 'border-blue-200 dark:border-blue-700' },
  'FO': { name: 'Fork Operator', roleColor: 'green', cardBgColor: 'bg-green-50 dark:bg-green-900/30', textColor: 'text-green-900 dark:text-green-100', borderColor: 'border-green-200 dark:border-green-700' },
  'RFO': { name: 'Reach Fork Operator', roleColor: 'yellow', cardBgColor: 'bg-yellow-50 dark:bg-yellow-900/30', textColor: 'text-yellow-900 dark:text-yellow-100', borderColor: 'border-yellow-200 dark:border-yellow-700' },
  'RG': { name: 'Rigger', roleColor: 'red', cardBgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-900 dark:text-red-100', borderColor: 'border-red-200 dark:border-red-700' },
  'GL': { name: 'General Labor', roleColor: 'gray', cardBgColor: 'bg-gray-100 dark:bg-gray-800/30', textColor: 'text-gray-900 dark:text-gray-100', borderColor: 'border-gray-200 dark:border-gray-700' },
} as const

export default function WorkerAssignmentManager({
  shiftId,
  assignedPersonnel,
  workerRequirements,
  availableEmployees,
  onUpdate
}: WorkerAssignmentManagerProps) {
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

  const getEligibleEmployees = (roleCode: RoleCode) => {
    return availableEmployees.filter(employee => {
      if (employee.role === 'Admin') {
        return true
      }
      switch (roleCode) {
        case 'CC':
          return employee.crewChiefEligible || employee.role === 'Crew Chief'
        case 'FO':
        case 'RFO':
          return employee.forkOperatorEligible
        default:
          return true
      }
    })
  }

  const checkTimeConflicts = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/check-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      })
      if (!response.ok) {
        return { hasConflicts: false, conflicts: [] }
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return { hasConflicts: false, conflicts: [] }
    }
  }

  const assignWorker = async (employeeId: string, roleCode: RoleCode) => {
    try {
      const employee = availableEmployees.find(emp => emp.id === employeeId)
      if (!employee) return

      const conflictCheck = await checkTimeConflicts(employeeId)
      if (conflictCheck.hasConflicts && conflictCheck.conflicts.length > 0) {
        const conflict = conflictCheck.conflicts[0]
        toast({
          title: "Time Conflict",
          description: `${employee.name} is already assigned to ${conflict.clientName} - ${conflict.jobName} from ${conflict.startTime} to ${conflict.endTime} on the same day`,
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/shifts/${shiftId}/assign-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          roleCode,
          roleOnShift: ROLE_DEFINITIONS[roleCode].name
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign worker')
      }

      toast({
        title: "Worker Assigned",
        description: `${employee.name} assigned as ${ROLE_DEFINITIONS[roleCode].name}`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error assigning worker:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign worker",
        variant: "destructive",
      })
    }
  }

  const unassignWorker = async (assignmentId: string, workerName: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unassign worker')
      }

      toast({
        title: "Worker Unassigned",
        description: `${workerName} has been unassigned from this shift`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error unassigning worker:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign worker",
        variant: "destructive",
      })
    }
  }

  const endWorkerShift = async (assignmentId: string, workerName: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/timesheets/${assignmentId}/end-shift`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to end shift');
      }

      toast({
        title: "Shift Ended",
        description: `The shift has been ended for ${workerName}.`,
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not end shift.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRequiredCount = (roleCode: RoleCode): number => {
    return workerRequirements.find(req => req.roleCode === roleCode)?.requiredCount || 0
  }

  const getAssignedWorkers = (roleCode: RoleCode): Assignment[] => {
    return assignedPersonnel.filter(worker => worker.roleCode === roleCode)
  }

  const generateWorkerSlots = (roleCode: RoleCode): { type: 'assigned' | 'empty', worker?: Assignment, roleCode: RoleCode }[] => {
    const assignedWorkers = getAssignedWorkers(roleCode);
    const requiredCount = getRequiredCount(roleCode);
    const totalSlots = Math.max(assignedWorkers.length, requiredCount);
    const slots: { type: 'assigned' | 'empty', worker?: Assignment, roleCode: RoleCode }[] = [];

    for (let i = 0; i < totalSlots; i++) {
      if (i < assignedWorkers.length) {
        slots.push({ type: 'assigned', worker: assignedWorkers[i], roleCode });
      } else {
        slots.push({ type: 'empty', roleCode });
      }
    }
    return slots;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Worker Assignments & Time Management
        </CardTitle>
        <CardDescription>
          Assign workers and manage their clock-in/out times.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
            const slots = generateWorkerSlots(roleCode)
            if (getRequiredCount(roleCode) === 0 && getAssignedWorkers(roleCode).length === 0) {
              return null
            }

            return (
              <div key={roleCode} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${roleDef.textColor} ${roleDef.cardBgColor}`}>
                    {roleCode}
                  </Badge>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{roleDef.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({getAssignedWorkers(roleCode).length}/{getRequiredCount(roleCode)} assigned)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {slots.map((slot, index) => (
                    <div key={`${roleCode}-${index}`} className={`rounded-lg border-2 shadow-sm transition-all ${roleDef.borderColor} ${slot.type === 'empty' ? `border-dashed ${roleDef.cardBgColor}` : `bg-white dark:bg-gray-900`}`}>
                      {(slot.type === 'assigned' && slot.worker?.user) ? (
                        <div className="flex flex-col h-full p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={slot.worker.user.avatarUrl}
                                name={slot.worker.user.name}
                                userId={slot.worker.user.id}
                                size= "sm"
                                enableSmartCaching={true}
                                className={`h-10 w-10 border-1 ${roleDef.borderColor}`}
                              />
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white">{slot.worker.user.name}</div>
                                <div className={`text-sm font-medium ${roleDef.textColor}`}>{roleDef.name}</div>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50">
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Unassign Worker</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to unassign {slot.worker.user.name} from this shift?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => unassignWorker(slot.worker!.id, slot.worker!.user!.name)} className="bg-red-600 hover:bg-red-700">Unassign</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <div className="flex-grow mt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
                              <Badge color={slot.worker.timeEntries.some(t => t.clockIn && !t.clockOut) ? "green" : "gray"} className="text-xs">
                                {slot.worker.timeEntries.some(t => t.clockIn && !t.clockOut) ? 'Clocked In' : 'Not Clocked In'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Clocked In At</span>
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {slot.worker.timeEntries.find(t => t.clockOut === null)
                                  ? format(new Date(slot.worker.timeEntries.find(t => t.clockOut === null)!.clockIn), 'p')
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              variant={slot.worker.timeEntries.some(t => t.clockIn && !t.clockOut) ? 'outline' : 'default'}
                              size="sm"
                              onClick={() => {
                                const action = slot.worker.timeEntries.some(t => t.clockIn && !t.clockOut) ? 'clock_out' : 'clock_in';
                                if (slot.worker) handleClockAction(slot.worker.id, action);
                              }}
                              disabled={isProcessing}
                              className="w-full text-xs"
                            >
                              {slot.worker.timeEntries.some(t => t.clockIn && !t.clockOut) ? 'Clock Out' : 'Clock In'}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isProcessing || !slot.worker} className="w-full text-xs">End Shift</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>End Shift</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to end the shift for {slot.worker?.user.name}? This will clock them out and finalize their timesheet for this shift.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => slot.worker && endWorkerShift(slot.worker.id, slot.worker.user.name)} className="bg-red-600 hover:bg-red-700">End Shift</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full p-4 min-h-[160px]">
                          <Select onValueChange={(employeeId) => assignWorker(employeeId, roleCode)}>
                            <SelectTrigger className="w-full h-full text-base">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 text-white border-gray-700 z-50">
                              {getEligibleEmployees(roleCode)
                                .filter(emp => !assignedPersonnel.some(assigned => assigned && assigned.user && assigned.user.id === emp.id))
                                .map(employee => (
                                  <SelectItem key={employee.id} value={employee.id} className="hover:bg-gray-700 focus:bg-gray-700">
                                    <div className="flex items-center justify-between w-full">
                                      <span>{employee.name}</span>
                                      <div className="flex gap-1">
                                        {employee.role === 'Admin' && (
                                          <Badge variant="secondary" className="text-xs">Manager</Badge>
                                        )}
                                        {roleCode === 'CC' && employee.crewChiefEligible && (
                                          <span className="text-xs text-muted-foreground">(CC)</span>
                                        )}
                                        {(roleCode === 'FO' || roleCode === 'RFO') && employee.forkOperatorEligible && (
                                          <span className="text-xs text-muted-foreground">(FO)</span>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              {getEligibleEmployees(roleCode)
                                .filter(emp => !assignedPersonnel.some(assigned => assigned && assigned.user && assigned.user.id === emp.id))
                                .length === 0 && (
                                <SelectItem value="no-workers" disabled className="text-gray-400">
                                  No eligible workers available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}