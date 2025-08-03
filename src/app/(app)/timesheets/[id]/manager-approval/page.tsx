'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Building2, Calendar, CheckCircle, Clock, FileSignature, MapPin, User, Shield, Download } from 'lucide-react'
import { formatTimeTo12Hour, calculateTotalRoundedHours, formatDate, getTimeEntryDisplay } from "@/lib/time-utils"
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
}

interface AssignedPersonnel {
  employee: {
    id: string
    name: string
  }
  roleOnShift: string
  timeEntries: TimeEntry[]
}

interface TimesheetData {
  timesheet: {
    id: string
    status: string
    clientApprovedAt: string
    clientSignature?: string
    managerApprovedAt?: string
    managerSignature?: string
  }
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string
    location: string
    jobName: string
    clientName: string
    crewChief?: {
      name: string
    }
    assignedPersonnel: AssignedPersonnel[]
  }
  client: {
    name: string
  }
  job: {
    name: string
  }
}

export default function ManagerApprovalPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const timesheetId = params.id as string

  const [data, setData] = useState<TimesheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')

  // Check if user is manager
  const isManager = session?.user?.role === 'Admin'

  const fetchTimesheetData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/timesheets/${timesheetId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch timesheet data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimesheetData()
  }, [timesheetId])

  const calculateTotalHours = (timeEntries: { clockIn?: string; clockOut?: string }[]) => {
    return calculateTotalRoundedHours(timeEntries);
  }

  const handleManagerApproval = async () => {
    try {
      setSubmitting(true)

      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalType: 'manager',
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve timesheet')
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: "Timesheet has been approved successfully.",
      })

      // Refresh the data
      await fetchTimesheetData()

      // Redirect to timesheets list after a short delay
      setTimeout(() => {
        router.push('/timesheets')
      }, 2000)

    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to approve timesheet',
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
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

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Timesheet not found</div>
      </div>
    )
  }

  const { timesheet, shift, client, job } = data

  // Check if user has permission
  if (!isManager) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-muted-foreground">Only managers can access the final approval page.</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check timesheet status
  if (timesheet.status !== 'PENDING_MANAGER_APPROVAL') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Timesheet Not Pending Final Approval</h3>
              <p className="text-muted-foreground">
                This timesheet is currently in "{timesheet.status}" status and does not require final approval.
              </p>
              <Button onClick={() => router.push('/timesheets')}>View All Timesheets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Manager Final Approval</h1>
            <p className="text-muted-foreground">Review and provide final approval for this timesheet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Manager Only
          </Badge>
        </div>
      </div>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Timesheet Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-6">
            <div className="space-y-1">
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{client?.name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium">{shift?.location || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Shift Date</p>
              <p className="font-medium">{formatDate(shift?.date)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Start Time</p>
              <p className="font-medium">{formatTimeTo12Hour(shift?.startTime)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Crew Chief</p>
              <p className="font-medium">{shift?.crewChief?.name || 'Not Assigned'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Job</p>
              <p className="font-medium">{job?.name || shift?.jobName || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Client Approved</p>
              <p className="font-medium text-green-600">
                {timesheet.clientApprovedAt ? formatDate(timesheet.clientApprovedAt) : 'Not yet approved'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Signature Display */}
      {timesheet.clientSignature && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Client Signature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="relative w-full h-32">
                <Image 
                  src={timesheet.clientSignature} 
                  alt="Client Signature" 
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-contain"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Approved on {formatDate(timesheet.clientApprovedAt)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Employee Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shift?.assignedPersonnel?.filter((p: any) => p.timeEntries.length > 0).map((person: any) => {
                // Sort time entries by entry number
                const sortedEntries = person.timeEntries.sort((a: any, b: any) => (a.entryNumber || 1) - (b.entryNumber || 1));
                
                return (
                  <TableRow key={person.employee.id}>
                    <TableCell className="font-medium">{person.employee.name}</TableCell>
                    <TableCell>{person.roleOnShift}</TableCell>
                    <TableCell>
                      {sortedEntries.map((entry: any, index: number) => {
                        const display = getTimeEntryDisplay(entry.clockIn, entry.clockOut);
                        return (
                          <div key={index} className="text-sm">
                            <span className="text-xs text-muted-foreground">#{entry.entryNumber || index + 1}: </span>
                            {display.displayClockIn}
                            {index < sortedEntries.length - 1 && <br />}
                          </div>
                        );
                      })}
                    </TableCell>
                    <TableCell>
                      {sortedEntries.map((entry: any, index: number) => {
                        const display = getTimeEntryDisplay(entry.clockIn, entry.clockOut);
                        return (
                          <div key={index} className="text-sm">
                            <span className="text-xs text-muted-foreground">#{entry.entryNumber || index + 1}: </span>
                            {display.displayClockOut}
                            {index < sortedEntries.length - 1 && <br />}
                          </div>
                        );
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">{calculateTotalHours(sortedEntries)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2 font-semibold bg-muted/50">
                <TableCell colSpan={4} className="text-right">Total Hours:</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const allTimeEntries = shift?.assignedPersonnel
                      ?.filter((p: any) => p.timeEntries.length > 0)
                      .flatMap((p: any) => p.timeEntries) || [];
                    return calculateTotalHours(allTimeEntries);
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Download Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unsigned Downloads */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Unsigned Timesheet</h4>
              <div className="flex flex-col gap-2">
                <Button variant="outline" asChild size="sm">
                  <a href={`/api/timesheets/${timesheetId}/excel?signed=false`} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </a>
                </Button>
                <Button variant="outline" asChild size="sm">
                  <a href={`/api/timesheets/${timesheetId}/pdf?signed=false`} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </div>
            </div>

            {/* Signed Downloads (after client signature) */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Client Signed Timesheet</h4>
              <div className="flex flex-col gap-2">
                <Button variant="outline" asChild size="sm">
                  <a href={`/api/timesheets/${timesheetId}/excel?signed=true`} download>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Download Signed Excel
                  </a>
                </Button>
                <Button variant="outline" asChild size="sm">
                  <a href={`/api/timesheets/${timesheetId}/pdf?signed=true`} download>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Download Signed PDF
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager Approval Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manager Final Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As a manager, you are providing the final approval for this timesheet. 
              Please review all information above and click approve to complete the approval process.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this approval..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-center">
                <Button 
                  onClick={handleManagerApproval}
                  disabled={submitting}
                  size="lg"
                  className="px-8"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? 'Processing...' : 'Approve Timesheet'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
