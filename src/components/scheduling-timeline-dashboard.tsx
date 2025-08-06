// Enhanced Scheduling Timeline Dashboard - Desktop Implementation
// Features:
// - Clean timeline view with improved performance
// - Multiple view modes: Timeline, List, and Calendar views
// - Real-time data fetching with proper error handling
// - Advanced filtering and search capabilities
// - Staffing analytics and progress tracking
// - Desktop-optimized design
// - Integrated with existing API hooks for consistency

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isSameDay, addDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Clock, Users, MapPin, ArrowLeft, RefreshCw, AlertCircle, TrendingUp, Filter, Search, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, UserCheck, User, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useJobs, useShifts } from '@/hooks/use-api';
import { getAssignedWorkerCount, getTotalRequiredWorkers } from '@/lib/worker-count-utils';

interface SchedulingTimelineProps {
  jobId: string;
}

// Worker type definitions
const WORKER_TYPES = {
  'CC': { label: 'Crew Chief', color: '#dc2626' },
  'SH': { label: 'Stagehand', color: '#2563eb' },
  'FO': { label: 'Fork Operator', color: '#059669' },
  'RFO': { label: 'Reach Fork Operator', color: '#0d9488' },
  'RG': { label: 'Rigger', color: '#7c3aed' },
  'GL': { label: 'General Laborer', color: '#ea580c' }
};

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

const getStaffingProgress = (assigned: number, required: number) => {
  return required > 0 ? Math.min((assigned / required) * 100, 100) : 0;
};

function SchedulingTimelineDashboard({ jobId }: SchedulingTimelineProps) {
  const router = useRouter();
  const { data: jobs, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useJobs();
  const { data: shifts, isLoading: shiftsLoading, isError: shiftsError, refetch: refetchShifts } = useShifts({ jobId });

  // State management
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'calendar'>('timeline');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByStatus, setFilterByStatus] = useState<string>('all');
  const [filterByWorkerType, setFilterByWorkerType] = useState<string>('all');
  const [showUnderfilledOnly, setShowUnderfilledOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(7); // Days to show
  const [currentDateRange, setCurrentDateRange] = useState<Date[]>([]);

  const job = jobs?.find(j => j.id === jobId);
  const isLoading = jobsLoading || shiftsLoading;
  const hasError = jobsError || shiftsError;

  // Initialize date range
  useEffect(() => {
    if (job && currentDateRange.length === 0) {
      const startDate = new Date(job.startDate);
      const dates = [];
      for (let i = 0; i < zoomLevel; i++) {
        dates.push(addDays(startDate, i));
      }
      setCurrentDateRange(dates);
    }
  }, [job, zoomLevel, currentDateRange.length]);

  // Process shifts data
  const allShifts = shifts || [];
  
  // Apply filters
  const filteredShifts = allShifts.filter((shift: any) => {
    // Search filter
    if (searchQuery && !shift.description?.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !shift.location?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (filterByStatus !== 'all' && shift.status !== filterByStatus) {
      return false;
    }
    
    // Underfilled filter
    if (showUnderfilledOnly) {
      const assigned = getAssignedWorkerCount(shift);
      const required = getTotalRequiredWorkers(shift);
      if (assigned >= required) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate statistics
  const totalShifts = filteredShifts.length;
  const completedShifts = filteredShifts.filter((shift: any) => shift.status === 'Completed');
  const completionRate = totalShifts > 0 ? (completedShifts.length / totalShifts) * 100 : 0;
  
  // Calculate staffing statistics
  const totalRequired = filteredShifts.reduce((sum: number, shift: any) => sum + getTotalRequiredWorkers(shift), 0);
  const totalAssigned = filteredShifts.reduce((sum: number, shift: any) => sum + getAssignedWorkerCount(shift), 0);
  const staffingRate = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

  // Group shifts by date for timeline view
  const shiftsByDate = filteredShifts.reduce((acc: any, shift: any) => {
    const dateKey = format(new Date(shift.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {});

  // Navigation functions
  const goToPreviousDates = () => {
    const newDates = currentDateRange.map(date => addDays(date, -zoomLevel));
    setCurrentDateRange(newDates);
  };

  const goToNextDates = () => {
    const newDates = currentDateRange.map(date => addDays(date, zoomLevel));
    setCurrentDateRange(newDates);
  };

  const handleRefresh = () => {
    refetchJobs();
    refetchShifts();
  };

  const handleZoomIn = () => {
    if (zoomLevel > 1) {
      setZoomLevel(zoomLevel - 2);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel < 14) {
      setZoomLevel(zoomLevel + 2);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        handleRefresh();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

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
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
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
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Understaffed</p>
                <p className="text-2xl font-bold">
                  {filteredShifts.filter((shift: any) => 
                    getAssignedWorkerCount(shift) < getTotalRequiredWorkers(shift)
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={filterByStatus} onValueChange={setFilterByStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showUnderfilledOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnderfilledOnly(!showUnderfilledOnly)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Understaffed Only
            </Button>

            {viewMode === 'timeline' && (
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={goToPreviousDates}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {zoomLevel} days
                </span>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextDates}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
              {currentDateRange.length > 0 ? (
                <div className="space-y-6">
                  {currentDateRange.map((date) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const dayShifts = shiftsByDate[dateKey] || [];
                    
                    return (
                      <div key={dateKey} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full bg-primary -ml-6 border-2 border-background"></div>
                          <h3 className="font-semibold text-lg">
                            {format(date, 'EEEE, MMMM d, yyyy')}
                          </h3>
                          <Badge variant="outline">{dayShifts.length} shifts</Badge>
                        </div>
                        
                        {dayShifts.length > 0 ? (
                          <div className="space-y-3 ml-2">
                            {dayShifts.map((shift: any) => {
                              const assigned = getAssignedWorkerCount(shift);
                              const required = getTotalRequiredWorkers(shift);
                              const staffingProgress = getStaffingProgress(assigned, required);
                              
                              return (
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
                                          <h4 className="font-medium">{shift.description || 'Shift'}</h4>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
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
                                            <span className={getStaffingColor(assigned, required)}>
                                              {assigned}/{required} workers
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Progress value={staffingProgress} className="flex-1 h-2" />
                                          <span className="text-xs text-muted-foreground">
                                            {staffingProgress.toFixed(0)}%
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 ml-4">
                                        <Badge variant={getShiftStatusBadgeVariant(shift.status)}>
                                          {shift.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="ml-2 text-sm text-muted-foreground py-4">
                            No shifts scheduled for this day
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Timeline Data</h3>
                  <p className="text-muted-foreground text-center">Unable to load timeline data for this job.</p>
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
              {filteredShifts.length > 0 ? (
                <div className="space-y-3">
                  {filteredShifts
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((shift: any) => {
                      const assigned = getAssignedWorkerCount(shift);
                      const required = getTotalRequiredWorkers(shift);
                      const staffingProgress = getStaffingProgress(assigned, required);
                      
                      return (
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
                                  <h4 className="font-medium">{shift.description || 'Shift'}</h4>
                                  <Badge variant="outline">
                                    {format(new Date(shift.date), 'MMM d, yyyy')}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
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
                                    <span className={getStaffingColor(assigned, required)}>
                                      {assigned}/{required} workers
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={staffingProgress} className="flex-1 h-2" />
                                  <span className="text-xs text-muted-foreground">
                                    {staffingProgress.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Badge variant={getShiftStatusBadgeVariant(shift.status)}>
                                  {shift.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Shifts Found</h3>
                  <p className="text-muted-foreground text-center">No shifts match your current filters.</p>
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
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
                <p className="text-muted-foreground">Calendar view implementation coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SchedulingTimelineDashboard;