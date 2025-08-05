'use client';

import { useUser } from "@/hooks/use-user";
import { useApiQuery } from '@/hooks/use-api';
import { apiService } from '@/lib/services/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, Users, AlertCircle, RefreshCw, Shield, Target, Zap, Crown } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkerRolesBadges } from "@/components/WorkerRolesBadges";
import { getWorkersNeeded } from "@/lib/worker-count-utils";
import { Progress } from "@/components/ui/progress";
import { Enhanced3DStatusBadge, EnhancedDateStatusIndicator } from '@/components/enhanced-date-status-indicators';
import { getShiftStatus, getShiftStatusDisplay } from '@/lib/shift-status';
import { Shift, Job } from '@prisma/client';
import { Company } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { DashboardPage } from '@/components/DashboardPage';
import { cn } from '@/lib/utils';

type ActiveShift = Shift & {
  job: Job & {
    company: Company;
  };
  assignedPersonnel?: Array<{
    id: string;
    userId: string;
    status: string;
    roleCode: string;
    user: {
      id: string;
      name: string;
      avatarData?: string;
    };
  }>;
};

type DashboardData = {
  activeShifts: ActiveShift[];
};

export default function CrewChiefDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const { data, isLoading: loading, error, refetch } = useApiQuery<DashboardData>(
    ['crewChiefDashboard', user?.id],
    () => apiService.getCrewChiefDashboard(user!.id!),
    { enabled: !!user?.id }
  );

  const handleShiftClick = (shiftId: string) => {
    router.push(`/jobs-shifts/${shiftId}`);
  };

  // Helper functions for calculating fulfillment
  const getTotalPositions = (shift: ActiveShift) => {
    return ((shift as any).requiredCrewChiefs || 0) + 
           ((shift as any).requiredStagehands || 0) + 
           ((shift as any).requiredForkOperators || 0) + 
           ((shift as any).requiredReachForkOperators || 0) + 
           ((shift as any).requiredRiggers || 0) + 
           ((shift as any).requiredGeneralLaborers || 0);
  };

  const getFilledPositions = (shift: ActiveShift) => {
    return shift.assignedPersonnel?.filter(p => 
      p.userId && p.status !== 'NoShow'
    ).length || 0;
  };

  const getFulfillmentPercentage = (shift: ActiveShift) => {
    const total = getTotalPositions(shift);
    const filled = getFilledPositions(shift);
    return total > 0 ? (filled / total) * 100 : 0;
  };

  if (loading) {
    return (
      <DashboardPage title="Loading Dashboard...">
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

  const activeShifts = data?.activeShifts || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <DashboardPage
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold">
              Crew Chief Dashboard
            </span>
          </div>
        }
        description="Lead your team and manage active shifts with enhanced oversight tools"
        buttonText="Create Shift"
        buttonAction={() => router.push('/jobs-shifts/new')}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-600/20 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold">
                Active Shifts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {activeShifts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeShifts.map((shift, index) => {
                  const fulfillmentPercentage = getFulfillmentPercentage(shift);
                  const totalPositions = getTotalPositions(shift);
                  const filledPositions = getFilledPositions(shift);
                  
                  const getFulfillmentStatus = () => {
                    if (totalPositions === 0) return 'FULL';
                    const ratio = filledPositions / totalPositions;
                    if (ratio >= 1.0) return 'FULL';
                    if (ratio >= 0.8) return 'GOOD';
                    if (ratio >= 0.6) return 'LOW';
                    return 'CRITICAL';
                  };

                  const fulfillmentStatus = getFulfillmentStatus();
                  const shiftStatus = getShiftStatus(shift);
                  
                  return (
                    <Card
                      key={shift.id}
                      onClick={() => handleShiftClick(shift.id)}
                      className={cn(
                        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-2",
                        "bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
                        shiftStatus.isLive
                          ? "border-red-300 dark:border-red-700 shadow-red-500/20 ring-1 ring-red-200 dark:ring-red-800"
                          : shiftStatus.isCompleted
                          ? "border-green-300 dark:border-green-700 shadow-green-500/20"
                          : fulfillmentStatus === 'CRITICAL' ? "border-red-300 dark:border-red-700 shadow-red-500/20" :
                          fulfillmentStatus === 'LOW' ? "border-orange-300 dark:border-orange-700 shadow-orange-500/20" :
                          "border-gray-200 dark:border-gray-700 shadow-lg"
                      )}
                    >
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
                      
                      <CardHeader className="pb-3 relative z-10">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg font-bold text-foreground">{shift.job?.name || 'Unknown Job'}</CardTitle>
                          <Enhanced3DStatusBadge status={shiftStatus.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <CompanyAvatar
                            src={shift.job?.company?.company_logo_url}
                            name={shift.job?.company?.name || ''}
                            className="w-6 h-6 ring-2 ring-white shadow-lg"
                          />
                          <p className="text-sm font-medium text-muted-foreground">{shift.job?.company?.name || 'Unknown Company'}</p>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0 space-y-4 relative z-10">
                        <div className="space-y-2">
                          <EnhancedDateStatusIndicator
                            date={shift.date}
                            startTime={shift.startTime}
                            endTime={shift.endTime}
                            status={shiftStatus.status}
                            size="sm"
                            showTimeUntil={true}
                          />
                        </div>
                        
                        {(() => {
                          const workersNeeded = getWorkersNeeded({
                            assignedPersonnel: shift.assignedPersonnel,
                            requiredCrewChiefs: (shift as any).requiredCrewChiefs,
                            requiredStagehands: (shift as any).requiredStagehands,
                            requiredForkOperators: (shift as any).requiredForkOperators,
                            requiredReachForkOperators: (shift as any).requiredReachForkOperators,
                            requiredRiggers: (shift as any).requiredRiggers,
                            requiredGeneralLaborers: (shift as any).requiredGeneralLaborers,
                          });

                          return workersNeeded.length > 0 ? (
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-sm font-bold mb-3 flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Workers Still Needed
                                </h5>
                                <WorkerRolesBadges requirements={workersNeeded.map(worker => ({
                                  id: `${shift.id}-${worker.roleCode}`,
                                  roleCode: worker.roleCode,
                                  roleName: worker.roleName,
                                  requiredCount: worker.needed
                                }))} />
                              </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Staffing Progress</span>
                                <Enhanced3DStatusBadge 
                                  status={fulfillmentStatus}
                                  count={filledPositions}
                                  total={totalPositions}
                                  showCount
                                  size="sm"
                                />
                              </div>
                              <div className="relative">
                                <Progress 
                                  value={fulfillmentPercentage} 
                                  className="h-3 bg-gray-200 dark:bg-gray-700"
                                />
                                <div 
                                  className={cn(
                                    "absolute inset-0 rounded-full opacity-75 transition-all duration-500",
                                    fulfillmentStatus === 'CRITICAL' ? "bg-gradient-to-r from-red-500 to-red-600" :
                                    fulfillmentStatus === 'LOW' ? "bg-gradient-to-r from-orange-500 to-orange-600" :
                                    fulfillmentStatus === 'GOOD' ? "bg-gradient-to-r from-yellow-500 to-amber-500" :
                                    "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                  )}
                                  style={{ width: `${Math.min(fulfillmentPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-sm font-bold mb-3 flex items-center gap-2 text-green-500">
                                  <Users className="h-4 w-4" />
                                  Fully Staffed
                                </h5>
                                <p className="text-sm text-green-400">All positions filled</p>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">Staffing Progress</span>
                                  <Enhanced3DStatusBadge 
                                    status={fulfillmentStatus}
                                    count={filledPositions}
                                    total={totalPositions}
                                    showCount
                                    size="sm"
                                  />
                                </div>
                                <div className="relative">
                                  <Progress 
                                    value={fulfillmentPercentage} 
                                    className="h-3 bg-gray-200 dark:bg-gray-700"
                                  />
                                  <div 
                                    className="absolute inset-0 rounded-full opacity-75 transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-600"
                                    style={{ width: `${Math.min(fulfillmentPercentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <div className="p-6 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Users className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">No Active Shifts</h3>
                <p className="text-sm mb-4">Create a new shift to start managing your team</p>
                <Button 
                  onClick={() => router.push('/jobs-shifts/new')}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Create First Shift
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardPage>
    </div>
  );
}
