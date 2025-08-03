"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCompany, useCompanies, useJobs, useShifts } from "@/hooks/use-api"
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CompanyAvatar } from "@/components/CompanyAvatar"
import { CompanyAvatarUploader } from "@/components/admin/company-avatar-uploader"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Phone, Mail, MapPin, Briefcase, Plus, Calendar, Users, AlertCircle, RefreshCw, Clock, CheckCircle, XCircle, UserCheck, UserX, TrendingUp, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { ShiftStatus } from "@prisma/client"
import { getAssignedWorkerCount, getTotalRequiredWorkers } from "@/lib/worker-count-utils"

// Helper functions for status indicators
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

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const { id: companyId } = params
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const canEdit = user?.role === 'Admin'

  const queryClient = useQueryClient();

  const { data: company, isLoading: singleCompanyLoading, isError: singleCompanyError, refetch: refetchCompany } = useCompany(companyId);
  const { data: jobs, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useJobs({ companyId });
  const { data: shifts, isLoading: shiftsLoading, isError: shiftsError, refetch: refetchShifts } = useShifts({ companyId });

  const isLoading = singleCompanyLoading || jobsLoading || shiftsLoading;
  const hasError = singleCompanyError || jobsError || shiftsError;

  // Process data for enhanced display
  const recentJobs = jobs?.slice(0, 10) || []
  const recentShifts = shifts?.slice(0, 20) || []
  const upcomingShifts = shifts?.filter((shift: any) => new Date(shift.date) >= new Date()).slice(0, 10) || []
  const completedShifts = shifts?.filter((shift: any) => shift.status === 'Completed') || []
  
  // Calculate statistics
  const totalShifts = shifts?.length || 0
  const completedShiftsCount = completedShifts.length
  const completionRate = totalShifts > 0 ? (completedShiftsCount / totalShifts) * 100 : 0
  
  const activeJobs = jobs?.filter((job: any) => job.status === 'Active') || []
  const totalJobs = jobs?.length || 0

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

  if (hasError || !company) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!company ? 'Company not found' : 'Error loading company data'}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchCompany();
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
            onClick={() => router.push('/companies')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
        </div>
        {canEdit && (
          <Button
            onClick={() => router.push(`/admin/companies/${company.id}/edit`)}
            className="flex items-center gap-2"
          >
            Edit Company
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Company Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <CompanyAvatar
                  src={company.company_logo_url}
                  name={company.name}
                  className="h-16 w-16"
                />
                <div className="flex-1">
                  <CardTitle className="text-2xl">{company.name}</CardTitle>
                  <CardDescription className="text-base">
                    {company.address || 'No address provided'}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={company.isActive ? "default" : "secondary"}>
                      {company.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {completionRate.toFixed(0)}% completion rate
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            {canEdit && (
              <CardContent>
                <CompanyAvatarUploader
                  companyId={company.id}
                  currentLogoUrl={company.company_logo_url}
                  onUploadSuccess={(newLogoUrl) => {
                    queryClient.setQueryData(['company', companyId], (oldCompany: any) => {
                      if (oldCompany) {
                        return { ...oldCompany, company_logo_url: newLogoUrl };
                      }
                      return oldCompany;
                    });
                    queryClient.setQueryData(['companies'], (oldCompanies: any) => {
                      if (oldCompanies) {
                        return oldCompanies.map((comp: any) =>
                          comp.id === companyId ? { ...comp, company_logo_url: newLogoUrl } : comp
                        );
                      }
                      return oldCompanies;
                    });
                  }}
                />
              </CardContent>
            )}
            {company.description && (
              <CardContent>
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{company.description}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{company.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{company.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{company.address || 'N/A'}</p>
                  </div>
                </div>
                {company.website && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Tabs Section */}
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Jobs ({totalJobs})
              </TabsTrigger>
              <TabsTrigger value="shifts" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Recent Shifts ({recentShifts.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming ({upcomingShifts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Recent Jobs
                    </CardTitle>
                    {canEdit && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/admin/jobs/new?companyId=${company.id}`)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        New Job
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {recentJobs.length > 0 ? (
                    <div className="space-y-4">
                      {recentJobs.map((job: any) => (
                        <Card 
                          key={job.id} 
                          className="cursor-pointer hover:bg-accent/50 transition-colors" 
                          onClick={() => router.push(`/jobs/${job.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold">{job.name}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{job.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{job.startDate ? new Date(job.startDate).toLocaleDateString() : 'No start date'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{job.shiftsCount || 0} shifts</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{job.location || 'No location'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={job.status === 'Active' ? 'default' : 'secondary'}>
                                  {job.status}
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
                      <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Jobs Yet</h3>
                      <p className="text-muted-foreground text-center mb-4">This client doesn't have any jobs assigned yet.</p>
                      {canEdit && (
                        <Button 
                          onClick={() => router.push(`/admin/jobs/new?companyId=${company.id}`)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Create First Job
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shifts" className="space-y-4">
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
                                  <h4 className="font-semibold">{shift.job ? shift.job.name : 'No Job Assigned'}</h4>
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
                                    {(() => {
                                      const assigned = getAssignedWorkerCount(shift);
                                      const total = getTotalRequiredWorkers(shift);
                                      return (
                                        <>
                                          {getAssignmentStatusIcon(assigned, total)}
                                          <span className={getAssignmentStatusColor(assigned, total)}>
                                            {assigned}/{total} workers
                                          </span>
                                        </>
                                      );
                                    })()}
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
                      <p className="text-muted-foreground text-center">This client doesn't have any recent shifts.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
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
                                  <h4 className="font-semibold">{shift.job ? shift.job.name : 'No Job Assigned'}</h4>
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
                                    {(() => {
                                      const assigned = getAssignedWorkerCount(shift);
                                      const total = getTotalRequiredWorkers(shift);
                                      return (
                                        <>
                                          {getAssignmentStatusIcon(assigned, total)}
                                          <span className={getAssignmentStatusColor(assigned, total)}>
                                            {assigned}/{total} workers assigned
                                          </span>
                                        </>
                                      );
                                    })()}
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
                      <p className="text-muted-foreground text-center">This client doesn't have any upcoming shifts scheduled.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Enhanced Sidebar */}
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
                  <span className="text-sm">Total Jobs</span>
                  <Badge variant="outline">{totalJobs}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Jobs</span>
                  <Badge variant="default">{activeJobs.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Shifts</span>
                  <Badge variant="outline">{totalShifts}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed</span>
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
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Active Jobs</p>
                    <p className="text-xs text-muted-foreground">{activeJobs.length} in progress</p>
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
