'use client'

import { useRouter } from 'next/navigation'
import { DashboardData } from './page'
import { Button } from "@/components/ui/button"
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Calendar, Users, Building2, Clock, TrendingUp, Sparkles, Target } from "lucide-react"
import { Enhanced3DStatusBadge, EnhancedDateStatusIndicator } from '@/components/enhanced-date-status-indicators'
import { getShiftStatus, getShiftStatusDisplay } from '@/lib/shift-status'
import { cn } from "@/lib/utils"

// Helper function to get shift display name (prioritize description, fallback to job name)
const getShiftDisplayName = (shift: any) => {
  if (shift.description && shift.description.trim()) {
    return shift.description.trim()
  }
  return shift.job?.name || 'Unknown Job'
}

interface CompanyDashboardClientProps {
  initialData: DashboardData
  companyId: string
}

export function CompanyDashboardClient({
  initialData,
  companyId
}: CompanyDashboardClientProps) {
  const router = useRouter()
  const { recentJobs = [], upcomingShifts = [] } = initialData

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs-shifts?jobId=${jobId}`)
  }

  const handleShiftClick = (shiftId: string) => {
    router.push(`/jobs-shifts/${shiftId}`)
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-gray-900">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</CardTitle>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Briefcase className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{initialData?.activeJobsCount || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Jobs currently in progress
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-gray-900">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming Shifts</CardTitle>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{initialData?.upcomingShiftsCount || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Shifts scheduled ahead
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-gray-900">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Shifts</CardTitle>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{initialData?.completedShiftsCount || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Successfully finished
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Recent Jobs & Upcoming Shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-sm">
                <Briefcase className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="text-gray-900 dark:text-gray-100 font-bold">
                Recent Jobs
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {recentJobs.length > 0 ? (
              <div className="space-y-4">
                {recentJobs.slice(0, 3).map((job, index) => (
                  <div 
                    key={job.id} 
                    onClick={() => handleJobClick(job.id)} 
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2",
                      "bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900",
                      "border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full text-sm font-bold shadow-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground">{job.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Enhanced3DStatusBadge status={job.status} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {job.company.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Briefcase className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="font-medium">No recent jobs found</p>
                <p className="text-sm">Jobs will appear here once created</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-sm">
                <Sparkles className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="text-gray-900 dark:text-gray-100 font-bold">
                Upcoming Shifts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length > 0 ? (
              <div className="space-y-4">
                {upcomingShifts.slice(0, 3).map((shift, index) => {
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
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground">{getShiftDisplayName(shift)}</h4>
                          <div className="mt-2 flex items-center gap-2">
                            <Enhanced3DStatusBadge status={shiftStatus.status} size="sm" />
                            <EnhancedDateStatusIndicator
                              date={shift.date}
                              startTime={shift.startTime}
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
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-medium">No upcoming shifts</p>
                <p className="text-sm">Shifts will appear here when scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
