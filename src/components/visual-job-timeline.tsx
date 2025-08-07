"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, MapPin } from 'lucide-react';

interface VisualJobTimelineProps {
  job: any;
  shifts: any[];
  onRefresh: () => void;
}

// Color palette for crew chiefs
const CREW_CHIEF_COLORS = [
  { bg: '#ef4444', light: '#fecaca', name: 'Red' },
  { bg: '#3b82f6', light: '#bfdbfe', name: 'Blue' },
  { bg: '#10b981', light: '#a7f3d0', name: 'Green' },
  { bg: '#f59e0b', light: '#fed7aa', name: 'Orange' },
  { bg: '#8b5cf6', light: '#c4b5fd', name: 'Purple' },
  { bg: '#06b6d4', light: '#a5f3fc', name: 'Cyan' },
  { bg: '#84cc16', light: '#d9f99d', name: 'Lime' },
  { bg: '#f97316', light: '#fed7aa', name: 'Orange' },
];

// Colors for different worker types
const WORKER_TYPE_COLORS = {
  crew_chief: { bg: '#7c3aed', light: '#c4b5fd', name: 'Crew Chief', icon: '👑' },
  stagehand: { bg: '#2563eb', light: '#bfdbfe', name: 'Stagehand', icon: '🔧' },
  fork_operator: { bg: '#ea580c', light: '#fed7aa', name: 'Fork Operator', icon: '🚛' },
  reach_fork_operator: { bg: '#dc2626', light: '#fecaca', name: 'Reach Fork Op', icon: '📦' },
  rigger: { bg: '#059669', light: '#a7f3d0', name: 'Rigger', icon: '⚡' },
  general_laborer: { bg: '#6b7280', light: '#d1d5db', name: 'General Labor', icon: '👷' },
};

export function VisualJobTimeline({ job, shifts, onRefresh }: VisualJobTimelineProps) {
  const [viewMode, setViewMode] = useState<'day' | '3days' | 'week' | 'full'>('full');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get unique crew chiefs and assign colors
  const crewChiefs = useMemo(() => {
    const chiefs = new Set<string>();
    shifts.forEach(shift => {
      if (shift.assignedPersonnel) {
        shift.assignedPersonnel.forEach((person: any) => {
          if (person.roleCode === 'CC') {
            chiefs.add(person.user.name);
          }
        });
      }
    });
    
    return Array.from(chiefs).map((name, index) => ({
      name,
      color: CREW_CHIEF_COLORS[index % CREW_CHIEF_COLORS.length]
    }));
  }, [shifts]);

  // Calculate date range based on view mode
  const displayDays = useMemo(() => {
    try {
      const jobStartDate = job.startDate ? new Date(job.startDate) : new Date();
      const jobEndDate = job.endDate ? new Date(job.endDate) : addDays(jobStartDate, 7);
      
      let startDate: Date;
      let endDate: Date;
      
      switch (viewMode) {
        case 'day':
          startDate = new Date(currentDate);
          endDate = new Date(currentDate);
          break;
        case '3days':
          startDate = new Date(currentDate);
          endDate = addDays(currentDate, 2);
          break;
        case 'week':
          startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start Monday
          endDate = addDays(startDate, 6);
          break;
        case 'full':
        default:
          startDate = jobStartDate;
          endDate = jobEndDate;
          break;
      }
      
      // Ensure we don't go outside job boundaries for non-full views
      if (viewMode !== 'full') {
        startDate = startDate < jobStartDate ? jobStartDate : startDate;
        endDate = endDate > jobEndDate ? jobEndDate : endDate;
      }
      
      const days = [];
      let current = new Date(startDate);
      
      while (current <= endDate) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }
      
      return days;
    } catch {
      return Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
    }
  }, [job.startDate, job.endDate, viewMode, currentDate]);
  
  // Time slots (6 AM to 11 PM in 1-hour increments)
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = 6 + i;
    return {
      hour,
      label: hour <= 12 ? `${hour}${hour === 12 ? 'PM' : 'AM'}` : `${hour - 12}PM`,
      position: (i / 17) * 100 // Percentage position
    };
  });

  // Get crew chief color and name for a shift
  const getCrewChiefInfo = (shift: any) => {
    const crewChief = shift.assignedPersonnel?.find((p: any) => p.roleCode === 'CC');
    if (!crewChief) {
      return { 
        color: CREW_CHIEF_COLORS[0], 
        name: 'Unassigned',
        isAssigned: false
      };
    }
    
    const chief = crewChiefs.find(c => c.name === crewChief.user.name);
    return { 
      color: chief?.color || CREW_CHIEF_COLORS[0], 
      name: crewChief.user.name,
      isAssigned: true
    };
  };

  // Calculate staffing details
  const getStaffingDetails = (shift: any) => {
    const required = (shift.requiredCrewChiefs || 0) + 
                   (shift.requiredStagehands || 0) + 
                   (shift.requiredForkOperators || 0) + 
                   (shift.requiredReachForkOperators || 0) + 
                   (shift.requiredRiggers || 0) + 
                   (shift.requiredGeneralLaborers || 0);
    
    const assigned = shift.assignedPersonnel?.length || 0;
    const filled = Math.min(assigned, required);
    const unfilled = Math.max(0, required - assigned);
    
    return {
      totalRequired: required,
      totalAssigned: assigned,
      filled,
      unfilled,
      percentage: required > 0 ? (assigned / required) * 100 : 0
    };
  };

  // Create individual worker type segments
  const createWorkerTypeSegments = (shift: any) => {
    const segments = [];
    let currentPosition = 0;
    
    // Define worker requirements in order
    const workerRequirements = [
      { type: 'crew_chief', required: shift.requiredCrewChiefs || 0 },
      { type: 'stagehand', required: shift.requiredStagehands || 0 },
      { type: 'fork_operator', required: shift.requiredForkOperators || 0 },
      { type: 'reach_fork_operator', required: shift.requiredReachForkOperators || 0 },
      { type: 'rigger', required: shift.requiredRiggers || 0 },
      { type: 'general_laborer', required: shift.requiredGeneralLaborers || 0 },
    ];
    
    const totalRequired = workerRequirements.reduce((sum, req) => sum + req.required, 0);
    
    if (totalRequired === 0) {
      return [{
        type: 'empty',
        workerType: 'empty',
        color: '#f3f4f6',
        width: 100,
        left: 0,
        filled: false,
        label: 'No workers required'
      }];
    }

    // Count assigned workers by type
    const assignedByType: Record<string, number> = {};
    shift.assignedPersonnel?.forEach((person: any) => {
      let workerType = '';
      switch (person.roleCode) {
        case 'CC': workerType = 'crew_chief'; break;
        case 'SH': workerType = 'stagehand'; break;
        case 'FO': workerType = 'fork_operator'; break;
        case 'RFO': workerType = 'reach_fork_operator'; break;
        case 'RG': workerType = 'rigger'; break;
        case 'GL': workerType = 'general_laborer'; break;
      }
      if (workerType) {
        assignedByType[workerType] = (assignedByType[workerType] || 0) + 1;
      }
    });

    workerRequirements.forEach(({ type, required }) => {
      if (required > 0) {
        const assigned = Math.min(assignedByType[type] || 0, required);
        const segmentWidth = (required / totalRequired) * 100;
        const workerTypeColor = WORKER_TYPE_COLORS[type as keyof typeof WORKER_TYPE_COLORS];
        
        // Create segments for this worker type
        for (let i = 0; i < required; i++) {
          const isFilled = i < assigned;
          const individualWidth = segmentWidth / required;
          
          segments.push({
            type: type,
            workerType: type,
            color: isFilled ? workerTypeColor.bg : workerTypeColor.light,
            width: individualWidth,
            left: currentPosition + (i * individualWidth),
            filled: isFilled,
            label: `${workerTypeColor.name} ${i + 1}/${required}`,
            icon: workerTypeColor.icon
          });
        }
        
        currentPosition += segmentWidth;
      }
    });
    
    return segments;
  };

  // Calculate shift position and width
  const getShiftPosition = (shift: any) => {
    try {
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      
      const startHour = startTime.getHours() + (startTime.getMinutes() / 60);
      const endHour = endTime.getHours() + (endTime.getMinutes() / 60);
      
      // Convert to percentage position (6 AM = 0%, 11 PM = 100%)
      const startPercent = Math.max(0, (startHour - 6) / 17 * 100);
      const endPercent = Math.min(100, (endHour - 6) / 17 * 100);
      const width = Math.max(2, endPercent - startPercent); // Minimum 2% width
      
      return { left: startPercent, width };
    } catch {
      return { left: 0, width: 10 }; // Fallback
    }
  };

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    displayDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = shifts.filter(shift => {
        try {
          const shiftDate = new Date(shift.date);
          return isSameDay(shiftDate, day);
        } catch {
          return false;
        }
      });
    });
    return grouped;
  }, [shifts, displayDays]);

  // Calculate display period info
  const periodInfo = useMemo(() => {
    if (displayDays.length === 0) return '';
    const startDate = displayDays[0];
    const endDate = displayDays[displayDays.length - 1];
    const totalDays = displayDays.length;
    
    const viewModeLabels = {
      day: 'Day View',
      '3days': '3-Day View', 
      week: 'Week View',
      full: 'Full Job'
    };
    
    if (totalDays === 1) {
      return `${viewModeLabels[viewMode]} - ${format(startDate, 'MMM d, yyyy')}`;
    }
    
    return `${viewModeLabels[viewMode]} - ${format(startDate, 'MMM d')} to ${format(endDate, 'MMM d, yyyy')} (${totalDays} days)`;
  }, [displayDays, viewMode]);
  
  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'full') return;
    
    const days = viewMode === 'day' ? 1 : viewMode === '3days' ? 3 : 7;
    setCurrentDate(addDays(currentDate, -days));
  };
  
  const goToNext = () => {
    if (viewMode === 'full') return;
    
    const days = viewMode === 'day' ? 1 : viewMode === '3days' ? 3 : 7;
    setCurrentDate(addDays(currentDate, days));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Visual Timeline</h2>
            <p className="text-muted-foreground">{job.name}</p>
            <p className="text-sm text-gray-600">📅 {periodInfo}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground mr-4">
              {shifts.length} total shifts | {displayDays.length} days shown
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </div>
        
        {/* View Mode Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">View:</span>
            <div className="flex items-center gap-1">
              {[
                { value: 'day', label: '1 Day' },
                { value: '3days', label: '3 Days' },
                { value: 'week', label: '1 Week' },
                { value: 'full', label: 'Full Job' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={viewMode === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setViewMode(option.value as typeof viewMode);
                    if (option.value !== 'full') {
                      // Set to job start date when switching to date-based views
                      const jobStart = job.startDate ? new Date(job.startDate) : new Date();
                      setCurrentDate(jobStart);
                    }
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Navigation Controls (only for non-full views) */}
          {viewMode !== 'full' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNext}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Worker Type Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Worker Type Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Worker Types */}
            <div>
              <h4 className="text-xs font-medium mb-2 text-gray-600">Worker Types</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(WORKER_TYPE_COLORS).map(([type, typeInfo]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: typeInfo.bg }}
                    />
                    <span className="text-xs">{typeInfo.icon} {typeInfo.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Crew Chiefs */}
            {crewChiefs.length > 0 && (
              <div>
                <h4 className="text-xs font-medium mb-2 text-gray-600">Crew Chiefs (Bar Borders)</h4>
                <div className="space-y-1">
                  {crewChiefs.map((chief) => (
                    <div key={chief.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded border-2"
                        style={{ borderColor: chief.color.bg, backgroundColor: 'transparent' }}
                      />
                      <span className="text-xs">👑 {chief.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-0">
          {/* Time header */}
          <div className="border-b bg-gray-50 p-4">
            <div className="flex">
              {/* Date column header */}
              <div className="w-32 flex items-center text-sm font-medium">
                Job Timeline
              </div>
              {/* Time slots header */}
              <div className="flex-1 relative h-8">
                {timeSlots.map((slot) => (
                  <div 
                    key={slot.hour}
                    className="absolute text-xs text-gray-600"
                    style={{ left: `${slot.position}%` }}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline rows */}
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {displayDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayShifts = shiftsByDate[dateKey] || [];
              
              return (
                <div key={dateKey} className="flex min-h-[120px]"> {/* Increased for taller bars with text */}
                  {/* Date column */}
                  <div className="w-32 p-4 border-r bg-gray-50/50">
                    <div className="text-sm font-medium">
                      {format(day, 'EEE, MMM d')}
                    </div>
                    <div className="text-xs text-gray-600">
                      {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Timeline area */}
                  <div className="flex-1 relative p-2">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {timeSlots.map((slot) => (
                        <div 
                          key={slot.hour}
                          className="absolute top-0 bottom-0 w-px bg-gray-200"
                          style={{ left: `${slot.position}%` }}
                        />
                      ))}
                    </div>

                    {/* Shift bars */}
                    {dayShifts.map((shift, index) => {
                      const position = getShiftPosition(shift);
                      const crewChiefInfo = getCrewChiefInfo(shift);
                      const staffing = getStaffingDetails(shift);
                      const workerSegments = createWorkerTypeSegments(shift);
                      const shiftLabel = shift.description || job.name;
                      
                      return (
                        <div
                          key={shift.id || index}
                          className="absolute group cursor-pointer transition-all hover:shadow-md hover:z-10"
                          style={{
                            left: `${position.left}%`,
                            width: `${position.width}%`,
                            top: `${4 + (index * 32)}px`, // Increased height for text overlay
                            height: '28px',
                          }}
                        >
                          {/* Main shift container with crew chief border color */}
                          <div 
                            className="relative h-full rounded border-2"
                            style={{
                              borderColor: crewChiefInfo.color.bg,
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            }}
                          >
                            {/* Individual worker type segments */}
                            {workerSegments.map((segment, segmentIndex) => (
                              <div
                                key={segmentIndex}
                                className="absolute h-full transition-opacity hover:opacity-90"
                                style={{
                                  left: `${segment.left}%`,
                                  width: `${segment.width}%`,
                                  backgroundColor: segment.color,
                                  borderRight: segmentIndex < workerSegments.length - 1 ? `1px solid rgba(0,0,0,0.1)` : 'none',
                                  opacity: segment.filled ? 0.9 : 0.75,
                                }}
                                title={segment.label}
                              >
                                {/* Worker type icon (for larger segments) */}
                                {segment.width > 8 && segment.icon && (
                                  <div className="absolute inset-0 flex items-center justify-center text-xs opacity-70">
                                    {segment.icon}
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* Text overlay */}
                            <div 
                              className="absolute inset-0 flex flex-col justify-center px-2 text-xs font-medium text-black pointer-events-none overflow-hidden"
                              style={{
                                textShadow: '0 0 3px rgba(255,255,255,0.8)',
                              }}
                            >
                              <div className="truncate leading-tight">
                                {shiftLabel.length > 30 ? `${shiftLabel.substring(0, 27)}...` : shiftLabel}
                              </div>
                              <div className="truncate text-xs opacity-80 leading-tight">
                                👑 {crewChiefInfo.name}
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced tooltip */}
                          <div className="absolute top-8 left-0 bg-black text-white text-xs rounded px-3 py-2 opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none max-w-xs">
                            <div className="font-medium mb-1">{shift.description || job.name}</div>
                            <div className="mb-1">{format(new Date(shift.startTime), 'h:mm a')} - {format(new Date(shift.endTime), 'h:mm a')}</div>
                            <div className="mb-1">👑 Crew Chief: {crewChiefInfo.name}</div>
                            <div className="mb-2">Workers: {staffing.filled}/{staffing.totalRequired} ({Math.round(staffing.percentage)}%)</div>
                            
                            {/* Worker breakdown by type */}
                            <div className="space-y-1 border-t border-gray-600 pt-1">
                              {Object.entries(WORKER_TYPE_COLORS).map(([type, typeInfo]) => {
                                const required = shift[`required${type.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join('')}s`] || 0;
                                if (required === 0) return null;
                                
                                const assignedCount = shift.assignedPersonnel?.filter((p: any) => {
                                  const roleMap: Record<string, string> = {
                                    'CC': 'crew_chief', 'SH': 'stagehand', 'FO': 'fork_operator',
                                    'RFO': 'reach_fork_operator', 'RG': 'rigger', 'GL': 'general_laborer'
                                  };
                                  return roleMap[p.roleCode] === type;
                                }).length || 0;
                                
                                return (
                                  <div key={type} className="flex items-center gap-2 text-xs">
                                    <div 
                                      className="w-2 h-2 rounded-sm" 
                                      style={{ backgroundColor: typeInfo.bg }}
                                    />
                                    <span>{typeInfo.icon} {typeInfo.name}: {assignedCount}/{required}</span>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {shift.location && <div className="mt-1 pt-1 border-t border-gray-600">📍 {shift.location}</div>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty state */}
                    {dayShifts.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        No shifts scheduled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="border-t bg-gray-50 p-4">
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span>
                    📅 <strong>{shifts.length}</strong> total shifts in this job
                  </span>
                  <span>
                    👥 <strong>{crewChiefs.length}</strong> crew chiefs assigned
                  </span>
                  <span>
                    📦 <strong>{shifts.reduce((total, shift) => total + getStaffingDetails(shift).totalRequired, 0)}</strong> total worker positions
                  </span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="space-y-2 text-xs text-gray-600 border-t pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-600 rounded-sm"></div>
                      Filled positions (darker)
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-200 rounded-sm opacity-75"></div>
                      Unfilled positions (lighter)
                    </span>
                    <span>🎨 Border color = crew chief | Segment color = worker type</span>
                  </div>
                  <span>💡 Each segment = 1 worker position by type</span>
                </div>
                <div className="text-center">
                  <span>📊 Hover over bars for detailed worker breakdown by type</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}