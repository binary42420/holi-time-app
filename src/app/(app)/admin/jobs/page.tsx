"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useJobs, useCompanies } from "@/hooks/use-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Plus, Briefcase, AlertCircle, RefreshCw, Filter, Search, Clock, MapPin, FileText, Eye, Edit, Trash2, MoreHorizontal, Users, CheckCircle, Calendar, Building2 } from "lucide-react";
import { withAuth } from "@/lib/withAuth";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { UserRole, JobStatus } from '@prisma/client'
import { TimesheetApprovalButton } from '@/components/timesheet-approval-button';

import { Job } from "@/lib/types"

import { calculateShiftRequirements, calculateAssignedWorkers } from "@/lib/worker-count-utils"
import { getShiftStatus, getShiftStatusDisplay } from '@/lib/shift-status';
import { UnifiedStatusBadge, getFulfillmentStatus, getPriorityBadge } from '@/components/ui/unified-status-badge';
import { differenceInDays, format, isToday, isTomorrow, isYesterday } from 'date-fns';

import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import Link from 'next/link'

function AdminJobsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("recentShifts")

  const { data: jobsData, isLoading: loading, error, refetch } = useJobs({
    status: statusFilter,
    companyId: companyFilter,
    search: searchTerm,
    sortBy: sortBy,
  })
  const { data: companiesData } = useCompanies()
  
  const rawJobs = React.useMemo(() => jobsData || [], [jobsData])
  const companies = companiesData?.companies || []

  // Enhanced sorting: sort jobs by their most recent shift date (most recent first)
  const jobs = React.useMemo(() => {
    return [...rawJobs].sort((a, b) => {
      const getMostRecentShiftDate = (job: any) => {
        if (!job.recentShifts || job.recentShifts.length === 0) return new Date(0);
        return new Date(Math.max(...job.recentShifts.map((shift: any) => new Date(shift.date).getTime())));
      };
      
      const dateA = getMostRecentShiftDate(a);
      const dateB = getMostRecentShiftDate(b);
      
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });
  }, [rawJobs]);

  console.log('Jobs data:', jobs);

  // Helper function for shift date badges (matching shifts page style)
  const getDateBadge = (date: string | Date) => {
    const shiftDate = new Date(date)
    if (isToday(shiftDate)) {
      return <Badge variant="default" className="bg-blue-600 text-white text-xs">Today</Badge>
    }
    if (isTomorrow(shiftDate)) {
      return <Badge variant="default" className="bg-green-600 text-white text-xs">Tomorrow</Badge>
    }
    if (isYesterday(shiftDate)) {
      return <Badge variant="secondary" className="text-xs">Yesterday</Badge>
    }
    return <Badge variant="outline" className="text-xs">{format(shiftDate, 'MMM d')}</Badge>
  }

  // Helper function for time formatting (matching shifts page)
  const formatSimpleTime = (time: string | Date) => {
    return format(new Date(time), 'hh:mm a')
  }

  const formatSimpleDate = (date: string | Date) => {
    return format(new Date(date), 'MM/dd/yyyy')
  }

  // Helper function to convert days until shift to priority level
  const getDaysPriority = (daysUntil: number): 'high' | 'medium' | 'low' => {
    if (daysUntil < 0) return 'high'; // Past due
    if (daysUntil <= 1) return 'high'; // Today or tomorrow
    if (daysUntil <= 3) return 'medium'; // Within 3 days
    return 'low'; // More than 3 days away
  }

  const handleJobView = (jobId: string) => {
    router.push(`/jobs-shifts?jobId=${jobId}`)
  }

  const handleJobEdit = (jobId: string) => {
    router.push(`/admin/jobs/${jobId}/edit`)
  }

  const handleJobDelete = async (jobId: string, jobName: string) => {
    if (confirm(`Are you sure you want to delete ${jobName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          // Refresh the jobs list
          refetch()
        } else {
          throw new Error('Failed to delete job')
        }
      } catch (error) {
        console.error('Error deleting job:', error)
        alert('Failed to delete job. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Manage Jobs</h1>
              <p className="text-muted-foreground">Loading job data...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Alert className="max-w-md bg-destructive/20 border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading jobs: {error?.message || error?.toString() || 'Unknown error'}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="mt-2 w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Manage Jobs</h1>
              <p className="text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? 's' : ''} found</p>
            </div>
            <Button onClick={() => router.push('/admin/jobs/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Job
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Sorting
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setCompanyFilter("all")
                    setSortBy("recentShifts")
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs or clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.values(JobStatus).map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recentShifts">Recent Shifts</SelectItem>
                      <SelectItem value="createdAt">Date Created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No jobs found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || statusFilter !== 'all' || companyFilter !== 'all' 
                  ? "Try adjusting your filters to see more jobs."
                  : "No jobs have been created yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleJobView(job.id)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-lg">{job.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <CompanyAvatar
                              src={job.company?.company_logo_url}
                              name={job.company?.name || ''}
                              className="w-6 h-6"
                            />
                            <p className="text-sm text-muted-foreground truncate">{job.company?.name}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-3">
                          <UnifiedStatusBadge status={job.status} size="sm" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleJobView(job.id); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleJobEdit(job.id); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleJobDelete(job.id, job.name); }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Job Details */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-300">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{job.company?.name}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-300">
                          <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                          <span>Job ID: {job.id.slice(-8)}</span>
                        </div>
                      </div>

                      {/* Recent Shifts Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                          <Calendar className="h-4 w-4" />
                          Recent Shifts ({job.recentShifts?.length || 0})
                        </div>
                        {job.recentShifts?.slice(0, 3).map(shift => {
                          const required = calculateShiftRequirements(shift);
                          const assigned = calculateAssignedWorkers(shift);
                          const fulfillmentStatus = getFulfillmentStatus(assigned, required);
                          const daysUntil = differenceInDays(new Date(shift.date), new Date());
                          const priorityStatus = getPriorityBadge(getDaysPriority(daysUntil));
                          
                          // Get actual shift status based on timing and completion
                          const shiftStatus = getShiftStatus(shift);
                          const displayStatus = getShiftStatusDisplay(shiftStatus);
                          
                          const isCompleted = shiftStatus.isCompleted;
                          const hasTimesheet = shift.timesheets && shift.timesheets.length > 0;
                          const timesheet = hasTimesheet ? shift.timesheets[0] : null;
                          
                          return (
                            <Link 
                              href={`/shifts/${shift.id}`} 
                              key={shift.id} 
                              onClick={(e) => e.stopPropagation()}
                              className={`block p-4 rounded-lg border transition-all hover:shadow-md ${
                                shiftStatus.isLive
                                  ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30 hover:border-red-500/50 ring-1 ring-red-500/20'
                                  : isCompleted 
                                  ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30 hover:border-green-500/50' 
                                  : 'bg-card/50 border-border hover:bg-card/80 hover:border-border/80'
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Shift Header */}
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center text-sm text-gray-300">
                                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                      <span>{formatSimpleDate(shift.date)}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-300 mt-1">
                                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                      <span>{formatSimpleTime(shift.startTime)} - {formatSimpleTime(shift.endTime)}</span>
                                    </div>
                                    {shift.location && (
                                      <div className="flex items-center text-sm text-gray-300 mt-1">
                                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                        <span className="truncate">{shift.location}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1 ml-3">
                                    {getDateBadge(shift.date)}
                                    <UnifiedStatusBadge status={shiftStatus.status} size="sm" />
                                  </div>
                                </div>
                                
                                {/* Shift Details */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center text-sm gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                      {assigned} of {required} Workers
                                    </span>
                                  </div>
                                  
                                  {isCompleted && hasTimesheet ? (
                                    <Link
                                      href={`/timesheets/${timesheet.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-400 bg-green-900/30 border border-green-500/50 rounded-md hover:bg-green-900/50 transition-colors"
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span>Timesheet</span>
                                    </Link>
                                  ) : !isCompleted ? (
                                    <UnifiedStatusBadge 
                                      status={fulfillmentStatus}
                                      count={assigned}
                                      total={required}
                                      showCount
                                      size="sm"
                                    />
                                  ) : null}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                        {(!job.recentShifts || job.recentShifts.length === 0) && (
                          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
                            <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <div className="text-sm text-muted-foreground">No recent shifts</div>
                            <div className="text-xs text-muted-foreground/70">Shifts will appear here once scheduled</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </main>
  )
}

export default withAuth(AdminJobsPage, UserRole.Admin)