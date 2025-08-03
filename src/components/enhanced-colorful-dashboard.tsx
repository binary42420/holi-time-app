import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Enhanced3DStatusBadge, EnhancedDateStatusIndicator, UrgencyTimeline } from '@/components/enhanced-date-status-indicators';
import { 
  Calendar,
  Users,
  Briefcase,
  FileText,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Timer,
  Building2,
  UserCheck,
  Activity,
  Zap,
  Flame,
  Star,
  Target,
  Award,
  Shield,
  Sparkles,
  Rocket,
  Crown
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardMetrics {
  jobs: {
    total: number;
    active: number;
    pending: number;
    completed: number;
    onHold: number;
    cancelled: number;
  };
  shifts: {
    total: number;
    today: number;
    tomorrow: number;
    thisWeek: number;
    active: number;
    pending: number;
    completed: number;
    understaffed: number;
    upcoming?: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      job: { name: string };
    }>;
  };
  personnel: {
    totalRequired: number;
    totalAssigned: number;
    currentlyWorking: number;
    onBreak: number;
    completed: number;
    noShows: number;
  };
  timesheets: {
    draft: number;
    pendingCompany: number;
    pendingManager: number;
    completed: number;
    rejected: number;
  };
  companies: {
    total: number;
    active: number;
  };
}

interface EnhancedColorfulDashboardProps {
  metrics: DashboardMetrics;
  className?: string;
}

export function EnhancedColorfulDashboard({ metrics, className }: EnhancedColorfulDashboardProps) {
  // Calculate key performance indicators
  const overallStaffingRate = metrics.personnel.totalRequired > 0 ? 
    (metrics.personnel.totalAssigned / metrics.personnel.totalRequired) * 100 : 100;
  
  const getFulfillmentStatus = (assigned: number, required: number) => {
    if (required === 0) return 'FULL';
    const ratio = assigned / required;
    if (ratio >= 1.1) return 'OVERSTAFFED';
    if (ratio >= 1.0) return 'FULL';
    if (ratio >= 0.8) return 'GOOD';
    if (ratio >= 0.6) return 'LOW';
    return 'CRITICAL';
  };

  const staffingStatus = getFulfillmentStatus(
    metrics.personnel.totalAssigned, 
    metrics.personnel.totalRequired
  );

  const noShowRate = metrics.personnel.totalAssigned > 0 ?
    (metrics.personnel.noShows / metrics.personnel.totalAssigned) * 100 : 0;

  const completionRate = metrics.shifts.total > 0 ?
    (metrics.shifts.completed / metrics.shifts.total) * 100 : 0;

  const pendingTimesheets = metrics.timesheets.pendingCompany + metrics.timesheets.pendingManager;

  return (
    <div className={cn("space-y-8", className)}>
      {/* Hero Metrics Row with Enhanced 3D Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Jobs Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold text-blue-800 dark:text-blue-200">Active Jobs</CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">{metrics.jobs.active}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              {metrics.jobs.total} total jobs
            </div>
            <div className="flex gap-2 flex-wrap">
              {metrics.jobs.pending > 0 && (
                <Enhanced3DStatusBadge status="Pending" count={metrics.jobs.pending} showCount size="sm" />
              )}
              {metrics.jobs.onHold > 0 && (
                <Enhanced3DStatusBadge status="OnHold" count={metrics.jobs.onHold} showCount size="sm" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Shifts Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Today's Shifts</CardTitle>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">{metrics.shifts.today}</div>
            <div className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
              {metrics.shifts.tomorrow} tomorrow
            </div>
            <div className="flex gap-2 flex-wrap">
              {metrics.shifts.understaffed > 0 && (
                <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 shadow-lg animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {metrics.shifts.understaffed} Understaffed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Workers Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-purple-950/20 dark:via-gray-900 dark:to-purple-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold text-purple-800 dark:text-purple-200">Active Workers</CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">{metrics.personnel.currentlyWorking}</div>
            <div className="text-sm text-purple-700 dark:text-purple-300 mb-3">
              {metrics.personnel.onBreak} on break
            </div>
            <div className="flex gap-2 flex-wrap">
              {metrics.personnel.noShows > 0 && (
                <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 shadow-lg">
                  <Flame className="h-3 w-3 mr-1" />
                  {metrics.personnel.noShows} No Shows
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Timesheets Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-amber-950/20 dark:via-gray-900 dark:to-amber-950/20 border-2 border-amber-200 dark:border-amber-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold text-amber-800 dark:text-amber-200">Pending Timesheets</CardTitle>
            <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-2">{pendingTimesheets}</div>
            <div className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              {metrics.timesheets.completed} completed
            </div>
            <div className="flex gap-2 flex-wrap">
              {metrics.timesheets.rejected > 0 && (
                <Enhanced3DStatusBadge status="Cancelled" count={metrics.timesheets.rejected} showCount size="sm" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Status Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Staffing Overview with 3D Effects */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
                Staffing Overview
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Overall Fulfillment</span>
              <Enhanced3DStatusBadge 
                status={staffingStatus}
                count={metrics.personnel.totalAssigned}
                total={metrics.personnel.totalRequired}
                showCount
                size="lg"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Staffing Progress</span>
                <span className="font-bold">{overallStaffingRate.toFixed(1)}%</span>
              </div>
              <div className="relative">
                <Progress value={overallStaffingRate} className="h-4 bg-gray-200 dark:bg-gray-700" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-75" 
                     style={{ width: `${Math.min(overallStaffingRate, 100)}%` }}></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-200 font-medium">Working</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-lg"></div>
                    <span className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">
                      {metrics.personnel.currentlyWorking}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <span className="text-amber-800 dark:text-amber-200 font-medium">On Break</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-lg"></div>
                    <span className="font-bold text-amber-900 dark:text-amber-100 text-lg">
                      {metrics.personnel.onBreak}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full shadow-lg"></div>
                    <span className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                      {metrics.personnel.completed}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                  <span className="text-red-800 dark:text-red-200 font-medium">No Shows</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-500 rounded-full shadow-lg animate-pulse"></div>
                    <span className="font-bold text-red-900 dark:text-red-100 text-lg">
                      {metrics.personnel.noShows}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {noShowRate > 5 && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-950/50 dark:to-red-900/50 text-red-800 dark:text-red-200 rounded-lg border-2 border-red-300 dark:border-red-700 shadow-lg">
                <div className="p-2 bg-red-500 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-bold">High No-Show Rate Alert</div>
                  <div className="text-sm">Current rate: {noShowRate.toFixed(1)}% - Consider backup staffing</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Schedule Timeline */}
        <Card className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-lg">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent font-bold">
                Next Up
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.shifts.upcoming && metrics.shifts.upcoming.length > 0 ? (
              <UrgencyTimeline shifts={metrics.shifts.upcoming} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming shifts scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Timesheet Status with Colorful Indicators */}
      <Card className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent font-bold">
              Timesheet Processing Status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg border-2 border-gray-300 dark:border-gray-600">
              <div className="text-3xl font-bold text-gray-700 dark:text-gray-300 mb-2">{metrics.timesheets.draft}</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Draft</div>
              <div className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-full mt-2">
                <div className="h-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl shadow-lg border-2 border-amber-300 dark:border-amber-700">
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-300 mb-2">{metrics.timesheets.pendingCompany}</div>
              <div className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Company</div>
              <div className="w-full h-2 bg-amber-300 dark:bg-amber-700 rounded-full mt-2">
                <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl shadow-lg border-2 border-orange-300 dark:border-orange-700">
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-300 mb-2">{metrics.timesheets.pendingManager}</div>
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Pending Manager</div>
              <div className="w-full h-2 bg-orange-300 dark:bg-orange-700 rounded-full mt-2">
                <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full animate-pulse" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl shadow-lg border-2 border-emerald-300 dark:border-emerald-700">
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">{metrics.timesheets.completed}</div>
              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Completed</div>
              <div className="w-full h-2 bg-emerald-300 dark:bg-emerald-700 rounded-full mt-2">
                <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-xl shadow-lg border-2 border-red-300 dark:border-red-700">
              <div className="text-3xl font-bold text-red-700 dark:text-red-300 mb-2">{metrics.timesheets.rejected}</div>
              <div className="text-sm font-medium text-red-600 dark:text-red-400">Rejected</div>
              <div className="w-full h-2 bg-red-300 dark:bg-red-700 rounded-full mt-2">
                <div className="h-2 bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts Section */}
      {(metrics.shifts.understaffed > 0 || metrics.personnel.noShows > 0 || pendingTimesheets > 10) && (
        <Card className="border-2 border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50 via-red-100 to-red-50 dark:from-red-950/30 dark:via-red-900/30 dark:to-red-950/30 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-red-800 dark:text-red-200">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg animate-pulse">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">🚨 Immediate Attention Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.shifts.understaffed > 0 && (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-950/50 dark:to-orange-900/50 rounded-lg border border-orange-300 dark:border-orange-700 shadow-md">
                <div className="p-2 bg-orange-500 rounded-full">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-orange-800 dark:text-orange-200">Understaffed Shifts</div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">{metrics.shifts.understaffed} shifts need additional workers</div>
                </div>
              </div>
            )}
            
            {metrics.personnel.noShows > 0 && (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-950/50 dark:to-red-900/50 rounded-lg border border-red-300 dark:border-red-700 shadow-md">
                <div className="p-2 bg-red-500 rounded-full">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-red-800 dark:text-red-200">No-Shows Reported</div>
                  <div className="text-sm text-red-700 dark:text-red-300">{metrics.personnel.noShows} workers didn't show up today</div>
                </div>
              </div>
            )}
            
            {pendingTimesheets > 10 && (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 rounded-lg border border-amber-300 dark:border-amber-700 shadow-md">
                <div className="p-2 bg-amber-500 rounded-full">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-amber-800 dark:text-amber-200">Timesheet Backlog</div>
                  <div className="text-sm text-amber-700 dark:text-amber-300">{pendingTimesheets} timesheets awaiting approval</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}