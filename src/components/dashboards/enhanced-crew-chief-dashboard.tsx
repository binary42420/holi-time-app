'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  FileText,
  Briefcase,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Coffee,
  Play,
  CheckCircle,
  Zap,
  Phone,
  MessageSquare,
} from "lucide-react";
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { TimesheetSection } from '@/components/dashboard/timesheet-section';
import { RecentJobsSection } from '@/components/dashboard/recent-jobs-section';
import { ShiftsSection } from '@/components/dashboard/shifts-section';
import { DashboardPage } from '@/components/DashboardPage';
import { cn } from '@/lib/utils';

export function EnhancedCrewChiefDashboard() {
  const router = useRouter();
  const [shiftsPage, setShiftsPage] = useState(1);
  const { timesheets, jobs, shifts, isLoading, isError, error, refetchAll } = useDashboardData(shiftsPage, 5);

  const handleTimesheetClick = (timesheetId: string, shiftId: string) => {
    router.push(`/shifts/${shiftId}?tab=timesheet`);
  };

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  const handleShiftClick = (shiftId: string) => {
    router.push(`/shifts/${shiftId}`);
  };

  // Calculate summary metrics for crew chief
  const summaryMetrics = {
    myJobs: jobs.data?.jobs?.length || 0,
    activeShifts: shifts.data?.shifts?.filter((shift: any) => 
      shift.status === 'Active' || shift.status === 'InProgress'
    ).length || 0,
    pendingTimesheets: timesheets.data?.meta?.pending || 0,
    totalShifts: shifts.data?.meta?.total || 0,
  };

  // Calculate worker status summary across all shifts
  const workerStatusSummary = shifts.data?.shifts?.reduce((acc: any, shift: any) => {
    acc.working += shift.workerStatus?.clockedIn || 0;
    acc.onBreak += shift.workerStatus?.onBreak || 0;
    acc.assigned += shift.workerStatus?.assigned || 0;
    acc.noShow += shift.workerStatus?.noShow || 0;
    return acc;
  }, { working: 0, onBreak: 0, assigned: 0, noShow: 0 }) || { working: 0, onBreak: 0, assigned: 0, noShow: 0 };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
        <DashboardPage
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                Crew Chief Dashboard
              </span>
            </div>
          }
          description="Manage your crew, track progress, and ensure smooth operations"
        >
          {/* Loading Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Loading Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DashboardPage>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
        <DashboardPage
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                Crew Chief Dashboard
              </span>
            </div>
          }
          description="Manage your crew, track progress, and ensure smooth operations"
        >
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load dashboard data. 
              <Button variant="link" onClick={refetchAll} className="p-0 ml-2">
                <RefreshCw className="h-4 w-4 mr-1" />
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </DashboardPage>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      <DashboardPage
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
              Crew Chief Dashboard
            </span>
          </div>
        }
        description="Manage your crew, track progress, and ensure smooth operations"
        buttonText="My Profile"
        buttonAction={() => router.push('/profile')}
      >
        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100/50 to-green-200/30 dark:from-green-800/50 dark:to-green-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Working Now</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{workerStatusSummary.working}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Crew members active
              </div>
              {workerStatusSummary.working > 0 && (
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse" />
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-100/50 to-yellow-200/30 dark:from-yellow-800/50 dark:to-yellow-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">On Break</CardTitle>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                <Coffee className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{workerStatusSummary.onBreak}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Taking breaks
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-100/50 to-orange-200/30 dark:from-orange-800/50 dark:to-orange-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Timesheets</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.pendingTimesheets}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Need attention
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/50 to-blue-200/30 dark:from-blue-800/50 dark:to-blue-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Shifts</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.activeShifts}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Currently managing
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Timesheets Pending Approval Section - Only for shifts where user is crew chief */}
            <TimesheetSection
              timesheets={timesheets.data?.timesheets || []}
              isLoading={timesheets.isLoading}
              error={timesheets.error}
              onTimesheetClick={handleTimesheetClick}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg"
            />

            {/* Recent Jobs Section - Only jobs where user had assignments */}
            <RecentJobsSection
              jobs={jobs.data?.jobs || []}
              isLoading={jobs.isLoading}
              error={jobs.error}
              onJobClick={handleJobClick}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg"
            />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* My Shifts Section - Only user's assigned shifts */}
            <ShiftsSection
              shifts={shifts.data?.shifts || []}
              isLoading={shifts.isLoading}
              error={shifts.error}
              meta={shifts.data?.meta}
              onShiftClick={handleShiftClick}
              onPageChange={setShiftsPage}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg"
            />

            {/* Crew Chief Tools Card */}
            <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Crew Chief Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/shifts')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All Shifts
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/employees')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Crew
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/timesheets')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Review Timesheets
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/performance')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Performance Reports
                </Button>
              </CardContent>
            </Card>

            {/* Emergency Contact Card */}
            <Card className="bg-amber-50/80 backdrop-blur-sm dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-5 w-5" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Contact support or admin for assistance with crew management or technical issues.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call Support
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardPage>
    </div>
  );
}