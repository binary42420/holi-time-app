"use client"

import React from "react"

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = 'force-dynamic'
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useTimesheets } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'

import { 
  ArrowLeft, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Building2,
  Users,
  Eye,
  Check,
  X,
  Download
} from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

import { UserRole, TimesheetStatus } from '@prisma/client';
import { withAuth } from "@/lib/withAuth";
import { TimesheetDetails } from "@/lib/types";

function AdminTimesheetsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: timesheets = [], isLoading: loading, error, refetch } = useTimesheets()

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }


  const getStatusBadge = (status: TimesheetStatus) => {
    const variants: Record<TimesheetStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [TimesheetStatus.DRAFT]: 'outline',
      [TimesheetStatus.PENDING_COMPANY_APPROVAL]: 'default',
      [TimesheetStatus.PENDING_MANAGER_APPROVAL]: 'default',
      [TimesheetStatus.COMPLETED]: 'secondary',
      [TimesheetStatus.REJECTED]: 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const handleApprove = async (timesheetId: string) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve timesheet')
      }

      toast({
        title: "Timesheet Approved",
        description: "The timesheet has been approved successfully.",
      })

      await refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve timesheet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (timesheetId: string) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reject' }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject timesheet')
      }

      toast({
        title: "Timesheet Rejected",
        description: "The timesheet has been rejected and sent back for revision.",
      })

      await refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject timesheet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const pendingApproval = timesheets.filter(t => t.status === TimesheetStatus.PENDING_MANAGER_APPROVAL).length
  const awaitingClient = timesheets.filter(t => t.status === TimesheetStatus.PENDING_COMPANY_APPROVAL).length
  const approved = timesheets.filter(t => t.status === TimesheetStatus.COMPLETED).length
  const overdue = timesheets.filter(t => {
    const submittedDate = new Date(t.submittedAt || t.createdAt)
    const daysSinceSubmitted = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceSubmitted > 3 && t.status !== TimesheetStatus.COMPLETED
  }).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Timesheet Management</h1>
          <p className="text-muted-foreground">Review and approve timesheets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/timesheets')}>
            Pending Approvals
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/timesheets/reports')}>
            Reports
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApproval}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Client</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{awaitingClient}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdue}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Timesheets
          </CardTitle>
          <CardDescription>
            Manage all timesheets in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading timesheets...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Error loading timesheets: {error.message}</div>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Timesheets Found</h3>
              <p className="text-muted-foreground">
                Timesheets will appear here once shifts are completed.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Date</TableHead>
                  <TableHead>Job & Client</TableHead>
                  <TableHead>Crew Chief</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map((timesheet: TimesheetDetails) => (
                  <TableRow
                    key={timesheet.id}
                    onClick={() => router.push(`/timesheets/${timesheet.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {timesheet.shift?.date ? format(new Date(timesheet.shift.date), 'MMM d, yyyy') : 'No date'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {timesheet.shift?.startTime && timesheet.shift?.endTime ? 
                              `${format(new Date(timesheet.shift.startTime), 'p')} - ${format(new Date(timesheet.shift.endTime), 'p')}` : 
                              'No time'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{timesheet.shift?.job?.name || 'Unknown Job'}</div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {timesheet.shift?.job?.company?.name || 'Unknown Company'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{timesheet.shift?.assignedPersonnel?.find(p => p.user.role === UserRole.CrewChief)?.user.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {timesheet.shift?.assignedPersonnel?.filter(p => p.user).length || 0}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(timesheet.status)}</TableCell>
                    <TableCell>
                      {timesheet.submittedAt ? format(new Date(timesheet.submittedAt), 'MMM d') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/timesheets/${timesheet.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {timesheet.status === TimesheetStatus.PENDING_MANAGER_APPROVAL && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(timesheet.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(timesheet.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {timesheet.status === TimesheetStatus.COMPLETED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const type = timesheet.signed_pdf_url ? 'signed' : 'unsigned';
                                const response = await fetch(`/api/timesheets/${timesheet.id}/pdf?type=${type}`)
                                if (response.ok) {
                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `timesheet-${timesheet.shift?.job?.name?.replace(/\s+/g, '-') || 'unknown'}-${timesheet.shift?.date ? format(new Date(timesheet.shift.date), 'yyyy-MM-dd') : 'unknown'}.pdf`
                                  document.body.appendChild(a)
                                  a.click()
                                  window.URL.revokeObjectURL(url)
                                  document.body.removeChild(a)
                                }
                              } catch (err) {
                                const error = err as Error;
                                console.error('Error downloading PDF:', error.message)
                                toast({
                                  title: "Error",
                                  description: `Failed to download PDF: ${error.message}`,
                                  variant: "destructive",
                                })
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(AdminTimesheetsPage, 'Admin');
