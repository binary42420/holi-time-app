"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday, differenceInDays } from "date-fns"
import { useUser } from "@/hooks/use-user"
import { useJobs, useCompanies } from "@/hooks/use-api"
import { useEnhancedPerformance } from "@/hooks/use-enhanced-performance"
import { useCacheManagement } from "@/hooks/use-cache-management"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Building,
  Building2,
  AlertCircle,
  RefreshCw,
  Calendar as CalendarIcon,
  Briefcase,
  FileText,
  Eye,
  ExternalLink,
  MoreHorizontal
} from "lucide-react"
import { CompanyAvatar } from "@/components/CompanyAvatar"
import { UnifiedStatusBadge, getFulfillmentStatus, getPriorityBadge } from "@/components/ui/unified-status-badge"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import Link from 'next/link'

import { calculateShiftRequirements, calculateAssignedWorkers } from "@/lib/worker-count-utils"
import { getShiftStatus, getShiftStatusDisplay } from '@/lib/shift-status';
import { UserRole, JobStatus } from '@prisma/client'

// Update the date and time formatting functions
const formatSimpleDate = (date: string | Date) => {
  return format(new Date(date), 'MM/dd/yyyy')
}

const formatSimpleTime = (time: string | Date) => {
  return format(new Date(time), 'hh:mm a')
}

export default function JobsShiftsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { smartPrefetch, prefetchForPage } = useEnhancedPerformance()
  const { refreshShifts, isDevelopment } = useCacheManagement()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recentShifts")
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted on client side to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { data: jobsData, isLoading, isError, error, refetch } = useJobs({
    status: statusFilter,
    companyId: companyFilter,
    search: searchTerm,
    sortBy: sortBy,
  })
  const { data: companiesData } = useCompanies()
  const rawJobs = jobsData || []
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

  const canManage = user?.role === 'Admin' || user?.role === 'CrewChief'

  // Performance optimization on mount - must be before conditional returns
  useEffect(() => {
    if (user) {
      smartPrefetch('/jobs-shifts');
    }
  }, [user, smartPrefetch]);

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Please log in to view jobs and shifts.</p>
        </div>
      </main>
    )
  }

  const getDateBadge = (date: string | Date) => {
    const shiftDate = new Date(date)
    if (isToday(shiftDate)) {
      return <Badge className="bg-success text-white border-success text-xs">Today</Badge>
    }
    if (isTomorrow(shiftDate)) {
      return <Badge className="bg-info text-white border-info text-xs">Tomorrow</Badge>
    }
    if (isYesterday(shiftDate)) {
      return <Badge variant="secondary" className="text-xs">Yesterday</Badge>
    }
    return <Badge variant="outline" className="text-xs">{format(shiftDate, 'MMM d')}</Badge>
  }

  const handleJobView = (jobId: string) => {
    prefetchForPage(`/jobs/${jobId}`);
    router.push(`/jobs/${jobId}`)
  }

  const handleJobEdit = (jobId: string) => {
    router.push(`/jobs/${jobId}/edit`)
  }

  const handleJobDelete = async (jobId: string, jobName: string) => {
    if (confirm(`Are you sure you want to delete ${jobName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
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

  const handleShiftClick = (shiftId: string) => {
    prefetchForPage(`/jobs-shifts/${shiftId}`);
    router.push(`/jobs-shifts/${shiftId}`)
  }

  const handleCompanyClick = (companyId: string) => {
    prefetchForPage(`/companies/${companyId}`);
    router.push(`/companies/${companyId}`)
  }

  if (!mounted || isLoading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Jobs & Shifts</h1>
              <p className="text-muted-foreground">Loading job and shift data...</p>
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

  if (isError) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Alert className="max-w-md bg-destructive/20 border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading jobs and shifts: {error?.message || error?.toString() || 'Unknown error'}
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Scheduled Shifts Overview
            </h1>
            <p className="text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} found • Sorted by most recent shift activity
            </p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button onClick={() => router.push('/admin/jobs/new')} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Create New Job
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Filter className="h-5 w-5 text-primary" />
                <span>Filters & Search</span>
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
                <label className="text-sm font-medium text-foreground">Search</label>
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
                <label className="text-sm font-medium text-foreground">Status</label>
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
                <label className="text-sm font-medium text-foreground">Company</label>
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
                <label className="text-sm font-medium text-foreground">Sort By</label>
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

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <CalendarIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <Briefcase className="h-8 w-8 text-blue-400 absolute -top-2 -right-2" />
            </div>
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
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer card-consistent hover:border-primary/30"
                onClick={() => handleJobView(job.id)}
              >
                <CardContent className="p-6">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate text-card-foreground group-hover:text-primary transition-colors">
                          {job.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <CompanyAvatar
                            src={job.company?.company_logo_url}
                            name={job.company?.name || ''}
                            className="w-7 h-7 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                          />
                          <Link
                            href={`/companies/${job.company?.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompanyClick(job.company?.id);
                            }}
                            className="text-sm text-primary hover:text-primary/80 truncate transition-colors flex items-center gap-1"
                          >
                            {job.company?.name}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-3">
                        <UnifiedStatusBadge status={job.status} size="sm" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0 interactive-hover">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleJobView(job.id); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleJobEdit(job.id); }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Job
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleJobDelete(job.id, job.name); }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Job
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="space-y-2 bg-surface rounded-lg p-3 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-secondary-consistent">
                          <Building2 className="h-4 w-4 mr-2 text-primary" />
                          <span>{job.company?.name}</span>
                        </div>
                        <Link
                          href={`/companies/${job.company?.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompanyClick(job.company?.id);
                          }}
                          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                        >
                          View Company
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-secondary-consistent">
                          <Briefcase className="h-4 w-4 mr-2 text-info" />
                          <span>Job ID: {job.id.slice(-8)}</span>
                        </div>
                        <div className="text-xs text-muted-consistent">
                          Created: {format(new Date(job.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    {/* Recent Shifts Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                          <Calendar className="h-4 w-4 text-success" />
                          Recent Shifts
                        </div>
                        <Badge variant="outline" className="text-xs bg-slate-800/50 border-slate-600/50">
                          {job.recentShifts?.length || 0} total
                        </Badge>
                      </div>
                      
                      {job.recentShifts?.slice(0, 3).map(shift => {
                        const required = calculateShiftRequirements(shift);
                        const assigned = calculateAssignedWorkers(shift);
                        const fulfillmentStatus = getFulfillmentStatus(assigned, required);
                        const daysUntil = differenceInDays(new Date(shift.date), new Date());
                        const priorityStatus = getPriorityBadge(daysUntil);
                        
                        // Get actual shift status based on timing and completion
                        const shiftStatus = getShiftStatus(shift);
                        const displayStatus = getShiftStatusDisplay(shiftStatus);
                        
                        const isCompleted = shiftStatus.isCompleted;
                        const hasTimesheet = shift.timesheets && shift.timesheets.length > 0;
                        const timesheet = hasTimesheet ? shift.timesheets[0] : null;
                        
                        return (
                          <Link 
                            href={`/jobs-shifts/${shift.id}`} 
                            key={shift.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShiftClick(shift.id);
                            }}
                            className={`block p-4 rounded-lg border transition-all hover:shadow-lg group/shift ${
                              shiftStatus.isLive
                                ? 'bg-error/10 border-error/40 hover:border-error/60 hover:shadow-error/20'
                                : isCompleted 
                                ? 'bg-success/10 border-success/40 hover:border-success/60 hover:shadow-success/20' 
                                : 'bg-surface border-border hover:border-primary/30 hover:shadow-primary/10'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Shift Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center text-sm text-secondary-consistent">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="font-medium">{formatSimpleDate(shift.date)}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-secondary-consistent">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span>{formatSimpleTime(shift.startTime)} - {formatSimpleTime(shift.endTime)}</span>
                                  </div>
                                  {shift.location && (
                                    <div className="flex items-center text-sm text-secondary-consistent">
                                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
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
                              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                <div className="flex items-center text-sm gap-2">
                                  <Users className="h-4 w-4 text-primary" />
                                  <span className="text-secondary-consistent font-medium">
                                    {assigned} of {required} Workers
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {isCompleted && hasTimesheet ? (
                                    <Link
                                      href={`/timesheets/${timesheet.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-success/80 border border-success rounded-md hover:bg-success transition-colors"
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
                                  <ExternalLink className="h-3 w-3 text-muted-foreground group-hover/shift:text-foreground transition-colors" />
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      
                      {(!job.recentShifts || job.recentShifts.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-surface/50 rounded-lg border border-dashed border-border/50">
                          <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                          <div className="text-sm text-foreground">No recent shifts</div>
                          <div className="text-xs text-muted-foreground">Shifts will appear here once scheduled</div>
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