'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  Briefcase,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Home,
  CheckCircle,
  Phone,
  MessageSquare,
  MapPin,
  Timer,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { RecentJobsSection } from '@/components/dashboard/recent-jobs-section';
import { ShiftsSection } from '@/components/dashboard/shifts-section';
import { DashboardPage } from '@/components/DashboardPage';
import { cn } from '@/lib/utils';

export function EnhancedEmployeeDashboard() {
  const router = useRouter();
  const [shiftsPage, setShiftsPage] = useState(1);
  const { jobs, shifts, isLoading, isError, error, refetchAll } = useDashboardData(shiftsPage, 5);

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  const handleShiftClick = (shiftId: string) => {
    router.push(`/shifts/${shiftId}`);
  };

  // Calculate summary metrics for employee
  const summaryMetrics = {
    myJobs: jobs.data?.jobs?.length || 0,
    todayShifts: shifts.data?.shifts?.filter((shift: any) => shift.timing?.isToday).length || 0,
    upcomingShifts: shifts.data?.shifts?.filter((shift: any) => 
      shift.timing?.status === 'upcoming'
    ).length || 0,
    totalShifts: shifts.data?.meta?.total || 0,
  };

  // Calculate hours worked today (mock data - would come from time entries)
  const hoursToday = shifts.data?.shifts?.reduce((total: number, shift: any) => {
    if (shift.timing?.isToday && shift.userContext?.assignment) {
      // Mock calculation - in real app would sum actual time entries
      return total + 8; // Assuming 8 hours per shift for demo
    }
    return total;
  }, 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-green-900/20 dark:to-gray-900">
        <DashboardPage
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
                My Schedule
              </span>
            </div>
          }
          description="View your assignments, track your progress, and stay organized"
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-green-900/20 dark:to-gray-900">
        <DashboardPage
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
                My Schedule
              </span>
            </div>
          }
          description="View your assignments, track your progress, and stay organized"
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-green-900/20 dark:to-gray-900">
      <DashboardPage
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
              My Schedule
            </span>
          </div>
        }
        description="View your assignments, track your progress, and stay organized"
        buttonText="My Profile"
        buttonAction={() => router.push('/profile')}
      >
        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/50 to-blue-200/30 dark:from-blue-800/50 dark:to-blue-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Shifts</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.todayShifts}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Shifts scheduled
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100/50 to-green-200/30 dark:from-green-800/50 dark:to-green-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Hours Today</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <Timer className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{hoursToday}h</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Time worked
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-100/50 to-yellow-200/30 dark:from-yellow-800/50 dark:to-yellow-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming</CardTitle>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.upcomingShifts}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Future shifts
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100/50 to-purple-200/30 dark:from-purple-800/50 dark:to-purple-700/30 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">My Jobs</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summaryMetrics.myJobs}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Active projects
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Recent Jobs Section - Only jobs where user had assignments */}
            <RecentJobsSection
              jobs={jobs.data?.jobs || []}
              isLoading={jobs.isLoading}
              error={jobs.error}
              onJobClick={handleJobClick}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg"
            />

            {/* Performance & Achievements Card */}
            <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Performance & Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall Rating</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-4 h-4 rounded-full",
                            i < 4 ? "bg-yellow-400" : "bg-gray-200 dark:bg-gray-700"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">4.0</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Shifts Completed</span>
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    24 this month
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Attendance Rate</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    98%
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push('/performance')}
                >
                  View Detailed Performance
                </Button>
              </CardContent>
            </Card>
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
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg"
            />

            {/* Quick Actions Card */}
            <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-green-200/50 dark:border-green-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/shifts')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All My Shifts
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/profile')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Update Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/performance')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Performance
                </Button>
              </CardContent>
            </Card>

            {/* Need Help Card */}
            <Card className="bg-amber-50/80 backdrop-blur-sm dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-5 w-5" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Contact your crew chief or support team for assistance with shifts or questions.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call Crew Chief
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