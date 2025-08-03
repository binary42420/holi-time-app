"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from '@/components/ui/button'

import { Input } from '@mantine/core'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from '@/components/Avatar'
import { 
  Clock, 
  Play, 
  Square, 
  CheckCircle, 
  AlertCircle,
  Users,
  Save,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
  isActive: boolean
}

interface AssignedWorker {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  roleOnShift: string
  roleCode: string
  status: 'not_started' | 'clocked_in' | 'clocked_out' | 'shift_ended'
  timeEntries: TimeEntry[]
}

interface ShiftTimeManagementProps {
  shiftId: string
  assignedPersonnel: AssignedWorker[]
  canManage: boolean
  onUpdate: () => void
}

export default function ShiftTimeManagement({ 
  shiftId, 
  assignedPersonnel, 
  canManage, 
  onUpdate 
}: ShiftTimeManagementProps) {
  const { toast } = useToast()
  const [workers, setWorkers] = useState<AssignedWorker[]>(assignedPersonnel)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  useEffect(() => {
    setWorkers(assignedPersonnel)
  }, [assignedPersonnel])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return 'bg-green-100 border-green-300'
      case 'clocked_out':
        return 'bg-yellow-100 border-yellow-300'
      case 'shift_ended':
        return 'bg-gray-100 border-gray-300'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return <Badge variant="default" className="bg-green-600"><Play className="mr-1 h-3 w-3" />Clocked In</Badge>
      case 'clocked_out':
        return <Badge variant="secondary"><Square className="mr-1 h-3 w-3" />Clocked Out</Badge>
      case 'shift_ended':
        return <Badge variant="outline"><CheckCircle className="mr-1 h-3 w-3" />Shift Ended</Badge>
      default:
        return <Badge variant="outline">Not Started</Badge>
    }
  }

  const handleClockIn = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    setActionLoading(prev => new Set(prev).add(`clockIn-${workerId}`))
    try {
      const response = await fetch(`/api/shifts/${shiftId}/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${worker?.employeeName || 'Employee'} has been clocked in successfully.`,
        })
        onUpdate()
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clock in')
      }
    } catch (error) {
      toast({
        title: "Clock In Failed",
        description: error instanceof Error ? error.message : "Failed to clock in employee.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(`clockIn-${workerId}`)
        return newSet
      })
    }
  }

  const handleClockOut = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    setActionLoading(prev => new Set(prev).add(`clockOut-${workerId}`))
    try {
      const response = await fetch(`/api/shifts/${shiftId}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${worker?.employeeName || 'Employee'} has been clocked out successfully.`,
        })
        onUpdate()
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clock out')
      }
    } catch (error) {
      toast({
        title: "Clock Out Failed",
        description: error instanceof Error ? error.message : "Failed to clock out employee.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(`clockOut-${workerId}`)
        return newSet
      })
    }
  }

  const handleEndShift = async (workerId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (response.ok) {
        toast({
          title: "Shift Ended",
          description: "Employee's shift has been ended.",
        })
        onUpdate()
      } else {
        throw new Error('Failed to end shift')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end shift for employee.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEndAllShifts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "All Shifts Ended",
          description: "All active shifts have been ended.",
        })
        onUpdate()
      } else {
        throw new Error('Failed to end all shifts')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end all shifts.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeShift = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/finalize`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "Shift Finalized",
          description: "Shift has been sent for client approval.",
        })
        onUpdate()
      } else {
        throw new Error('Failed to finalize shift')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to finalize shift.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateTimeEntry = async (workerId: string, entryNumber: number, field: 'clockIn' | 'clockOut', value: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/update-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, entryNumber, field, value }),
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update time entry.",
        variant: "destructive",
      })
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigned Personnel
          </CardTitle>
          <CardDescription>View assigned workers for this shift</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {workers.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={worker.employeeAvatar}
                    name={worker.employeeName}
                    userId={worker.employeeId}
                    size="sm"
                    enableSmartCaching={true}
                    className="h-8 w-8"
                  />
                  <div>
                    <div className="font-medium">{worker.employeeName}</div>
                    <div className="text-sm text-muted-foreground">{worker.roleOnShift}</div>
                  </div>
                </div>
                {getStatusBadge(worker.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Management
            </CardTitle>
            <CardDescription>Manage clock in/out times for assigned workers</CardDescription>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={loading}>
                  End All Shifts
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End All Shifts</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clock out all currently clocked-in employees and end their shifts. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndAllShifts}>
                    End All Shifts
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading}>
                  Finalize Shift
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize Shift</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will finalize the shift and send it for client approval. 
                    Make sure all time entries are correct before proceeding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinalizeShift}>
                    Finalize Shift
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Clock In 1</TableHead>
                <TableHead>Clock Out 1</TableHead>
                <TableHead>Clock In 2</TableHead>
                <TableHead>Clock Out 2</TableHead>
                <TableHead>Clock In 3</TableHead>
                <TableHead>Clock Out 3</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker.id} className={getStatusColor(worker.status)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={worker.employeeAvatar}
                        name={worker.employeeName}
                        userId={worker.employeeId}
                        size="sm"
                        enableSmartCaching={true}
                        className="h-8 w-8"
                      />
                      <div>
                        <div className="font-medium">{worker.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{worker.roleCode}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{worker.roleOnShift}</Badge>
                  </TableCell>
                  
                  {/* Time entry inputs for 3 pairs */}
                  {[1, 2, 3].map((entryNum) => {
                    const entry = worker.timeEntries.find(e => e.entryNumber === entryNum)
                    return (
                      <React.Fragment key={entryNum}>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={entry?.clockIn ? format(new Date(entry.clockIn), "yyyy-MM-dd'T'HH:mm") : ''}
                            onChange={(e) => updateTimeEntry(worker.id, entryNum, 'clockIn', e.target.value)}
                            className="w-40"
                            disabled={worker.status === 'shift_ended'}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={entry?.clockOut ? format(new Date(entry.clockOut), "yyyy-MM-dd'T'HH:mm") : ''}
                            onChange={(e) => updateTimeEntry(worker.id, entryNum, 'clockOut', e.target.value)}
                            className="w-40"
                            disabled={worker.status === 'shift_ended'}
                          />
                        </TableCell>
                      </React.Fragment>
                    )
                  })}
                  
                  <TableCell>{getStatusBadge(worker.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {worker.status === 'not_started' && (
                        <Button
                          size="sm"
                          onClick={() => handleClockIn(worker.id)}
                          disabled={actionLoading.has(`clockIn-${worker.id}`) || actionLoading.size > 0}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading.has(`clockIn-${worker.id}`) ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          Clock In
                        </Button>
                      )}
                      {worker.status === 'clocked_in' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleClockOut(worker.id)}
                          disabled={actionLoading.has(`clockOut-${worker.id}`) || actionLoading.size > 0}
                          className="disabled:opacity-50"
                        >
                          {actionLoading.has(`clockOut-${worker.id}`) ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Square className="h-3 w-3 mr-1" />
                          )}
                          Clock Out
                        </Button>
                      )}
                      {(worker.status === 'clocked_out' || worker.status === 'clocked_in') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={loading}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              End Shift
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>End Shift for {worker.employeeName}</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will end the shift for this employee and record their final clock out time. 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleEndShift(worker.id)}>
                                End Shift
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
