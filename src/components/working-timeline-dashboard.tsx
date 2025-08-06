"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, isSameDay } from 'date-fns';
import { Calendar, Clock, Users, MapPin, ArrowLeft, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useJobs, useShifts } from '@/hooks/use-api';
import { getAssignedWorkerCount, getTotalRequiredWorkers } from '@/lib/worker-count-utils';

interface WorkingTimelineDashboardProps {
  jobId: string;
}

// Helper functions
const getShiftStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-green-500';
    case 'in_progress': return 'bg-blue-500';
    case 'scheduled': return 'bg-yellow-500';
    case 'cancelled': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getShiftStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'default' as const;
    case 'in_progress': return 'secondary' as const;
    case 'scheduled': return 'outline' as const;
    case 'cancelled': return 'destructive' as const;
    default: return 'secondary' as const;
  }
};

const getStaffingColor = (assigned: number, required: number) => {
  const percentage = required > 0 ? (assigned / required) * 100 : 0;
  if (percentage >= 100) return 'text-green-600';
  if (percentage >= 75) return 'text-yellow-600';
  if (percentage >= 50) return 'text-orange-600';
  return 'text-red-600';
};

export default function WorkingTimelineDashboard({ jobId }: WorkingTimelineDashboardProps) {
  const router = useRouter();
  const { data: jobs, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useJobs();
  const { data: shifts, isLoading: shiftsLoading, isError: shiftsError, refetch: refetchShifts } = useShifts({ jobId });

  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'calendar'>('timeline');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const job = jobs?.find(j => j.id === jobId);
  const isLoading = jobsLoading || shiftsLoading;
  const hasError = jobsError || shiftsError;

  // Process shifts data
  const allShifts = shifts || [];
  const upcomingShifts = allShifts.filter((shift: any) => new Date(shift.date) >= new Date());
  const completedShifts = allShifts.filter((shift: any) => shift.status === 'Completed');
  
  // Calculate statistics
  const totalShifts = allShifts.length;
  const completedCount = completedShifts.length;
  const completionRate = totalShifts > 0 ? (completedCount / totalShifts) * 100 : 0;
  
  // Calculate staffing statistics
  const totalRequired = allShifts.reduce((sum: number, shift: any) => sum + getTotalRequiredWorkers(shift), 0);
  const totalAssigned = allShifts.reduce((sum: number, shift: any) => sum + getAssignedWorkerCount(shift), 0);
  const staffingRate = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

  // Group shifts by date for timeline view
  const shiftsByDate = allShifts.reduce((acc: any, shift: any) => {
    const dateKey = format(new Date(shift.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {});

  const handleRefresh = () => {
    refetchJobs();
    refetchShifts();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/jobs/${jobId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Job
            </Button>
            <h1 className="text-2xl font-bold">Scheduling Timeline</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading scheduling timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError || !job) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/jobs/${jobId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Job
            </Button>
            <h1 className="text-2xl font-bold">Scheduling Timeline</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h3 className="text-lg font-semibold">Failed to load scheduling data</h3>
            <p className="text-sm text-muted-foreground">{hasError ? 'Error loading data' : 'Job not found'}</p>
            <Button onClick={handleRefresh} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Scheduling Timeline</h1>
            <p className="text-muted-foreground">{job.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Shifts</p>
                <p className="text-2xl font-bold">{totalShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Staffing Rate</p>
                <p className="text-2xl font-bold">{staffingRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Upcoming Shifts</p>
                <p className="text-2xl font-bold">{upcomingShifts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline View</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(shiftsByDate).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(shiftsByDate)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([dateKey, dayShifts]: [string, any]) => (
                      <div key={dateKey} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full bg-primary -ml-6 border-2 border-background"></div>
                          <h3 className="font-semibold text-lg">
                            {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                          </h3>
                          <Badge variant="outline">{dayShifts.length} shifts</Badge>
                        </div>
                        
                        <div className="space-y-3 ml-2">
                          {dayShifts.map((shift: any) => (
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
                                      <h4 className="font-medium">{shift.job?.name || job.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{shift.location || 'No location'}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        <span className={getStaffingColor(getAssignedWorkerCount(shift), getTotalRequiredWorkers(shift))}>
                                          {getAssignedWorkerCount(shift)}/{getTotalRequiredWorkers(shift)} workers
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getShiftStatusBadgeVariant(shift.status)}>
                                      {shift.status}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Shifts Scheduled</h3>
                  <p className="text-muted-foreground text-center">This job doesn't have any shifts scheduled yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {allShifts.length > 0 ? (
                <div className="space-y-3">
                  {allShifts
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((shift: any) => (
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
                                <h4 className="font-medium">{shift.job?.name || job.name}</h4>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(shift.date), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{shift.location || 'No location'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span className={getStaffingColor(getAssignedWorkerCount(shift), getTotalRequiredWorkers(shift))}>
                                    {getAssignedWorkerCount(shift)}/{getTotalRequiredWorkers(shift)} workers
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getShiftStatusBadgeVariant(shift.status)}>
                                {shift.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Shifts Available</h3>
                  <p className="text-muted-foreground text-center">This job doesn't have any shifts scheduled.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
                <p className="text-muted-foreground">Calendar view will be implemented in a future update.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Staffing Progress */}
      {totalShifts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Shift Completion</span>
                <span>{completionRate.toFixed(0)}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Staffing Progress</span>
                <span>{staffingRate.toFixed(0)}%</span>
              </div>
              <Progress value={staffingRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}