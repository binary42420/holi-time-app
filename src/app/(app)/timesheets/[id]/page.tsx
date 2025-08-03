"use client"

import React from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock, 
  User, 
  Building2, 
  Calendar,
  Download,
  Shield,
  ArrowLeft,
  AlertCircle
} from "lucide-react"
import { useTimesheet } from "@/hooks/use-api"
import { format } from "date-fns"
import { TimesheetStatus } from "@prisma/client"

export default function TimesheetViewPage() {
  const params = useParams()
  const router = useRouter()
  const timesheetId = params.id as string

  // Fetch timesheet data
  const { data: timesheet, isLoading: loading } = useTimesheet(timesheetId);

  const formatTime = (timeString?: string | Date) => {
    if (!timeString) return '-'
    try {
      const date = new Date(timeString);
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

  const calculateHours = (clockIn?: string | Date, clockOut?: string | Date) => {
    if (!clockIn || !clockOut) return 0
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }
const getStatusBadge = (status: TimesheetStatus) => {
  switch (status) {
    case TimesheetStatus.COMPLETED:
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
    case TimesheetStatus.REJECTED:
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
    case TimesheetStatus.PENDING_COMPANY_APPROVAL: // Assuming client approval maps to company approval
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Client Approval</Badge>
    case TimesheetStatus.PENDING_MANAGER_APPROVAL:
      return <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Pending Manager Approval</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

  const downloadPDF = async () => {
    try {
      // Determine PDF type - prefer signed if available
      const type = timesheet?.signed_pdf_url ? 'signed' : 'unsigned';
      const response = await fetch(`/api/timesheets/${timesheetId}/pdf?type=${type}`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet-${timesheet?.shift.job.name?.replace(/\s+/g, '-') || 'unknown'}-${timesheet?.shift.date ? format(new Date(timesheet.shift.date), 'yyyy-MM-dd') : 'unknown'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading timesheet...</div>
        </div>
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Timesheet not found</div>
        </div>
      </div>
    )
  }

  if (!timesheet.shift) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">Error: Shift data is missing for this timesheet.</div>
        </div>
      </div>
    )
  }
 
  const { shift } = timesheet
  const { assignedPersonnel } = timesheet.shift

  const maxEntries = Math.max(
    ...assignedPersonnel.map(p => p.timeEntries.length),
    1
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/timesheets')}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Timesheets</span>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Timesheet Details</h1>
            <p className="text-muted-foreground">
              View timesheet information and approval status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          {getStatusBadge(timesheet.status)}
          {(timesheet.unsigned_pdf_url || timesheet.signed_pdf_url) && (
            <Button variant="outline" onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Notice */}
      {timesheet.status === TimesheetStatus.REJECTED && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Timesheet Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              This timesheet has been rejected. 
              {timesheet.company_notes && (
                <span> Company notes: {timesheet.company_notes}</span>
              )}
              {timesheet.manager_notes && (
                <span> Manager notes: {timesheet.manager_notes}</span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approval Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Client Approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timesheet.company_approved_at ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Approved</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(timesheet.company_approved_at), 'MMMM d, yyyy at h:mm a')}
                </p>
                {timesheet.company_signature && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Client Signature:</p>
                    <div className="relative w-full h-32">
                      <Image
                        src={timesheet.company_signature}
                        alt="Client Signature"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-700">Pending</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manager Approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manager Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timesheet.manager_approved_at ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Approved</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(timesheet.manager_approved_at), 'MMMM d, yyyy at h:mm a')}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-700">Pending</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shift Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shift Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Job</Label>
              <p className="font-medium">{shift.job.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Client</Label>
              <p className="font-medium">{shift.job.company.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(shift.date), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Crew Chief</Label>
              <p className="font-medium">{shift.assignedPersonnel.find(p => p.roleCode === 'CC')?.user.name || 'Not Assigned'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Time</Label>
              <p className="font-medium">{formatTime(shift.startTime?.toISOString())} - {formatTime(shift.endTime?.toISOString())}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
              <p className="font-medium">{shift.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Worker Time Entries
          </CardTitle>
          <CardDescription>
            Complete record of all worker time entries for this shift
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white">Worker</TableHead>
                <TableHead>Role</TableHead>
                {Array.from({ length: maxEntries }, (_, i) => (
                  <React.Fragment key={i}>
                    <TableHead>Time In {i + 1}</TableHead>
                    <TableHead>Time Out {i + 1}</TableHead>
                  </React.Fragment>
                ))}
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedPersonnel.map((worker) => {
                const totalHours = worker.timeEntries.reduce((sum, entry) =>
                  sum + calculateHours(entry.clockIn, entry.clockOut), 0
                );
                
                return (
                  <TableRow key={worker.id}>
                    <TableCell className="sticky left-0 bg-white">
                      <div className="flex items-center gap-3">
                        <div 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/employees/${worker.user.id}`;
                          }}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={worker.user.avatarUrl} />
                            <AvatarFallback>
                              {worker.user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="font-medium truncate">{worker.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{worker.roleCode}</Badge>
                    </TableCell>
                    {Array.from({ length: maxEntries }, (_, i) => {
                      const entry = worker.timeEntries.find(e => e.entryNumber === i + 1);
                      return (
                        <React.Fragment key={i}>
                          <TableCell>{formatTime(entry?.clockIn)}</TableCell>
                          <TableCell>{formatTime(entry?.clockOut)}</TableCell>
                        </React.Fragment>
                      )
                    })}
                    <TableCell className="font-medium">
                      {totalHours.toFixed(2)} hrs
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
