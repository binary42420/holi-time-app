"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useJobs, useShifts } from "@/hooks/use-api"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Briefcase, Calendar, Users, Clock, MapPin, Plus, AlertCircle, RefreshCw, TrendingUp, Activity, UserCheck, UserX } from "lucide-react"
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager"
import { DangerZone } from "@/components/danger-zone"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShiftStatus } from "@prisma/client"
import { getAssignedWorkerCount, getTotalRequiredWorkers } from "@/lib/worker-count-utils"

// Helper functions for status indicators (copied from companies/[id]/page.tsx for consistency)
const getShiftStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-green-500'
    case 'in_progress': return 'bg-blue-500'
    case 'scheduled': return 'bg-yellow-500'
    case 'cancelled': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

const getShiftStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'default'
    case 'in_progress': return 'secondary'
    case 'scheduled': return 'outline'
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

const getAssignmentStatusColor = (assignedCount: number, requiredCount: number) => {
  const percentage = requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 0
  if (percentage >= 100) return 'text-green-600'
  if (percentage >= 75) return 'text-yellow-600'
  if (percentage >= 50) return 'text-orange-600'
  return 'text-red-600'
}

const getAssignmentStatusIcon = (assignedCount: number, requiredCount: number) => {
  const percentage = requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 0
  if (percentage >= 100) return <UserCheck className="h-4 w-4 text-green-600" />
  if (percentage >= 50) return <Users className="h-4 w-4 text-yellow-600" />
  return <UserX className="h-4 w-4 text-red-600" />
}

interface JobDetailPageProps {
  params: { id: string }
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id: jobId } = params
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Admin'
  
  const { data: jobs, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useJobs()
  const { data: shifts, isLoading: shiftsLoading, isError: shiftsError, refetch: refetchShifts } = useShifts({ jobId });

  const job = jobs?.find(j => j.id === jobId)

  const isLoading = jobsLoading || shiftsLoading;
  const hasError = jobsError || shiftsError;

  // Process data for enhanced display
  const recentShifts = shifts?.slice(0, 20) || []
  const upcomingShifts = shifts?.filter((shift: any) => new Date(shift.date) >= new Date()).slice(0, 10) || []
  const completedShifts = shifts?.filter((shift: any) => shift.status === 'Completed') || []
  
  // Calculate statistics
  const totalShifts = shifts?.length || 0
  const completedShiftsCount = completedShifts.length
  const completionRate = totalShifts > 0 ? (completedShiftsCount / totalShifts) * 100 : 0

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (hasError || !job) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!job ? 'Job not found' : 'Error loading job data'}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchJobs();
                  refetchShifts();
                }}
                className="mt-2 w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/jobs')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
        {canEdit && (
          <Button
            onClick={() => router.push(`/jobs/${job.id}/edit`)}
            className="flex items-center gap-2"
          >
            Edit Job
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Job Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Briefcase className="h-16 w-16 text-muted-foreground" />
                <div className="flex-1">
                  <CardTitle className="text-2xl">{job.name}</CardTitle>
                  <CardDescription className="text-base">
                    {job.company?.name ? `for ${job.company.name}` : 'No company assigned'}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={job.status === 'Active' ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {completionRate.toFixed(0)}% shift completion
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            {job.description && (
              <CardContent>
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{job.description}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{job.location || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-muted-foreground">{job.startDate ? format(new Date(job.startDate), 'MMM d, yyyy') : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-sm text-muted-foreground">{job.endDate ? format(new Date(job.endDate), 'MMM d, yyyy') : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Shifts</p>
                    <p className="text-sm text-muted-foreground">{totalShifts}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Tabs Section */}
          <Tabs defaultValue="recentShifts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recentShifts" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Recent Shifts ({recentShifts.length})
              </TabsTrigger>
              <TabsTrigger value="upcomingShifts" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Shifts ({upcomingShifts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recentShifts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recent Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentShifts.length > 0 ? (
                    <div className="space-y-4">
                      {recentShifts.map((shift: any) => (
                        <Card 
                          key={shift.id} 
                          className="cursor-pointer hover:bg-accent/50 transition-colors" 
                          onClick={() => router.push(`/shifts/${shift.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-3 h-3 rounded-full ${getShiftStatusColor(shift.status)}`} />
                                  <h4 className="font-semibold">{shift.name || 'Unnamed Shift'}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {new Date(shift.date).toLocaleDateString()} • {new Date(shift.startTime).toLocaleTimeString()} - {new Date(shift.endTime).toLocaleTimeString()}
                                </p>
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{shift.location || 'No location'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {getAssignmentStatusIcon(shift.assignedPersonnel?.length || 0, shift.requiredWorkers || 1)}
                                    <span className={getAssignmentStatusColor(shift.assignedPersonnel?.length || 0, shift.requiredWorkers || 1)}>
                                      {shift.assignedPersonnel?.length || 0}/{shift.requiredWorkers || 1} workers
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getShiftStatusBadgeVariant(shift.status)}>
                                  {shift.status}
                                </Badge>
                                <Button variant="outline" size="sm">View</Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Recent Shifts</h3>
                      <p className="text-muted-foreground text-center">This job doesn't have any recent shifts.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcomingShifts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Upcoming Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingShifts.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingShifts.map((shift: any) => (
                        <Card
                          key={shift.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-blue-500"
                          onClick={() => router.push(`/shifts/${shift.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-semibold">{shift.name || 'Unnamed Shift'}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {new Date(shift.date).toLocaleDateString()} • {new Date(shift.startTime).toLocaleTimeString()} - {new Date(shift.endTime).toLocaleTimeString()}
                                </p>
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{shift.location || 'No location'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {getAssignmentStatusIcon(shift.assignedPersonnel?.length || 0, shift.requiredWorkers || 1)}
                                    <span className={getAssignmentStatusColor(shift.assignedPersonnel?.length || 0, shift.requiredWorkers || 1)}>
                                      {shift.assignedPersonnel?.length || 0}/{shift.requiredWorkers || 1} workers assigned
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    <span>{Math.ceil((new Date(shift.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days away</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-blue-500 text-blue-600">
                                  Scheduled
                                </Badge>
                                <Button variant="outline" size="sm">View</Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Upcoming Shifts</h3>
                      <p className="text-muted-foreground text-center">This job doesn't have any upcoming shifts scheduled.</p>
                      {canEdit && (
                        <Button
                          onClick={() => router.push(`/jobs/${job.id}/shifts/new`)}
                          className="flex items-center gap-2 mt-4"
                        >
                          <Plus className="h-4 w-4" />
                          Schedule First Shift
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {canEdit && job && (
            <>
              <CrewChiefPermissionManager
                targetId={job.id}
                targetType="job"
                targetName={job.name}
              />
              <DangerZone
                entityType="job"
                entityId={job.id}
                entityName={job.name}
                redirectTo="/admin/jobs"
              />
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Shifts</span>
                  <Badge variant="outline">{totalShifts}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed Shifts</span>
                  <Badge variant="secondary">{completedShiftsCount}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Completion Rate</span>
                    <span className="font-medium">{completionRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Completed Shifts</p>
                    <p className="text-xs text-muted-foreground">{completedShiftsCount} shifts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Upcoming Shifts</p>
                    <p className="text-xs text-muted-foreground">{upcomingShifts.length} scheduled</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
