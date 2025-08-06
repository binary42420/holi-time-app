'use client';

import { useUser } from "@/hooks/use-user";
import { useApiQuery } from '@/hooks/use-api';
import { apiService } from '@/lib/services/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, AlertCircle, RefreshCw, Hand, User, Sparkles, Target, Zap } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Enhanced3DStatusBadge, EnhancedDateStatusIndicator } from '@/components/enhanced-date-status-indicators';
import { getShiftStatus, getShiftStatusDisplay } from '@/lib/shift-status';
import { Shift, Job } from '@prisma/client';
import { Company } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { DashboardPage } from '@/components/DashboardPage';
import { PageWrapperSkeleton } from '@/components/page-wrapper';
import { cn } from '@/lib/utils';

// Helper function to get shift display name (prioritize description, fallback to job name)
const getShiftDisplayName = (shift: any) => {
  if (shift.description && shift.description.trim()) {
    return shift.description.trim()
  }
  return shift.job?.name || 'Unknown Job'
}

type UpcomingShift = Shift & {
  job: Job & {
    company: Company;
  };
};

type DashboardData = {
  upcomingShifts: UpcomingShift[];
};

export default function EmployeeDashboard() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const { data, isLoading: isApiLoading, error, refetch } = useApiQuery<DashboardData>(
    ['employeeDashboard', user?.id],
    () => apiService.getEmployeeDashboard(user!.id!),
    { enabled: !!user?.id }
  );

  const handleShiftClick = (shiftId: string) => {
    router.push(`/jobs-shifts/${shiftId}`);
  };

  if (isUserLoading) {
    return <PageWrapperSkeleton />;
  }

  if (isApiLoading) {
    return (
      <DashboardPage title="Loading Dashboard...">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </DashboardPage>
    );
  }

  if (error) {
    return (
      <DashboardPage title="Error">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading dashboard: {error.toString()}
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
      </DashboardPage>
    );
  }

  const upcomingShifts = data?.upcomingShifts || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardPage
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-gray-900 dark:text-gray-100 font-bold">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </span>
          </div>
        }
        description={`${format(new Date(), 'eeee, MMMM do')} - Ready to make today productive?`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="text-center p-8 transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <Link href="/jobs-shifts" className="block">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">My Shifts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View your schedule and upcoming work</p>
            </Link>
          </Card>

          <Card className="text-center p-8 transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <Link href="/shifts/up-for-grabs" className="block">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4">
                <Hand className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">Up for Grabs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Claim available shifts and earn more</p>
            </Link>
          </Card>

          <Card className="text-center p-8 transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <Link href="/timesheets" className="block">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">Clock In/Out</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track your time and manage hours</p>
            </Link>
          </Card>
        </div>

        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Sparkles className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="text-gray-900 dark:text-gray-100 font-bold">
                Your Upcoming Shifts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length > 0 ? (
              <div className="space-y-4">
                {upcomingShifts.slice(0, 5).map((shift, index) => {
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
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground text-lg">{getShiftDisplayName(shift)}</h4>
                          <div className="flex items-center gap-3 mt-2">
                            <CompanyAvatar
                              src={shift.job?.company?.company_logo_url}
                              name={shift.job?.company?.name || ''}
                              className="w-6 h-6"
                            />
                            <p className="text-sm font-medium text-muted-foreground">{shift.job?.company?.name || 'Unknown Company'}</p>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Enhanced3DStatusBadge status={shiftStatus.status} size="sm" />
                            <EnhancedDateStatusIndicator
                              date={shift.date}
                              startTime={shift.startTime}
                              status={shiftStatus.status}
                              size="md"
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
              <div className="text-center py-16 text-muted-foreground">
                <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Calendar className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">No Upcoming Shifts</h3>
                <p className="text-sm mb-4">Check the "Up for Grabs" section to find available shifts</p>
                <Button 
                  onClick={() => router.push('/shifts/up-for-grabs')}
                  className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Find Available Shifts
                </Button>
              </div>
            )}
            {upcomingShifts.length > 5 && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/jobs-shifts')}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  View All {upcomingShifts.length} Shifts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardPage>
    </div>
  );
}
