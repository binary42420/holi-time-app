'use client';

import { useShifts, useJobs, useTimesheets } from '@/hooks/use-api';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePerformanceMonitor } from '@/components/performance-monitor';
import { useIntelligentPrefetch } from '@/hooks/use-intelligent-prefetch';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Briefcase,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Crown,
  Target,
  Sparkles,
  Zap,
  Settings,
  FileText,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Enhanced3DStatusBadge, EnhancedDateStatusIndicator } from '@/components/enhanced-date-status-indicators';
import { getShiftStatus, getShiftStatusDisplay } from '@/lib/shift-status';
import { Job, Shift } from '@prisma/client';
import { Company } from '@/lib/types';
import { format } from 'date-fns';
import { DashboardPage } from '@/components/DashboardPage';
import { cn } from '@/lib/utils';

type FullJob = Job & {
  company: Company;
  shifts: Shift[];
};

type FullShift = Shift & {
  job: FullJob;
};

// Timesheet Status Badge Component
const TimesheetStatusBadge = ({ status, size = 'sm' }: { status: string | null, size?: 'xs' | 'sm' }) => {
  if (!status) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
        size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
      )}>
        <FileText className={cn(size === 'xs' ? 'h-3 w-3' : 'h-3 w-3')} />
        No Timesheet
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return {
          icon: FileText,
          label: 'Draft',
          className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        };
      case 'PENDING_COMPANY_APPROVAL':
        return {
          icon: Clock,
          label: 'Pending Company',
          className: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
        };
      case 'PENDING_MANAGER_APPROVAL':
        return {
          icon: Clock,
          label: 'Pending Manager',
          className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
        };
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          label: 'Approved',
          className: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          label: 'Rejected',
          className: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        };
      default:
        return {
          icon: FileText,
          label: status,
          className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-1 rounded-full text-xs font-medium",
      config.className,
      size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
    )}>
      <Icon className={cn(size === 'xs' ? 'h-3 w-3' : 'h-3 w-3')} />
      {config.label}
    </div>
  );
};

export default function AdminDashboard() {
  const router = useRouter();
  const [shiftsPage, setShiftsPage] = useState(1);
  const shiftsPerPage = 10;
  
  // Performance monitoring and intelligent prefetching
  const { isVisible, toggle, PerformanceMonitor } = usePerformanceMonitor();
  const { triggerIntelligentPrefetch } = useIntelligentPrefetch();
  
  // Initialize intelligent prefetching for admin dashboard
  useEffect(() => {
    triggerIntelligentPrefetch('/admin');
  }, [triggerIntelligentPrefetch]);
  
  const {
    data: jobs,
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs
  } = useJobs();

  const {
    data: shifts,
    isLoading: shiftsLoading,
    error: shiftsError,
    refetch: refetchShifts
  } = useShifts();

  const {
    data: timesheets,
    isLoading: timesheetsLoading,
    error: timesheetsError,
    refetch: refetchTimesheets
  } = useTimesheets();

  const { totalJobs, activeJobs, recentJobs } = useMemo(() => {
    if (!jobs || !shifts) return { totalJobs: 0, activeJobs: 0, recentJobs: [] };
    
    const total = jobs.length;
    const active = jobs.filter(job => job.status === 'Active').length;
    const recent = jobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map(job => {
        // Get the 3 most recent shifts for this job
        const jobShifts = shifts
          .filter(shift => shift.jobId === job.id)
          .sort((a, b) => {
            const aTime = new Date(`${a.date}T${a.startTime || '00:00'}`);
            const bTime = new Date(`${b.date}T${b.startTime || '00:00'}`);
            return bTime.getTime() - aTime.getTime(); // Most recent first
          })
          .slice(0, 3);
        
        return {
          ...job,
          recentShifts: jobShifts
        };
      });
    
    return {
      totalJobs: total,
      activeJobs: active,
      recentJobs: recent
    };
  }, [jobs, shifts]);

  const { todayShifts, todaysShiftsList, totalPages, paginatedShifts } = useMemo(() => {
    if (!shifts) return { todayShifts: 0, todaysShiftsList: [], totalPages: 0, paginatedShifts: [] };
    
    const now = new Date();
    const past36Hours = new Date(now.getTime() - (36 * 60 * 60 * 1000));
    const future36Hours = new Date(now.getTime() + (36 * 60 * 60 * 1000));
    
    const shiftsIn72HourWindow = shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      const shiftStartTime = shift.startTime ? new Date(shift.startTime) : shiftDate;
      const shiftEndTime = shift.endTime ? new Date(shift.endTime) : shiftDate;
      
      // For future shifts, use start time
      if (shiftStartTime > now) {
        return shiftStartTime <= future36Hours;
      }
      // For past shifts, use end time
      else {
        return shiftEndTime >= past36Hours;
      }
    }).sort((a, b) => {
      // Sort by start time for upcoming shifts, end time for past shifts
      const aTime = a.startTime ? new Date(a.startTime) : new Date(a.date);
      const bTime = b.startTime ? new Date(b.startTime) : new Date(b.date);
      return aTime.getTime() - bTime.getTime();
    });
    
    const totalPages = Math.ceil(shiftsIn72HourWindow.length / shiftsPerPage);
    const startIndex = (shiftsPage - 1) * shiftsPerPage;
    const paginatedShifts = shiftsIn72HourWindow.slice(startIndex, startIndex + shiftsPerPage);
    
    return {
      todayShifts: shiftsIn72HourWindow.length,
      todaysShiftsList: shiftsIn72HourWindow,
      totalPages,
      paginatedShifts
    };
  }, [shifts, shiftsPage, shiftsPerPage]);

  const pendingTimesheets = useMemo(() => {
    if (!timesheets) return [];
    
    return timesheets.filter(timesheet => 
      timesheet.status === 'PENDING_COMPANY_APPROVAL' || 
      timesheet.status === 'PENDING_MANAGER_APPROVAL'
    ).sort((a, b) => {
      // Sort by submission date, most recent first
      const aTime = new Date(a.submittedAt || a.createdAt).getTime();
      const bTime = new Date(b.submittedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [timesheets]);

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  const handleShiftClick = (shiftId: string) => {
    router.push(`/shifts/${shiftId}`);
  };

  const handleTimesheetClick = (timesheetId: string, shiftId: string) => {
    router.push(`/shifts/${shiftId}?tab=timesheet`);
  };

  const getTimesheetForShift = (shiftId: string) => {
    if (!timesheets) return null;
    return timesheets.find(timesheet => timesheet.shiftId === shiftId);
  };

  const handleRefresh = () => {
    refetchJobs();
    refetchShifts();
    refetchTimesheets();
  };

  if (jobsLoading || shiftsLoading || timesheetsLoading) {
    return (
      <DashboardPage title="Admin Dashboard" description="Loading...">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardPage>
    );
  }

  if (jobsError || shiftsError || timesheetsError) {
    return (
      <DashboardPage title="Admin Dashboard" description="Error loading data">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. 
            <Button variant="link" onClick={handleRefresh} className="p-0 ml-2">
              <RefreshCw className="h-4 w-4 mr-1" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </DashboardPage>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <DashboardPage
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
              Admin Dashboard
            </span>
          </div>
        }
        description="Admin Dashboard and track performance with comprehensive insights"
        buttonText="Admin Settings"
        buttonAction={() => router.push('/admin/settings')}
        extraActions={
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Performance
          </Button>
        }
      >
        {/* Unified Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-gray-900">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jobs</CardTitle>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Briefcase className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{totalJobs}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                All projects managed
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-gray-900">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</CardTitle>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{activeJobs}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Currently in progress
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-gray-900">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Shifts</CardTitle>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{todayShifts}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Scheduled for today
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-gray-900">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Members</CardTitle>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">48</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Active Workforce
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-sm">
                  <Target className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-bold">
                  Recent Jobs
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {recentJobs.map((job, index) => (
                    <div 
                      key={job.id} 
                      className={cn(
                        "p-4 rounded-lg border",
                        "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      {/* Job Header */}
                      <div 
                        onClick={() => handleJobClick(job.id)} 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 -m-2 rounded transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-foreground">{job.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <CompanyAvatar
                                src={job.company.company_logo_url}
                                name={job.company.name || ''}
                                className="w-5 h-5"
                              />
                              <p className="text-sm font-medium text-muted-foreground">{job.company.name}</p>
                              <Enhanced3DStatusBadge status={job.status} size="sm" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Shifts for this Job */}
                      {job.recentShifts && job.recentShifts.length > 0 && (
                        <div className="mt-4 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
                          <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                            Recent Shifts ({job.recentShifts.length})
                          </h5>
                          <div className="space-y-2">
                            {job.recentShifts.map((shift, shiftIndex) => {
                              const shiftStatus = getShiftStatus(shift);
                              const timesheet = getTimesheetForShift(shift.id);
                              return (
                                <div
                                  key={shift.id}
                                  onClick={() => handleShiftClick(shift.id)}
                                  className={cn(
                                    "p-2 rounded cursor-pointer transition-all duration-200 hover:shadow-sm border text-xs",
                                    shiftStatus.isLive
                                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                      : shiftStatus.isCompleted
                                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                      : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                        {shiftIndex + 1}
                                      </div>
                                      <span className="font-medium">{format(new Date(shift.date), 'MMM d')}</span>
                                      <span className="text-muted-foreground">{format(new Date(shift.startTime), 'h:mm a')}</span>
                                    </div>
                                    <Enhanced3DStatusBadge status={shiftStatus.status} size="sm" />
                                  </div>
                                  <div className="flex justify-end">
                                    <TimesheetStatusBadge status={timesheet?.status || null} size="xs" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Briefcase className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="font-medium">No recent jobs</p>
                  <p className="text-sm">Create your first job to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-sm">
                    <Sparkles className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <span className="text-gray-900 dark:text-gray-100 font-bold text-xl">
                      Today's Shifts
                    </span>
                    <p className="text-sm text-muted-foreground">
                      (72-hour window) • {todayShifts} total shifts
                    </p>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShiftsPage(Math.max(1, shiftsPage - 1))}
                      disabled={shiftsPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {shiftsPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShiftsPage(Math.min(totalPages, shiftsPage + 1))}
                      disabled={shiftsPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedShifts.length > 0 ? (
                <div className="space-y-4">
                  {paginatedShifts.map((shift, index) => {
                    const shiftStatus = getShiftStatus(shift);
                    return (
                      <div 
                        key={shift.id} 
                        onClick={() => handleShiftClick(shift.id)} 
                        className={cn(
                          "p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md border",
                          shiftStatus.isLive
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 ring-1 ring-red-200 dark:ring-red-800"
                            : shiftStatus.isCompleted
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-bold">
                            {(shiftsPage - 1) * shiftsPerPage + index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-foreground">{shift.job?.name || 'Unknown Job'}</h4>
                            <div className="flex items-center gap-3 mt-2">
                              <CompanyAvatar
                                src={shift.job?.company?.company_logo_url}
                                name={shift.job?.company?.name || ''}
                                className="w-6 h-6"
                              />
                              <p className="text-sm font-medium text-muted-foreground">{shift.job?.company?.name || 'Unknown Company'}</p>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Enhanced3DStatusBadge status={shiftStatus.status} size="sm" />
                              <EnhancedDateStatusIndicator
                                date={shift.date}
                                startTime={shift.startTime}
                                endTime={shift.endTime}
                                status={shiftStatus.status}
                                size="sm"
                                showTimeUntil={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="font-medium">No shifts in 72-hour window</p>
                  <p className="text-sm">Shifts from the past 36 hours and next 36 hours will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardPage>
      
      {/* Performance Monitor */}
      <PerformanceMonitor />
    </div>
  );
}