"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTimelineColors } from '@/hooks/use-timeline-colors';
import { getAssignedWorkerCount, getTotalRequiredWorkers } from '@/lib/worker-count-utils';
import { 
  Printer, 
  Download, 
  Calendar, 
  MapPin, 
  Building, 
  Hash,
  Crown, 
  User, 
  Truck, 
  HardHat,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Worker type configurations
const WORKER_TYPES = {
  crew_chief: { icon: Crown, label: 'Crew Chief', color: '#7c3aed' },
  fork_operator: { icon: Truck, label: 'Fork Operator', color: '#ea580c' },
  stage_hand: { icon: HardHat, label: 'Stage Hand', color: '#2563eb' },
  general_labor: { icon: User, label: 'General Labor', color: '#6b7280' }
};

interface JobReportProps {
  job: {
    id: string;
    jobNumber: string;
    title: string;
    description?: string;
    location: string;
    status: string;
    startDate: string;
    endDate: string;
    company?: {
      name: string;
      id: string;
    };
  };
  shifts: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
    status: string;
    crew_chief_required: number;
    fork_operators_required: number;
    stage_hands_required: number;
    general_labor_required: number;
    assignments?: Array<{
      id: string;
      workerType: string;
      user?: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  }>;
}

export function JobReport({ job, shifts }: JobReportProps) {
  // Calculate job totals
  const jobTotals = React.useMemo(() => {
    const totals = {
      crew_chief: 0,
      fork_operator: 0,
      stage_hand: 0,
      general_labor: 0,
      total: 0,
      shifts: shifts.length
    };

    shifts.forEach(shift => {
      totals.crew_chief += shift.crew_chief_required || 0;
      totals.fork_operator += shift.fork_operators_required || 0;
      totals.stage_hand += shift.stage_hands_required || 0;
      totals.general_labor += shift.general_labor_required || 0;
    });

    totals.total = totals.crew_chief + totals.fork_operator + totals.stage_hand + totals.general_labor;
    
    return totals;
  }, [shifts]);

  // Process shifts with assignment data
  const processedShifts = React.useMemo(() => {
    return shifts.map(shift => {
      const assignments = shift.assignments || [];
      
      // Count assigned workers by type
      const assignedCounts = {
        crew_chief: assignments.filter(a => a.workerType === 'crew_chief' && a.user).length,
        fork_operator: assignments.filter(a => a.workerType === 'fork_operator' && a.user).length,
        stage_hand: assignments.filter(a => a.workerType === 'stage_hand' && a.user).length,
        general_labor: assignments.filter(a => a.workerType === 'general_labor' && a.user).length
      };

      // Required workers by type
      const requiredCounts = {
        crew_chief: shift.crew_chief_required || 0,
        fork_operator: shift.fork_operators_required || 0,
        stage_hand: shift.stage_hands_required || 0,
        general_labor: shift.general_labor_required || 0
      };

      // Calculate totals
      const totalAssigned = Object.values(assignedCounts).reduce((sum, count) => sum + count, 0);
      const totalRequired = Object.values(requiredCounts).reduce((sum, count) => sum + count, 0);

      // Find assigned crew chief
      const crewChiefAssignment = assignments.find(a => a.workerType === 'crew_chief' && a.user);
      const assignedCrewChief = crewChiefAssignment?.user?.name || null;

      // Calculate fill percentage
      const fillPercentage = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

      return {
        ...shift,
        assignedCounts,
        requiredCounts,
        totalAssigned,
        totalRequired,
        assignedCrewChief,
        fillPercentage
      };
    });
  }, [shifts]);

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle };
      case 'active':
      case 'in_progress':
        return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Clock };
      case 'pending':
        return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertCircle };
      case 'cancelled':
        return { color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle };
      default:
        return { color: 'text-gray-600 bg-gray-50 border-gray-200', icon: FileText };
    }
  };

  const jobStatusInfo = getStatusInfo(job.status);
  const JobStatusIcon = jobStatusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Job Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">{job.title}</h1>
                  <p className="text-muted-foreground">Job Report</p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className={`${jobStatusInfo.color} flex items-center gap-1`}>
              <JobStatusIcon className="h-3 w-3" />
              {job.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Job Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Job Number</p>
                <p className="text-lg font-bold">{job.jobNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Company</p>
                <p className="text-lg font-bold">{job.company?.name || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-lg font-bold">{job.location}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-lg font-bold">
                  {format(parseISO(job.startDate), 'MMM d')} - {format(parseISO(job.endDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Job Description */}
          {job.description && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-1">Description</p>
              <p className="text-sm text-muted-foreground">{job.description}</p>
            </div>
          )}

          {/* Job Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{jobTotals.shifts}</p>
              <p className="text-sm text-muted-foreground">Total Shifts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{jobTotals.crew_chief}</p>
              <p className="text-sm text-muted-foreground">Crew Chiefs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{jobTotals.fork_operator}</p>
              <p className="text-sm text-muted-foreground">Fork Operators</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{jobTotals.stage_hand}</p>
              <p className="text-sm text-muted-foreground">Stage Hands</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{jobTotals.general_labor}</p>
              <p className="text-sm text-muted-foreground">General Labor</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shift Details ({processedShifts.length} shifts)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {processedShifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shifts found for this job</p>
            </div>
          ) : (
            processedShifts.map((shift, index) => {
              const shiftStatusInfo = getStatusInfo(shift.status);
              const ShiftStatusIcon = shiftStatusInfo.icon;
              
              return (
                <div key={shift.id} className="border rounded-lg p-4 space-y-4">
                  {/* Shift Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Shift #{index + 1}</h3>
                        <Badge variant="outline" className={`${shiftStatusInfo.color} text-xs`}>
                          <ShiftStatusIcon className="h-3 w-3 mr-1" />
                          {shift.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(shift.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(parseISO(shift.startTime), 'h:mm a')} - {format(parseISO(shift.endTime), 'h:mm a')}
                        </div>
                      </div>
                      {shift.description && (
                        <p className="text-sm text-muted-foreground mt-2">{shift.description}</p>
                      )}
                    </div>
                    
                    {/* Fill Status */}
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {shift.totalAssigned}/{shift.totalRequired}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {shift.fillPercentage.toFixed(0)}% filled
                      </div>
                      <div className="w-20 h-2 bg-muted rounded-full mt-1">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            shift.fillPercentage >= 100 ? 'bg-green-500' : 
                            shift.fillPercentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(shift.fillPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Assigned Crew Chief */}
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <Crown className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Assigned Crew Chief</p>
                      <p className="text-purple-700">
                        {shift.assignedCrewChief || (
                          <span className="text-red-600 font-medium">⚠ No crew chief assigned</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Worker Type Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(WORKER_TYPE_CONFIG).map(([type, config]) => {
                      const required = shift.requiredCounts[type as keyof typeof shift.requiredCounts];
                      const assigned = shift.assignedCounts[type as keyof typeof shift.assignedCounts];
                      const IconComponent = config.icon;
                      
                      // Only show worker types that are required (> 0)
                      if (required === 0) return null;
                      
                      const isFullyStaffed = assigned >= required;
                      const fillPercentage = required > 0 ? (assigned / required) * 100 : 0;
                      
                      return (
                        <div 
                          key={type} 
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isFullyStaffed 
                              ? 'bg-green-50 border-green-200' 
                              : assigned > 0 
                                ? 'bg-yellow-50 border-yellow-200'
                                : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-6 h-6 rounded flex items-center justify-center"
                              style={{ backgroundColor: config.color }}
                            >
                              <IconComponent className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">
                                {assigned}/{required}
                              </span>
                              <span className={`text-xs font-medium ${
                                isFullyStaffed ? 'text-green-600' : 
                                assigned > 0 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {fillPercentage.toFixed(0)}%
                              </span>
                            </div>
                            
                            <div className="w-full h-1.5 bg-white rounded-full">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isFullyStaffed ? 'bg-green-500' : 
                                  assigned > 0 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}