"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useTimesheets } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'

import { 
  Clock, 
  Calendar, 
  Building2, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Eye
} from "lucide-react"

export default function PendingTimesheetsPage() {
  const { user } = useUser()
  const router = useRouter()
  
  const { data: timesheetsData, isLoading: loading, error } = useTimesheets({
    select: (data) => data.filter(t => t.status.startsWith('pending'))
  });

  const timesheets = timesheetsData?.timesheets || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Pending Your Approval</Badge>
      case 'pending_manager_approval':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending Manager Approval</Badge>
      case 'completed':
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUserSpecificTimesheets = () => {
    if (user?.role === 'CompanyUser') {
      return timesheets.filter(t => t.status === 'pending_client_approval')
    } else if (user?.role === 'Admin') {
      return timesheets.filter(t => t.status === 'pending_manager_approval')
    }
    return timesheets
  }

  const filteredTimesheets = getUserSpecificTimesheets()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading pending timesheets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading timesheets: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">
            {user?.role === 'CompanyUser' ? 'Timesheets Awaiting Your Approval' : 'Pending Timesheets'}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'CompanyUser' 
              ? 'Review and approve timesheets for your projects'
              : 'Manage timesheet approvals and reviews'
            }
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {user?.role === 'CompanyUser' ? 'Awaiting Your Approval' : 'All Pending Timesheets'}
          </CardTitle>
          <CardDescription>
            {filteredTimesheets.length} timesheet{filteredTimesheets.length !== 1 ? 's' : ''} requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Timesheets</h3>
              <p className="text-muted-foreground">
                {user?.role === 'CompanyUser' 
                  ? 'There are no timesheets waiting for your approval at this time.'
                  : 'All timesheets are up to date.'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Date</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Crew Chief</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((timesheet) => (
                  <TableRow key={timesheet.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(timesheet.shiftDate), 'M/d/yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{timesheet.jobName}</div>
                        <div className="text-sm text-muted-foreground">{timesheet.location}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {timesheet.clientName}
                      </div>
                    </TableCell>
                    <TableCell>{timesheet.crewChiefName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {timesheet.workerCount} workers
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(timesheet.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(timesheet.submittedAt), 'MMM d, yyyy')}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(timesheet.submittedAt), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        <Link href={`/timesheets/${timesheet.id}/review`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Link>
                      </Button>
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
