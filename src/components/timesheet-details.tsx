import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, MapPin, Building, Users, Clock, CheckCircle, XCircle, FileText, Download, Eye, AlertCircle } from 'lucide-react'
import { format, differenceInHours, differenceInMinutes } from 'date-fns'
import { CompanyAvatar } from '@/components/CompanyAvatar'
import { Avatar } from '@/components/Avatar'
import type { TimesheetDetails as TimesheetDetailsType } from '@/lib/types'

interface TimesheetDetailsProps {
  timesheet: TimesheetDetailsType
}

export function TimesheetDetails({ timesheet }: TimesheetDetailsProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  if (!timesheet || !timesheet.shift) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No timesheet data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const shift = timesheet.shift
  const job = shift.job
  const company = job?.company

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return 'secondary'
      case 'pending_manager_approval':
        return 'outline'
      case 'completed':
        return 'default'
      case 'rejected':
        return 'destructive'
      case 'draft':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return 'Pending Client Approval'
      case 'pending_manager_approval':
        return 'Pending Manager Approval'
      case 'completed':
        return 'Completed'
      case 'rejected':
        return 'Rejected'
      case 'draft':
        return 'Draft'
      default:
        return status
    }
  }

  const calculateTotalHours = () => {
    if (!shift.assignedPersonnel) return 0
    return shift.assignedPersonnel.reduce((total, personnel) => {
      const employeeTotal = personnel.timeEntries?.reduce((empTotal, entry) => {
        if (entry.clockIn && entry.clockOut) {
          const clockIn = new Date(entry.clockIn)
          const clockOut = new Date(entry.clockOut)
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
          return empTotal + hours
        }
        return empTotal
      }, 0) || 0
      return total + employeeTotal
    }, 0)
  }

  const calculateEmployeeHours = (timeEntries: any[]) => {
    return timeEntries?.reduce((total, entry) => {
      if (entry.clockIn && entry.clockOut) {
        const clockIn = new Date(entry.clockIn)
        const clockOut = new Date(entry.clockOut)
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        return total + hours
      }
      return total
    }, 0) || 0
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheet.id}/approve`, {
        method: 'POST',
      })
      if (response.ok) {
        // Handle success - could trigger a refetch or show success message
        window.location.reload() // Simple reload for now
      }
    } catch (error) {
      console.error('Error approving timesheet:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheet.id}/reject`, {
        method: 'POST',
      })
      if (response.ok) {
        // Handle success
        window.location.reload()
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/timesheets/${timesheet.id}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `timesheet-${timesheet.id}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Status and Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Timesheet Details</h2>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(timesheet.status)} className="text-sm">
              {getStatusLabel(timesheet.status)}
            </Badge>
            {timesheet.submittedAt && (
              <span className="text-sm text-muted-foreground">
                Submitted {format(new Date(timesheet.submittedAt), 'PPp')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          {(timesheet.status === 'pending_client_approval' || timesheet.status === 'pending_manager_approval') && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReject}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                size="sm" 
                onClick={handleApprove}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shift Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shift Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{format(new Date(shift.date), 'PPP')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">
                {shift.startTime && shift.endTime ? (
                  <>
                    {format(new Date(shift.startTime), 'p')} - {format(new Date(shift.endTime), 'p')}
                  </>
                ) : (
                  'Time not specified'
                )}
              </span>
            </div>
            {shift.location && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{shift.location}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Shift Status:</span>
              <Badge variant="outline">{shift.status}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center font-medium">
              <span>Total Hours Worked:</span>
              <span className="text-lg">{calculateTotalHours().toFixed(2)} hrs</span>
            </div>
          </CardContent>
        </Card>

        {/* Company & Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Company:</span>
                <div className="flex items-center gap-2">
                  <CompanyAvatar
                    src={company.company_logo_url}
                    name={company.name}
                    className="w-6 h-6"
                  />
                  <span className="font-medium">{company.name}</span>
                </div>
              </div>
            )}
            {job && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Job:</span>
                <span className="font-medium">{job.name}</span>
              </div>
            )}
            {job?.description && (
              <div className="space-y-2">
                <span className="text-muted-foreground">Description:</span>
                <p className="text-sm bg-muted p-3 rounded-md">{job.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personnel & Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personnel & Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shift.assignedPersonnel && shift.assignedPersonnel.length > 0 ? (
            <div className="space-y-4">
              {shift.assignedPersonnel.map((personnel: any) => {
                const sortedTimeEntries = personnel.timeEntries?.sort((a: any, b: any) => a.entryNumber - b.entryNumber) || []
                const totalEmployeeHours = calculateEmployeeHours(sortedTimeEntries)

                return (
                  <Card key={personnel.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={personnel.user?.avatarUrl}
                          name={personnel.user?.name || personnel.user?.email || 'U'}
                          userId={personnel.user?.id}
                          size="md"
                        />
                        <div>
                          <h4 className="font-medium">{personnel.user?.name || 'Unassigned'}</h4>
                          <p className="text-sm text-muted-foreground">{personnel.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {personnel.roleCode}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {personnel.status || 'Assigned'}
                        </Badge>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs block">Total Hours</span>
                          <span className="font-bold text-lg">{totalEmployeeHours.toFixed(2)} hrs</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Time Entries Table */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-muted-foreground">Time Entries</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 font-medium text-muted-foreground">Entry</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">Clock In</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">Clock Out</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">Break</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedTimeEntries.length > 0 ? (
                              sortedTimeEntries.map((entry: any, index: number) => {
                                const clockIn = entry.clockIn ? new Date(entry.clockIn) : null
                                const clockOut = entry.clockOut ? new Date(entry.clockOut) : null
                                const breakStart = entry.breakStart ? new Date(entry.breakStart) : null
                                const breakEnd = entry.breakEnd ? new Date(entry.breakEnd) : null
                                
                                let entryHours = 0
                                let breakMinutes = 0
                                
                                if (clockIn && clockOut) {
                                  entryHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
                                }
                                
                                if (breakStart && breakEnd) {
                                  breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
                                }
                                
                                return (
                                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">#{entry.entryNumber || index + 1}</td>
                                    <td className="p-2">
                                      {clockIn ? format(clockIn, 'p') : '-'}
                                    </td>
                                    <td className="p-2">
                                      {clockOut ? format(clockOut, 'p') : 
                                        <Badge variant="secondary" className="text-xs">Active</Badge>
                                      }
                                    </td>
                                    <td className="p-2">
                                      {breakMinutes > 0 ? `${Math.round(breakMinutes)} min` : '-'}
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                      {entryHours > 0 ? entryHours.toFixed(2) : '-'}
                                    </td>
                                  </tr>
                                )
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                  No time entries recorded
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No personnel assigned to this shift
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
