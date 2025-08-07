"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInHours } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  ArrowLeft, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Crown, 
  Truck, 
  HardHat, 
  Filter,
  Search,
  Maximize2,
  Minimize2,
  BarChart3,
  Settings,
  Palette,
  RotateCcw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getAssignedWorkerCount, getTotalRequiredWorkers } from '@/lib/worker-count-utils';
import EnhancedWorkerSelector from './EnhancedWorkerSelector';
import { TimelineColorLegend } from './timeline-color-legend';
import { useTimelineColors } from '@/hooks/use-timeline-colors';

interface EnhancedJobTimelineProps {
  jobId: string;
  job: any;
  shifts: any[];
  users?: any[]; // Available users for assignment
  isLoading?: boolean;
  onRefresh?: () => void;
  onUpdateAssignment?: (shiftId: string, assignmentId: string | null, userId: string | null, workerType: string) => Promise<void>;
}

// Crew chief color palette - distinctive colors for easy identification
const CREW_CHIEF_COLORS = [
  { bg: '#e11d48', light: '#fecdd3', name: 'Rose' }, // Rose
  { bg: '#dc2626', light: '#fed7d7', name: 'Red' }, // Red
  { bg: '#ea580c', light: '#fed7aa', name: 'Orange' }, // Orange
  { bg: '#ca8a04', light: '#fef3c7', name: 'Amber' }, // Amber
  { bg: '#65a30d', light: '#d9f99d', name: 'Lime' }, // Lime
  { bg: '#059669', light: '#a7f3d0', name: 'Emerald' }, // Emerald
  { bg: '#0891b2', light: '#a5f3fc', name: 'Cyan' }, // Cyan
  { bg: '#2563eb', light: '#bfdbfe', name: 'Blue' }, // Blue
  { bg: '#7c3aed', light: '#c4b5fd', name: 'Violet' }, // Violet
  { bg: '#c026d3', light: '#f0abfc', name: 'Fuchsia' }, // Fuchsia
  { bg: '#be185d', light: '#f9a8d4', name: 'Pink' }, // Pink
  { bg: '#374151', light: '#d1d5db', name: 'Gray' }, // Gray
];

// Worker type icons and labels
const WORKER_TYPES = {
  crew_chief: { icon: Crown, label: 'Crew Chief', color: '#7c3aed' },
  fork_operator: { icon: Truck, label: 'Fork Operator', color: '#ea580c' },
  stage_hand: { icon: HardHat, label: 'Stage Hand', color: '#2563eb' },
  general_labor: { icon: User, label: 'General Labor', color: '#6b7280' }
};



export function EnhancedJobTimelineScheduler({ 
  jobId, 
  job, 
  shifts = [], 
  users = [],
  isLoading = false, 
  onRefresh,
  onUpdateAssignment
}: EnhancedJobTimelineProps) {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Check if current user is admin
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  
  // State management
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | '2week' | 'month'>('2week');
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100); // Percentage
  const [filterCrewChief, setFilterCrewChief] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedShiftForAssignment, setSelectedShiftForAssignment] = useState<string | null>(null);
  
  // Timeline colors hook
  const {
    colors,
    isAdmin: isColorAdmin,
    getWorkerTypeColor,
    getCrewChiefColor,
    updateCrewChiefColor,
    updateWorkerTypeColor,
    resetColors
  } = useTimelineColors();





  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const start = startOfWeek(currentWeek);
    const daysToAdd = viewMode === 'week' ? 6 : viewMode === '2week' ? 13 : 29;
    const end = addDays(start, daysToAdd);
    return { start, end };
  }, [currentWeek, viewMode]);

  // Generate timeline days
  const timelineDays = useMemo(() => {
    return eachDayOfInterval(dateRange);
  }, [dateRange]);

  // Extract unique crew chiefs and assign colors
  const crewChiefs = useMemo(() => {
    const chiefs = new Set<string>();
    shifts.forEach(shift => {
      shift.assignments?.forEach((assignment: any) => {
        if (assignment.workerType === 'crew_chief' && assignment.user?.name) {
          chiefs.add(assignment.user.name);
        }
      });
    });
    
    return Array.from(chiefs).map((name) => ({
      name,
      color: getCrewChiefColor(name)
    }));
  }, [shifts, getCrewChiefColor]);



  // Helper function to generate light color from main color
  const generateLightColor = (color: string) => {
    // Simple function to lighten a hex color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Make it lighter by blending with white
    const lightR = Math.round(r + (255 - r) * 0.7);
    const lightG = Math.round(g + (255 - g) * 0.7);
    const lightB = Math.round(b + (255 - b) * 0.7);
    
    return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
  };

  // Color management functions


  // Helper functions for date/time formatting
  const formatSimpleDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'MM/dd/yyyy');
  };

  const formatSimpleTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'h:mm a');
  };

  // Filter and process shifts
  const processedShifts = useMemo(() => {
    return shifts
      .filter(shift => {
        // Date range filter
        const shiftDate = parseISO(shift.date);
        if (shiftDate < dateRange.start || shiftDate > dateRange.end) return false;
        
        // Search filter
        if (searchQuery && !shift.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        // Status filter
        if (filterStatus !== 'all' && shift.status !== filterStatus) return false;
        
        // Crew chief filter
        if (filterCrewChief !== 'all') {
          const hasCrewChief = shift.assignments?.some((a: any) => 
            a.workerType === 'crew_chief' && a.user?.name === filterCrewChief
          );
          if (!hasCrewChief) return false;
        }
        
        return true;
      })
      .map(shift => {
        const assigned = getAssignedWorkerCount(shift);
        const required = getTotalRequiredWorkers(shift);
        const fillPercentage = required > 0 ? (assigned / required) * 100 : 0;
        
        const crewChiefAssignment = shift.assignments?.find((a: any) => a.workerType === 'crew_chief');
        const crewChiefName = crewChiefAssignment?.user?.name;
        const crewChiefColor = crewChiefs.find(cc => cc.name === crewChiefName)?.color || CREW_CHIEF_COLORS[0];
        
        return {
          ...shift,
          assigned,
          required,
          fillPercentage,
          crewChiefName,
          crewChiefColor
        };
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [shifts, dateRange, searchQuery, filterStatus, filterCrewChief, crewChiefs]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    processedShifts.forEach(shift => {
      const dateKey = format(parseISO(shift.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(shift);
    });
    return grouped;
  }, [processedShifts]);

  // Navigation handlers
  const navigateWeek = (direction: 'prev' | 'next') => {
    const days = viewMode === 'week' ? 7 : viewMode === '2week' ? 14 : 30;
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? days : -days));
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      if (direction === 'in') return Math.min(prev + 25, 200);
      return Math.max(prev - 25, 50);
    });
  };

  // Render shift bar component with individual worker slots
  const ShiftBar = ({ shift, dayWidth }: { shift: any; dayWidth: number }) => {
    // Parse shift times properly - handle different formats
    let startTime: Date;
    let endTime: Date;
    
    try {
      // Handle different date formats for startTime
      if (typeof shift.startTime === 'string') {
        // If it's a time string like "09:00", combine with shift date
        if (shift.startTime.includes(':') && !shift.startTime.includes('T')) {
          const shiftDate = new Date(shift.date);
          const [hours, minutes] = shift.startTime.split(':').map(Number);
          startTime = new Date(shiftDate);
          startTime.setHours(hours, minutes, 0, 0);
        } else {
          startTime = parseISO(shift.startTime);
        }
      } else {
        startTime = new Date(shift.startTime);
      }

      // Handle different date formats for endTime
      if (typeof shift.endTime === 'string') {
        // If it's a time string like "17:00", combine with shift date
        if (shift.endTime.includes(':') && !shift.endTime.includes('T')) {
          const shiftDate = new Date(shift.date);
          const [hours, minutes] = shift.endTime.split(':').map(Number);
          endTime = new Date(shiftDate);
          endTime.setHours(hours, minutes, 0, 0);
          
          // Handle overnight shifts
          if (endTime <= startTime) {
            endTime.setDate(endTime.getDate() + 1);
          }
        } else {
          endTime = parseISO(shift.endTime);
        }
      } else {
        endTime = new Date(shift.endTime);
      }
    } catch (error) {
      console.warn('Error parsing shift times:', error);
      // Fallback to basic parsing
      startTime = new Date(shift.startTime);
      endTime = new Date(shift.endTime);
    }
    
    const duration = differenceInHours(endTime, startTime);
    
    // Calculate position and width based on 24-hour day
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const leftPosition = (startHour / 24) * dayWidth;
    const barWidth = Math.max((duration / 24) * dayWidth, 80); // Increased minimum width
    
    const handleClick = () => {
      setSelectedShift(selectedShift === shift.id ? null : shift.id);
    };

    const handleRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setSelectedShiftForAssignment(selectedShiftForAssignment === shift.id ? null : shift.id);
    };

    // Calculate worker requirements by type
    const workerRequirements = [
      { type: 'crew_chief', required: shift.crew_chief_required || 0, color: getWorkerTypeColor('crew_chief') },
      { type: 'fork_operator', required: shift.fork_operators_required || 0, color: getWorkerTypeColor('fork_operator') },
      { type: 'stage_hand', required: shift.stage_hands_required || 0, color: getWorkerTypeColor('stage_hand') },
      { type: 'general_labor', required: shift.general_labor_required || 0, color: getWorkerTypeColor('general_labor') }
    ].filter(req => req.required > 0);

    // Calculate assigned workers by type
    const assignedByType = {
      crew_chief: shift.assignments?.filter((a: any) => a.workerType === 'crew_chief').length || 0,
      fork_operator: shift.assignments?.filter((a: any) => a.workerType === 'fork_operator').length || 0,
      stage_hand: shift.assignments?.filter((a: any) => a.workerType === 'stage_hand').length || 0,
      general_labor: shift.assignments?.filter((a: any) => a.workerType === 'general_labor').length || 0
    };

    // Create individual worker slots
    const workerSlots: Array<{ type: string; color: string; isFilled: boolean; workerName?: string }> = [];
    
    workerRequirements.forEach(requirement => {
      const assigned = assignedByType[requirement.type as keyof typeof assignedByType] || 0;
      const assignmentsOfType = shift.assignments?.filter((a: any) => a.workerType === requirement.type) || [];
      
      // Add filled slots first
      for (let i = 0; i < Math.min(assigned, requirement.required); i++) {
        workerSlots.push({
          type: requirement.type,
          color: requirement.color,
          isFilled: true,
          workerName: assignmentsOfType[i]?.user?.name
        });
      }
      
      // Add empty slots
      for (let i = assigned; i < requirement.required; i++) {
        workerSlots.push({
          type: requirement.type,
          color: requirement.color,
          isFilled: false
        });
      }
    });

    const slotHeight = Math.max(6, Math.min(12, Math.floor(32 / Math.max(workerSlots.length, 1)) - 1));
    const totalSlotsHeight = workerSlots.length * slotHeight + (workerSlots.length - 1) * 1; // 1px gap between slots

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute cursor-pointer group transition-all duration-200 hover:z-20 hover:scale-105"
              style={{
                left: `${leftPosition}px`,
                width: `${barWidth}px`,
                height: '44px', // Increased height to accommodate worker slots
                zIndex: selectedShift === shift.id ? 30 : 10
              }}
              onClick={handleClick}
              onContextMenu={handleRightClick}
              title="Left click for details, Right click for worker assignment"
            >
              {/* Main container */}
              <div 
                className={`
                  h-10 rounded-md border-2 border-white shadow-md overflow-hidden relative bg-white
                  ${selectedShift === shift.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  group-hover:shadow-lg transition-all duration-200
                `}
              >
                {/* Background color indicator */}
                <div 
                  className="absolute inset-0 opacity-10 rounded"
                  style={{ backgroundColor: shift.crewChiefColor.bg }}
                />

                {/* Individual worker slot bars */}
                <div 
                  className="absolute inset-1 flex flex-col justify-center gap-px"
                  style={{ padding: '2px' }}
                >
                  {workerSlots.map((slot, index) => (
                    <div
                      key={index}
                      className={`
                        rounded-sm transition-all duration-200 relative overflow-hidden
                        ${slot.isFilled ? 'opacity-100' : 'opacity-75'}
                      `}
                      style={{ 
                        backgroundColor: slot.color,
                        height: `${slotHeight}px`,
                        minHeight: '4px'
                      }}
                      title={slot.isFilled ? `${slot.workerName || 'Assigned'} (${slot.type})` : `Empty ${slot.type} slot`}
                    >
                      {/* Slot indicator */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {slot.isFilled ? (
                          <div className="w-1 h-1 bg-white rounded-full opacity-80" />
                        ) : (
                          <div className="w-1 h-1 border border-white rounded-full opacity-60" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Content overlay */}
                <div className="absolute inset-0 px-2 flex items-center justify-between text-xs font-medium pointer-events-none">
                  <span className="truncate flex-1 text-gray-800 bg-white/80 px-1 rounded text-[10px]">
                    {shift.description || job.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-1 bg-white/90">
                    {shift.assigned}/{shift.required}
                  </Badge>
                </div>
              </div>

              {/* Time label */}
              <div className="text-[10px] text-muted-foreground mt-1 text-center">
                {formatSimpleTime(startTime)}-{formatSimpleTime(endTime)}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{shift.description || job.name}</p>
              <p>Date: {formatSimpleDate(shift.date)}</p>
              <p>Time: {formatSimpleTime(startTime)} - {formatSimpleTime(endTime)}</p>
              <p>Workers: {shift.assigned}/{shift.required} ({Math.round(shift.fillPercentage)}%)</p>
              {shift.crewChiefName && <p>Crew Chief: {shift.crewChiefName}</p>}
              {shift.location && <p>Location: {shift.location}</p>}
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium">Worker Breakdown:</p>
                {workerRequirements.map(req => {
                  const assigned = assignedByType[req.type as keyof typeof assignedByType];
                  return (
                    <p key={req.type} className="text-xs">
                      {WORKER_TYPES[req.type as keyof typeof WORKER_TYPES]?.label}: {assigned}/{req.required}
                    </p>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                <p>Left click: View details | Right click: Manage workers</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render shift details panel
  const ShiftDetailsPanel = ({ shift }: { shift: any }) => {
    if (!shift) return null;

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

    const getRequiredCount = (type: string) => {
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
              ×
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatSimpleDate(shift.date)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatSimpleTime(shift.startTime)} - {formatSimpleTime(shift.endTime)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Overall progress */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Staffing Progress</span>
              <Badge variant={shift.assigned >= shift.required ? "default" : "destructive"}>
                {shift.assigned}/{shift.required} ({Math.round(shift.fillPercentage)}%)
              </Badge>
            </div>
            <Progress value={shift.fillPercentage} className="h-2" />
          </div>

          {/* Worker type breakdown */}
          <div className="space-y-3">
            {Object.entries(assignmentsByType).map(([type, assignments]) => {
              const required = getRequiredCount(type);
              if (required === 0) return null;
              
              const WorkerIcon = WORKER_TYPES[type as keyof typeof WORKER_TYPES]?.icon || User;
              const label = WORKER_TYPES[type as keyof typeof WORKER_TYPES]?.label || 'Worker';
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: getWorkerTypeColor(type) }}
                      >
                        <WorkerIcon className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{label}</span>
                    </div>
                    <Badge variant="outline">
                      {assignments.length}/{required}
                    </Badge>
                  </div>
                  
                  {/* Worker list */}
                  <div className="ml-6 space-y-1">
                    {assignments.map((assignment: any, index: number) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {assignment.user?.name || 'Unnamed Worker'}
                      </div>
                    ))}
                    {Array.from({ length: required - assignments.length }, (_, index) => (
                      <div key={`empty-${index}`} className="text-sm text-muted-foreground opacity-50">
                        [Empty Slot]
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse h-8 w-48 bg-muted rounded" />
          <div className="flex gap-2">
            <div className="animate-pulse h-10 w-32 bg-muted rounded" />
            <div className="animate-pulse h-10 w-32 bg-muted rounded" />
          </div>
        </div>
        <div className="animate-pulse h-96 w-full bg-muted rounded" />
      </div>
    );
  }

  const selectedShiftData = processedShifts.find(s => s.id === selectedShift);
  const dayWidth = Math.max(240 * (zoomLevel / 100), 160); // Increased from 180 to 240 for wider days

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
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
            <h1 className="text-2xl font-bold">Job Timeline Manager</h1>
            <p className="text-muted-foreground">{job.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLegend(!showLegend)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
            </div>

            {/* Filters */}
            <Select value={filterCrewChief} onValueChange={setFilterCrewChief}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Crew Chief" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crew Chiefs</SelectItem>
                {crewChiefs.map((cc) => (
                  <SelectItem key={cc.name} value={cc.name}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cc.color.bg }}
                      />
                      {cc.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">1 Week</SelectItem>
                <SelectItem value="2week">2 Weeks</SelectItem>
                <SelectItem value="month">1 Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-12 text-center">
                {zoomLevel}%
              </span>
              <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Color Legend */}
      <TimelineColorLegend
        crewChiefs={crewChiefs}
        workerTypes={WORKER_TYPES}
        customCrewChiefColors={colors.crewChiefColors}
        customWorkerTypeColors={colors.workerTypeColors}
        isAdmin={isColorAdmin}
        isVisible={showLegend}
        onToggleVisibility={() => setShowLegend(!showLegend)}
        onUpdateCrewChiefColor={updateCrewChiefColor}
        onUpdateWorkerTypeColor={updateWorkerTypeColor}
        onResetColors={resetColors}
      />



      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Timeline - {format(dateRange.start, 'MMM d')} to {format(dateRange.end, 'MMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-fit p-4" style={{ width: `${dayWidth * timelineDays.length}px` }}>
              {/* Header row with dates */}
              <div className="flex border-b pb-2 mb-4">
                {timelineDays.map((day) => (
                  <div 
                    key={day.toISOString()} 
                    className="flex-none border-r border-muted last:border-r-0 px-2"
                    style={{ width: `${dayWidth}px` }}
                  >
                    <div className="text-center">
                      <div className="font-medium">{format(day, 'EEE')}</div>
                      <div className="text-sm text-muted-foreground">{format(day, 'MMM d')}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline grid */}
              <div className="relative min-h-[32rem]"> {/* Increased from min-h-96 to accommodate larger shift bars */}
                {/* Vertical day separators */}
                {timelineDays.map((day, index) => (
                  <div
                    key={`separator-${day.toISOString()}`}
                    className="absolute top-0 bottom-0 border-r-2 border-muted/50 shadow-sm"
                    style={{ left: `${index * dayWidth + dayWidth}px` }}
                  />
                ))}

                {/* Day background alternating colors */}
                {timelineDays.map((day, index) => (
                  <div
                    key={`bg-${day.toISOString()}`}
                    className={`absolute top-0 bottom-0 ${index % 2 === 0 ? 'bg-muted/5' : 'bg-muted/10'}`}
                    style={{ 
                      left: `${index * dayWidth}px`,
                      width: `${dayWidth}px`
                    }}
                  />
                ))}

                {/* Hour grid lines (every 6 hours) */}
                {[6, 12, 18].map((hour) => (
                  timelineDays.map((day, dayIndex) => (
                    <div
                      key={`hour-${dayIndex}-${hour}`}
                      className="absolute top-0 bottom-0 border-r border-dashed border-muted/20"
                      style={{ left: `${dayIndex * dayWidth + (hour / 24) * dayWidth}px` }}
                    />
                  ))
                ))}

                {/* Shift bars */}
                {timelineDays.map((day, dayIndex) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayShifts = shiftsByDate[dateKey] || [];

                  return (
                    <div key={dateKey} className="absolute" style={{ left: `${dayIndex * dayWidth}px`, width: `${dayWidth}px` }}>
                      {dayShifts.map((shift, shiftIndex) => (
                        <div
                          key={shift.id}
                          style={{ top: `${shiftIndex * 70 + 20}px` }} // Increased spacing from 60 to 70 for better separation
                        >
                          <ShiftBar shift={shift} dayWidth={dayWidth} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Time ruler at bottom */}
              <div className="flex border-t pt-2 mt-4">
                {timelineDays.map((day) => (
                  <div 
                    key={`ruler-${day.toISOString()}`}
                    className="flex-none border-r border-muted last:border-r-0"
                    style={{ width: `${dayWidth}px` }}
                  >
                    <div className="flex justify-between px-2 text-xs text-muted-foreground">
                      <span>6AM</span>
                      <span>12PM</span>
                      <span>6PM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Shift details panel */}
      {selectedShiftData && <ShiftDetailsPanel shift={selectedShiftData} />}

      {/* Assignment details panel */}
      {selectedShiftForAssignment && (
        <AssignmentDetailsPanel 
          shift={processedShifts.find(s => s.id === selectedShiftForAssignment)} 
          users={users}
          onClose={() => setSelectedShiftForAssignment(null)}
          onUpdateAssignment={onUpdateAssignment}
          getWorkerTypeColor={getWorkerTypeColor}
        />
      )}
    </div>
  );
}

// Assignment Details Panel Component
const AssignmentDetailsPanel = ({ 
  shift, 
  users, 
  onClose, 
  onUpdateAssignment,
  getWorkerTypeColor 
}: { 
  shift: any; 
  users: any[];
  onClose: () => void;
  onUpdateAssignment?: (shiftId: string, assignmentId: string | null, userId: string | null, workerType: string) => Promise<void>;
  getWorkerTypeColor: (type: string) => string;
}) => {
  if (!shift) return null;

  // Format date and time helpers (local to component)
  const formatSimpleDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'MM/dd/yyyy');
  };

  const formatSimpleTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'h:mm a');
  };

  // Worker type configuration with icons
  const WORKER_TYPES_LOCAL = {
    crew_chief: { icon: Crown, label: 'Crew Chief', color: '#7c3aed' },
    fork_operator: { icon: Truck, label: 'Fork Operator', color: '#ea580c' },
    stage_hand: { icon: HardHat, label: 'Stage Hand', color: '#2563eb' },
    general_labor: { icon: User, label: 'General Labor', color: '#6b7280' }
  };

  // Build assignment slots by worker type
  const assignmentSlots = useMemo(() => {
    const slots: Array<{
      workerType: string;
      label: string;
      icon: any;
      color: string;
      required: number;
      assignments: any[];
      emptySlots: number;
    }> = [];

    // Process each worker type
    Object.entries(WORKER_TYPES_LOCAL).forEach(([type, config]) => {
      const required = shift[`${type}_required`] || 0;
      if (required === 0) return;

      const assignments = shift.assignments?.filter((a: any) => a.workerType === type) || [];
      const emptySlots = Math.max(0, required - assignments.length);

      slots.push({
        workerType: type,
        label: config.label,
        icon: config.icon,
        color: getWorkerTypeColor(type),
        required,
        assignments,
        emptySlots
      });
    });

    return slots;
  }, [shift, getWorkerTypeColor]);

  const handleAssignmentChange = async (assignmentId: string | null, userId: string | null, workerType: string) => {
    if (onUpdateAssignment) {
      await onUpdateAssignment(shift.id, assignmentId, userId, workerType);
    }
  };

  return (
    <Card className="fixed top-20 right-6 w-[28rem] max-h-[80vh] overflow-y-auto shadow-2xl z-50 border-2 border-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Worker Assignment Manager
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            ×
          </Button>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-base">{shift.description || 'Unnamed Shift'}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatSimpleDate(shift.date)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatSimpleTime(shift.startTime)} - {formatSimpleTime(shift.endTime)}
            </div>
          </div>
          {shift.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {shift.location}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Staffing overview */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Staffing</span>
            <Badge variant={shift.assigned >= shift.required ? "default" : "destructive"}>
              {shift.assigned}/{shift.required} workers
            </Badge>
          </div>
          <Progress value={shift.fillPercentage} className="h-2" />
        </div>

        {/* Worker assignment slots */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Worker Assignments</h4>
          
          {assignmentSlots.map((slot) => {
            const IconComponent = slot.icon;
            
            return (
              <div key={slot.workerType} className="space-y-3">
                {/* Worker type header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: slot.color }}
                    >
                      <IconComponent className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-medium text-sm">{slot.label}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {slot.assignments.length}/{slot.required}
                  </Badge>
                </div>

                {/* Existing assignments */}
                {slot.assignments.map((assignment: any, index: number) => (
                  <div key={assignment.id} className="ml-6 p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: slot.color }}
                        />
                        <span className="text-sm font-medium">Position {index + 1}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assigned
                      </div>
                    </div>
                    <div className="mt-2">
                      <EnhancedWorkerSelector
                        users={users}
                        selectedUserId={assignment.userId}
                        onChange={(userId) => handleAssignmentChange(assignment.id, userId, slot.workerType)}
                        requiredRole={slot.workerType}
                        disabled={!onUpdateAssignment}
                      />
                    </div>
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: slot.emptySlots }, (_, index) => (
                  <div key={`empty-${index}`} className="ml-6 p-3 border border-dashed rounded-lg bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border-2 border-dashed"
                          style={{ borderColor: slot.color }}
                        />
                        <span className="text-sm text-muted-foreground">Position {slot.assignments.length + index + 1}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Unassigned
                      </div>
                    </div>
                    <div className="mt-2">
                      <EnhancedWorkerSelector
                        users={users}
                        selectedUserId={null}
                        onChange={(userId) => handleAssignmentChange(null, userId, slot.workerType)}
                        requiredRole={slot.workerType}
                        disabled={!onUpdateAssignment}
                        showQuestionMark={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Help text */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>• Select workers from the dropdowns to assign them to positions</p>
          <p>• Each position must be filled with a qualified worker</p>
          <p>• Changes are saved automatically</p>
        </div>
      </CardContent>
    </Card>
  );
};