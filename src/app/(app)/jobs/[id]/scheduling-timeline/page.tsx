"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import { useUser } from "@/hooks/use-user";
import { useJobs, useShifts } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  MapPin,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  Truck,
  HardHat,
  X,
} from "lucide-react";
import { getAssignedWorkerCount, getTotalRequiredWorkers } from "@/lib/worker-count-utils";
import { ShiftStatus } from "@prisma/client";

// Worker type colors for visual coding
const WORKER_TYPE_COLORS = {
  crew_chief: { bg: 'bg-purple-600', text: 'text-purple-100', light: 'bg-purple-200' },
  fork_operator: { bg: 'bg-orange-600', text: 'text-orange-100', light: 'bg-orange-200' },
  stage_hand: { bg: 'bg-blue-600', text: 'text-blue-100', light: 'bg-blue-200' },
  general_labor: { bg: 'bg-gray-600', text: 'text-gray-100', light: 'bg-gray-200' },
  default: { bg: 'bg-slate-600', text: 'text-slate-100', light: 'bg-slate-200' }
};

// Fulfillment status colors
const getFulfillmentColor = (fillPercentage: number) => {
  if (fillPercentage >= 95) return 'bg-emerald-500';
  if (fillPercentage >= 80) return 'bg-green-500';
  if (fillPercentage >= 60) return 'bg-yellow-500';
  if (fillPercentage >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

const getFulfillmentColorLight = (fillPercentage: number) => {
  if (fillPercentage >= 95) return 'bg-emerald-200';
  if (fillPercentage >= 80) return 'bg-green-200';
  if (fillPercentage >= 60) return 'bg-yellow-200';
  if (fillPercentage >= 40) return 'bg-orange-200';
  return 'bg-red-200';
};

// Timeline scales
const TIMELINE_SCALES = {
  day: { label: 'Day', hours: 24 },
  week: { label: 'Week', hours: 24 * 7 },
  month: { label: 'Month', hours: 24 * 30 }
};

export default function JobSchedulingTimelinePage() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [timelineScale, setTimelineScale] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useJobs({});
  const { data: shiftsData, isLoading: shiftsLoading, isError: shiftsError, refetch } = useShifts({ jobId: jobId as string });

  const job = jobsData?.find(j => j.id === jobId);
  const shifts = shiftsData || [];

  // Timeline date range based on scale
  const timelineRange = useMemo(() => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(addDays(currentDate, timelineScale === 'day' ? 0 : timelineScale === 'week' ? 6 : 29));
    return { start, end };
  }, [currentDate, timelineScale]);

  // Days in timeline
  const timelineDays = useMemo(() => {
    return eachDayOfInterval(timelineRange);
  }, [timelineRange]);

  // Organize shifts by date
  const shiftsByDate = useMemo(() => {
    const organized: Record<string, any[]> = {};
    
    shifts.forEach(shift => {
      const shiftDate = format(parseISO(shift.date), 'yyyy-MM-dd');
      if (!organized[shiftDate]) {
        organized[shiftDate] = [];
      }
      organized[shiftDate].push(shift);
    });

    return organized;
  }, [shifts]);

  const isLoading = jobsLoading || shiftsLoading;
  const isError = jobsError || shiftsError;

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view the job timeline.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!job ? 'Job not found' : 'Error loading job timeline'}
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
      </div>
    );
  }

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const days = timelineScale === 'day' ? 1 : timelineScale === 'week' ? 7 : 30;
    setCurrentDate(prev => addDays(prev, direction === 'next' ? days : -days));
  };

  const ShiftBar = ({ shift, dayWidth }: { shift: any, dayWidth: number }) => {
    const assigned = getAssignedWorkerCount(shift);
    const required = getTotalRequiredWorkers(shift);
    const fillPercentage = required > 0 ? (assigned / required) * 100 : 0;
    
    const crewChief = shift.assignments?.find((a: any) => a.workerType === 'crew_chief')?.user;
    
    const handleShiftClick = () => {
      setSelectedShift(selectedShift === shift.id ? null : shift.id);
    };

    const startHour = new Date(shift.startTime).getHours();
    const endHour = new Date(shift.endTime).getHours();
    const duration = endHour - startHour;
    const leftPosition = (startHour / 24) * dayWidth;
    const width = Math.max((duration / 24) * dayWidth, 60); // Minimum 60px width

    return (
      <div
        className="absolute cursor-pointer group transition-all duration-200 hover:z-10 hover:scale-105"
        style={{
          left: `${leftPosition}px`,
          width: `${width}px`,
          minHeight: '48px'
        }}
        onClick={handleShiftClick}
      >
        {/* Main shift bar */}
        <div className={`
          h-12 rounded-lg border-2 border-white shadow-lg overflow-hidden
          ${getFulfillmentColor(fillPercentage)} 
          group-hover:shadow-xl transition-all duration-200
        `}>
          {/* Two-tone fill indicator */}
          <div className="h-full flex">
            {/* Filled portion */}
            <div 
              className="h-full transition-all duration-300"
              style={{ width: `${fillPercentage}%` }}
            />
            {/* Unfilled portion */}
            <div 
              className={`h-full transition-all duration-300 ${getFulfillmentColorLight(fillPercentage)} opacity-50`}
              style={{ width: `${100 - fillPercentage}%` }}
            />
          </div>
          
          {/* Overlay content */}
          <div className="absolute inset-0 px-2 py-1 text-white text-xs font-medium flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="truncate flex-1">{shift.description || job.name}</span>
              <Badge variant="secondary" className="text-xs ml-1">
                {assigned}/{required}
              </Badge>
            </div>
            {crewChief && (
              <div className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                <span className="truncate text-xs">{crewChief.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Time indicator */}
        <div className="text-xs text-muted-foreground mt-1 text-center">
          {format(new Date(shift.startTime), 'HH:mm')}-{format(new Date(shift.endTime), 'HH:mm')}
        </div>
      </div>
    );
  };

  const ShiftDetailPanel = ({ shift }: { shift: any }) => {
    const assigned = getAssignedWorkerCount(shift);
    const required = getTotalRequiredWorkers(shift);
    
    // Group assignments by worker type
    const assignmentsByType = useMemo(() => {
      const groups: Record<string, any[]> = {
        crew_chief: [],
        fork_operator: [],
        stage_hand: [],
        general_labor: []
      };

      shift.assignments?.forEach((assignment: any) => {
        const type = assignment.workerType || 'general_labor';
        if (groups[type]) {
          groups[type].push(assignment);
        }
      });

      return groups;
    }, [shift]);

    const getWorkerTypeIcon = (type: string) => {
      switch (type) {
        case 'crew_chief': return <Crown className="h-4 w-4" />;
        case 'fork_operator': return <Truck className="h-4 w-4" />;
        case 'stage_hand': return <HardHat className="h-4 w-4" />;
        default: return <User className="h-4 w-4" />;
      }
    };

    const getWorkerTypeLabel = (type: string) => {
      switch (type) {
        case 'crew_chief': return 'Crew Chief';
        case 'fork_operator': return 'Fork Operator';
        case 'stage_hand': return 'Stage Hand';
        case 'general_labor': return 'General Labor';
        default: return 'Worker';
      }
    };

    const getRequiredCountForType = (type: string) => {
      switch (type) {
        case 'crew_chief': return shift.crew_chief_required || 0;
        case 'fork_operator': return shift.fork_operators_required || 0;
        case 'stage_hand': return shift.stage_hands_required || 0;
        case 'general_labor': return shift.general_labor_required || 0;
        default: return 0;
      }
    };

    return (
      <Card className="fixed top-20 right-6 w-96 max-h-[80vh] overflow-y-auto shadow-2xl z-50 border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{shift.description || job.name}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedShift(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(parseISO(shift.date), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
            </div>
          </div>
          {shift.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {shift.location}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Overall status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Overall Progress</span>
            <div className="flex items-center gap-2">
              <Badge variant={assigned >= required ? "default" : "destructive"}>
                {assigned}/{required} Workers
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({Math.round((assigned/required) * 100)}%)
              </span>
            </div>
          </div>

          {/* Worker type sections */}
          <div className="space-y-3">
            {Object.entries(assignmentsByType).map(([type, assignments]) => {
              const requiredCount = getRequiredCountForType(type);
              if (requiredCount === 0) return null;
              
              const colors = WORKER_TYPE_COLORS[type as keyof typeof WORKER_TYPE_COLORS] || WORKER_TYPE_COLORS.default;
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded ${colors.bg} ${colors.text}`}>
                        {getWorkerTypeIcon(type)}
                      </div>
                      <span className="font-medium">{getWorkerTypeLabel(type)}</span>
                    </div>
                    <Badge variant="outline">
                      {assignments.length}/{requiredCount}
                    </Badge>
                  </div>
                  
                  {/* Worker slots */}
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: requiredCount }, (_, index) => {
                      const assignment = assignments[index];
                      return (
                        <div
                          key={index}
                          className={`
                            p-2 rounded-md border-2 border-dashed min-h-[40px] flex items-center justify-center
                            ${assignment 
                              ? `${colors.bg} ${colors.text} border-transparent` 
                              : `${colors.light} border-gray-300 text-gray-600`
                            }
                          `}
                        >
                          {assignment ? (
                            <div className="text-center">
                              <div className="font-medium text-xs truncate">
                                {assignment.user?.name || 'Assigned'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-xs text-gray-500">Empty Slot</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status and actions */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <Badge variant={
                shift.status === ShiftStatus.Completed ? "default" :
                shift.status === ShiftStatus.InProgress ? "secondary" :
                "outline"
              }>
                {shift.status}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/jobs-shifts/${shift.id}`)}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto py-4">
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
                <h1 className="text-2xl font-bold">{job.name} - Timeline</h1>
                <p className="text-muted-foreground">
                  {job.company?.name} • {shifts.length} shifts
                </p>
              </div>
            </div>
            
            {/* Timeline controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateNavigation('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Tabs value={timelineScale} onValueChange={(value) => setTimelineScale(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateNavigation('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-0">
            {/* Date headers */}
            <div className="border-b bg-muted/30">
              <div className="flex">
                {timelineDays.map((day, index) => {
                  const dayWidth = Math.max(200, (window.innerWidth - 100) / timelineDays.length);
                  return (
                    <div
                      key={index}
                      className="flex-1 p-4 border-r last:border-r-0 text-center min-w-[200px]"
                      style={{ width: `${dayWidth}px` }}
                    >
                      <div className="font-semibold">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(day, 'MMM d')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline content */}
            <div className="relative min-h-[400px] overflow-x-auto">
              <div className="flex" style={{ minWidth: `${timelineDays.length * 200}px` }}>
                {timelineDays.map((day, dayIndex) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayShifts = shiftsByDate[dayKey] || [];
                  const dayWidth = Math.max(200, (window.innerWidth - 100) / timelineDays.length);

                  return (
                    <div
                      key={dayIndex}
                      className="border-r last:border-r-0 relative flex-shrink-0"
                      style={{ width: `${dayWidth}px`, minHeight: '400px' }}
                    >
                      {/* Hour markers */}
                      <div className="absolute inset-0 opacity-20">
                        {Array.from({ length: 24 }, (_, hour) => (
                          <div
                            key={hour}
                            className="absolute w-full border-t border-gray-300"
                            style={{ top: `${(hour / 24) * 100}%` }}
                          >
                            <span className="text-xs text-muted-foreground ml-1">
                              {hour}:00
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Shifts for this day */}
                      <div className="absolute inset-0 p-2">
                        {dayShifts.map((shift, shiftIndex) => (
                          <div
                            key={shift.id}
                            className="absolute left-2 right-2"
                            style={{ 
                              top: `${20 + (shiftIndex * 60)}px`,
                              zIndex: selectedShift === shift.id ? 20 : 10
                            }}
                          >
                            <ShiftBar shift={shift} dayWidth={dayWidth - 16} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift detail panel */}
      {selectedShift && (
        <ShiftDetailPanel 
          shift={shifts.find(s => s.id === selectedShift)} 
        />
      )}
    </div>
  );
}