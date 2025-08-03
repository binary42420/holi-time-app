"use client"

import React from "react"
import { CustomButton } from '@/components/ui/custom-button'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar } from '@/components/Avatar'
import { UserPlus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Assignment, RoleCode } from "@/lib/types";

interface WorkerAssignmentsProps {
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

export default function WorkerAssignments({
  shiftId,
  assignedPersonnel,
  workerRequirements,
  availableEmployees,
  onUpdate
}: WorkerAssignmentsProps) {
  const { toast } = useToast()

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

  const getRequiredCount = (roleCode: RoleCode): number => {
    return workerRequirements.find(req => req.roleCode === roleCode)?.requiredCount || 0
  }

  const getAssignedWorkers = (roleCode: RoleCode): Assignment[] => {
    return assignedPersonnel.filter(worker => worker.roleCode === roleCode)
  }

  const generateWorkerSlots = (roleCode: RoleCode): { type: string, worker?: Assignment, roleCode: RoleCode }[] => {
    const requiredCount = getRequiredCount(roleCode)
    const assignedWorkers = getAssignedWorkers(roleCode)
    const slots: { type: string, worker?: Assignment, roleCode: RoleCode }[] = []

    assignedWorkers.forEach(worker => {
      slots.push({ type: 'assigned', worker, roleCode })
    })

    const emptySlots = Math.max(0, requiredCount - assignedWorkers.length)
    for (let i = 0; i < emptySlots; i++) {
      slots.push({ type: 'empty', roleCode })
    }

    return slots
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Worker Assignments
        </CardTitle>
        <CardDescription>
          Assign specific workers to each required position
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
            const slots = generateWorkerSlots(roleCode)
            
            if (slots.length === 0) return null

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
                    <div
                      key={`${roleCode}-${index}`}
                      className={`p-4 rounded-lg border ${roleDef.cardBgColor} ${roleDef.borderColor}`}
                    >
                      {(slot.type === 'assigned' && slot.worker && slot.worker.user) ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/employees/${slot.worker.user.id}`;
                              }}
                            >
                              <Avatar
                                src={slot.worker.user.avatarUrl}
                                name={slot.worker.user.name}
                                userId={slot.worker.user.id}
                                size="md"
                                enableSmartCaching={true}
                                className="h-12 w-12"
                              />
                            </div>
                            <div>
                              <div className={`font-semibold ${roleDef.textColor}`}>{slot.worker.user.name}</div>
                              <div className={`text-sm ${roleDef.textColor}`}>{ROLE_DEFINITIONS[slot.worker.roleCode]?.name}</div>
                            </div>
                          </div>
                          <CustomButton
                            size="icon"
                            variant="ghost"
                            onClick={() => unassignWorker(slot.worker!.id, slot.worker!.user!.name)}
                            className={`h-8 w-8 ${roleDef.textColor} hover:bg-black/10`}
                          >
                            <X className="h-4 w-4" />
                          </CustomButton>
                        </div>
                      ) : (
                        <Select onValueChange={(employeeId) => assignWorker(employeeId, roleCode)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select worker..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getEligibleEmployees(roleCode)
                              .filter(emp => !assignedPersonnel.some(assigned => assigned && assigned.user && assigned.user.id === emp.id))
                              .map(employee => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{employee.name}</span>
                                    <div className="flex gap-1">
                                      {employee.role === 'Admin' && (
                                        <Badge variant="secondary" className="text-xs">Manager</Badge>
                                      )}
                                      {roleCode === 'CC' && employee.crewChiefEligible && (
                                        <span className="text-xs text-muted-foreground">(CC Eligible)</span>
                                      )}
                                      {(roleCode === 'FO' || roleCode === 'RFO') && employee.forkOperatorEligible && (
                                        <span className="text-xs text-muted-foreground">(FO Eligible)</span>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            {getEligibleEmployees(roleCode)
                              .filter(emp => !assignedPersonnel.some(assigned => assigned && assigned.user && assigned.user.id === emp.id))
                              .length === 0 && (
                              <SelectItem value="no-workers" disabled>
                                No eligible workers available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
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
