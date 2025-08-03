'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Crown,
  FileText,
  Briefcase,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Settings,
  BarChart3,
  Shield,
  Zap,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { TimesheetSection } from '@/components/dashboard/timesheet-section';
import { RecentJobsSection } from '@/components/dashboard/recent-jobs-section';
import { ShiftsSection } from '@/components/dashboard/shifts-section';
import { DashboardPage } from '@/components/DashboardPage';
import { cn } from '@/lib/utils';

export function EnhancedAdminDashboard() {
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

  const handleApproveTimesheet = async (timesheetId: string) => {
    // TODO: Implement timesheet approval
    console.log('Approve timesheet:', timesheetId);
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    // TODO: Implement timesheet rejection
    console.log('Reject timesheet:', timesheetId);
  };

  // Calculate summary metrics
  const summaryMetrics = {
    totalJobs: jobs.data?.jobs?.length || 0,
    activeJobs: jobs.data?.jobs?.filter((job: any) => job.status === 'Active').length || 0,
    pendingTimesheets: timesheets.data?.meta?.pending || 0,
    totalShifts: shifts.data?.meta?.total || 0,
  };

  if (isLoading) {
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
          description="System overview, manage operations, and track performance"
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
          description="System overview, manage operations, and track performance"
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
        description="System overview, manage operations, and track performance with comprehensive insights"
        buttonText="Admin Settings"
        buttonAction={() => router.push('/admin-panel')}
      >
        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/50 to-blue-200/30 dark:from-blue-800/50 dark:to-blue-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jobs</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.totalJobs}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                All projects managed
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100/50 to-green-200/30 dark:from-green-800/50 dark:to-green-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.activeJobs}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Currently in progress
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
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
                Awaiting approval
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100/50 to-purple-200/30 dark:from-purple-800/50 dark:to-purple-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Shifts</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.totalShifts}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                In 72-hour window
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Timesheets Pending Approval Section */}
            <TimesheetSection
              timesheets={timesheets.data?.timesheets || []}
              isLoading={timesheets.isLoading}
              error={timesheets.error}
              onTimesheetClick={handleTimesheetClick}
              onApproveTimesheet={handleApproveTimesheet}
              onRejectTimesheet={handleRejectTimesheet}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
            />

            {/* Recent Jobs Section */}
            <RecentJobsSection
              jobs={jobs.data?.jobs || []}
              isLoading={jobs.isLoading}
              error={jobs.error}
              onJobClick={handleJobClick}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
            />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Today's Shifts Section */}
            <ShiftsSection
              shifts={shifts.data?.shifts || []}
              isLoading={shifts.isLoading}
              error={shifts.error}
              meta={shifts.data?.meta}
              onShiftClick={handleShiftClick}
              onPageChange={setShiftsPage}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
            />

            {/* Quick Actions Card */}
            <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/admin/users')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/admin/companies')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Companies
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/performance')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/admin/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardPage>
    </div>
  );
}