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

interface EnhancedJobReportProps {
  job: {
    id: string;
    jobNumber: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    status: string;
    company?: {
      name: string;
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
      };
    }>;
  }>;
  isPrintMode?: boolean;
}

export function EnhancedJobReport({ job, shifts, isPrintMode = false }: EnhancedJobReportProps) {
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { getWorkerTypeColor, getCrewChiefColor } = useTimelineColors();

  // Type guard function for shifts
  const isValidShiftsArray = (data: any): data is Array<any> => {
    return data && Array.isArray(data) && data.every(item => item && typeof item === 'object');
  };

  // Robust shifts validation with debugging
  const shiftsArray = React.useMemo(() => {
    if (!shifts) {
      console.warn('EnhancedJobReport: shifts is null/undefined, using empty array');
      return [];
    }
    if (!Array.isArray(shifts)) {
      console.warn('EnhancedJobReport: shifts is not an array:', typeof shifts, shifts);
      return [];
    }
    if (!isValidShiftsArray(shifts)) {
      console.warn('EnhancedJobReport: shifts array contains invalid items, filtering valid ones');
      return shifts.filter(item => item && typeof item === 'object');
    }
    return shifts;
  }, [shifts]);

  // Early return if no valid shifts data
  if (!shiftsArray || shiftsArray.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No shift data available for this job report.</p>
      </div>
    );
  }

  // Calculate job totals
  const jobTotals = React.useMemo(() => {
    const totals = {
      shifts: shiftsArray.length,
      totalRequired: 0,
      totalAssigned: 0,
      crewChiefRequired: 0,
      forkOperatorRequired: 0,
      stageHandRequired: 0,
      generalLaborRequired: 0,
      crewChiefAssigned: 0,
      forkOperatorAssigned: 0,
      stageHandAssigned: 0,
      generalLaborAssigned: 0
    };

    shiftsArray.forEach(shift => {
      // Required workers
      totals.crewChiefRequired += shift.crew_chief_required || 0;
      totals.forkOperatorRequired += shift.fork_operators_required || 0;
      totals.stageHandRequired += shift.stage_hands_required || 0;
      totals.generalLaborRequired += shift.general_labor_required || 0;
      
      // Assigned workers
      const assignments = shift.assignments || [];
      totals.crewChiefAssigned += assignments.filter(a => a.workerType === 'crew_chief' && a.user).length;
      totals.forkOperatorAssigned += assignments.filter(a => a.workerType === 'fork_operator' && a.user).length;
      totals.stageHandAssigned += assignments.filter(a => a.workerType === 'stage_hand' && a.user).length;
      totals.generalLaborAssigned += assignments.filter(a => a.workerType === 'general_labor' && a.user).length;
    });

    totals.totalRequired = totals.crewChiefRequired + totals.forkOperatorRequired + 
                          totals.stageHandRequired + totals.generalLaborRequired;
    totals.totalAssigned = totals.crewChiefAssigned + totals.forkOperatorAssigned + 
                          totals.stageHandAssigned + totals.generalLaborAssigned;

    return totals;
  }, [shiftsArray]);

  // Get shift details with assignments
  const shiftDetails = React.useMemo(() => {
    return shiftsArray.map(shift => {
      const assignments = shift.assignments || [];
      const crewChiefAssignment = assignments.find(a => a.workerType === 'crew_chief' && a.user);
      
      const workerCounts = {
        crew_chief: {
          required: shift.crew_chief_required || 0,
          assigned: assignments.filter(a => a.workerType === 'crew_chief' && a.user).length
        },
        fork_operator: {
          required: shift.fork_operators_required || 0,
          assigned: assignments.filter(a => a.workerType === 'fork_operator' && a.user).length
        },
        stage_hand: {
          required: shift.stage_hands_required || 0,
          assigned: assignments.filter(a => a.workerType === 'stage_hand' && a.user).length
        },
        general_labor: {
          required: shift.general_labor_required || 0,
          assigned: assignments.filter(a => a.workerType === 'general_labor' && a.user).length
        }
      };

      const totalRequired = getTotalRequiredWorkers(shift);
      const totalAssigned = getAssignedWorkerCount(shift);
      const fillPercentage = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

      return {
        ...shift,
        crewChief: crewChiefAssignment?.user?.name || null,
        crewChiefColor: crewChiefAssignment?.user?.name ? getCrewChiefColor(crewChiefAssignment.user.name) : null,
        workerCounts,
        totalRequired,
        totalAssigned,
        fillPercentage
      };
    });
  }, [shiftsArray, getCrewChiefColor]);

  // Print functionality
  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = () => {
    // This would integrate with a PDF generation library
    console.log('PDF download functionality would be implemented here');
  };

  // Status badge component
  const StatusBadge = ({ status, size = 'default' }: { status: string; size?: 'sm' | 'default' }) => {
    const getStatusConfig = (status: string) => {
      switch (status.toLowerCase()) {
        case 'completed':
          return { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' };
        case 'active':
        case 'in_progress':
          return { icon: AlertCircle, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Active' };
        case 'pending':
          return { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' };
        case 'cancelled':
          return { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled' };
        default:
          return { icon: AlertCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', label: status };
      }
    };

    const config = getStatusConfig(status);
    const IconComponent = config.icon;

    return (
      <Badge 
        variant="outline" 
        className={`${config.color} ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''} flex items-center gap-1`}
      >
        <IconComponent className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {config.label}
      </Badge>
    );
  };

  // Worker type row component
  const WorkerTypeRow = ({ 
    type, 
    config, 
    required, 
    assigned, 
    isPrint = false 
  }: { 
    type: string; 
    config: any; 
    required: number; 
    assigned: number; 
    isPrint?: boolean;
  }) => {
    if (required === 0) return null;

    const IconComponent = config.icon;
    const color = getWorkerTypeColor(type);
    const isFullyStaffed = assigned >= required;
    const isOverStaffed = assigned > required;

    return (
      <div className={`flex items-center justify-between py-2 px-3 rounded ${
        isPrint ? 'border border-gray-300' : 'bg-muted/30'
      }`}>
        <div className="flex items-center gap-3">
          <div 
            className={`w-6 h-6 rounded flex items-center justify-center ${
              isPrint ? 'border border-gray-400' : ''
            }`}
            style={{ 
              backgroundColor: isPrint ? 'transparent' : color,
              borderColor: isPrint ? color : 'transparent'
            }}
          >
            <IconComponent 
              className={`h-3 w-3 ${isPrint ? '' : 'text-white'}`}
              style={{ color: isPrint ? color : undefined }}
            />
          </div>
          <span className="font-medium text-sm">{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono ${
            isOverStaffed ? 'text-orange-600' : 
            isFullyStaffed ? 'text-green-600' : 'text-red-600'
          }`}>
            {assigned}/{required}
          </span>
          {!isPrint && (
            <div className={`w-2 h-2 rounded-full ${
              isOverStaffed ? 'bg-orange-500' : 
              isFullyStaffed ? 'bg-green-500' : 'bg-red-500'
            }`} />
          )}
        </div>
      </div>
    );
  };

  const reportContent = (
    <div className={`space-y-6 ${isPrintMode || showPrintPreview ? 'print-content' : ''}`}>
      {/* Job Header */}
      <Card className={isPrintMode || showPrintPreview ? 'border-2 border-gray-300' : ''}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Building className="h-6 w-6" />
                {job.description}
              </CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Job #:</span>
                  <span className="font-mono">{job.jobNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Company:</span>
                  <span>{job.company?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Location:</span>
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Duration:</span>
                  <span>
                    {format(parseISO(job.startDate), 'MMM dd, yyyy')} - {format(parseISO(job.endDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={job.status} />
              {!isPrintMode && !showPrintPreview && (
                <div className="flex items-center gap-2 no-print">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Job Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{jobTotals.shifts}</div>
              <div className="text-sm text-blue-800">Total Shifts</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{jobTotals.totalAssigned}</div>
              <div className="text-sm text-green-800">Workers Assigned</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{jobTotals.totalRequired}</div>
              <div className="text-sm text-purple-800">Workers Required</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {jobTotals.totalRequired > 0 ? Math.round((jobTotals.totalAssigned / jobTotals.totalRequired) * 100) : 0}%
              </div>
              <div className="text-sm text-orange-800">Fill Rate</div>
            </div>
          </div>

          {/* Worker Type Totals */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Total Worker Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(WORKER_TYPES).map(([type, config]) => {
                const requiredKey = `${type === 'crew_chief' ? 'crewChief' : 
                                     type === 'fork_operator' ? 'forkOperator' : 
                                     type === 'stage_hand' ? 'stageHand' : 'generalLabor'}Required` as keyof typeof jobTotals;
                const assignedKey = `${type === 'crew_chief' ? 'crewChief' : 
                                     type === 'fork_operator' ? 'forkOperator' : 
                                     type === 'stage_hand' ? 'stageHand' : 'generalLabor'}Assigned` as keyof typeof jobTotals;
                
                const required = jobTotals[requiredKey] as number;
                const assigned = jobTotals[assignedKey] as number;
                
                return (
                  <WorkerTypeRow
                    key={type}
                    type={type}
                    config={config}
                    required={required}
                    assigned={assigned}
                    isPrint={isPrintMode || showPrintPreview}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Shift Details ({shiftsArray.length} shifts)
        </h3>
        
        {shiftDetails.map((shift, index) => (
          <Card key={shift.id} className={`${isPrintMode || showPrintPreview ? 'border border-gray-300 break-inside-avoid' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">
                      Shift #{index + 1}
                    </h4>
                    <StatusBadge status={shift.status} size="sm" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(parseISO(shift.date), 'EEE, MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(parseISO(shift.startTime), 'h:mm a')} - {format(parseISO(shift.endTime), 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">
                        {shift.totalAssigned}/{shift.totalRequired} workers
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        shift.fillPercentage >= 100 ? 'bg-green-500' : 
                        shift.fillPercentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>

                  {shift.description && (
                    <p className="text-sm text-muted-foreground">{shift.description}</p>
                  )}
                </div>

                {/* Crew Chief Assignment */}
                {shift.crewChief && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                       style={{ 
                         backgroundColor: isPrintMode || showPrintPreview ? 'transparent' : shift.crewChiefColor?.light,
                         borderColor: shift.crewChiefColor?.bg 
                       }}>
                    <Crown className="h-4 w-4" style={{ color: shift.crewChiefColor?.bg }} />
                    <div className="text-sm">
                      <div className="font-medium">{shift.crewChief}</div>
                      <div className="text-xs text-muted-foreground">Crew Chief</div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Worker Requirements
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(WORKER_TYPES).map(([type, config]) => {
                    const counts = shift.workerCounts[type as keyof typeof shift.workerCounts];
                    
                    return (
                      <WorkerTypeRow
                        key={type}
                        type={type}
                        config={config}
                        required={counts.required}
                        assigned={counts.assigned}
                        isPrint={isPrintMode || showPrintPreview}
                      />
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Footer */}
      <div className="text-center text-sm text-muted-foreground border-t pt-4">
        <p>Generated on {format(new Date(), 'PPP')} at {format(new Date(), 'p')}</p>
        <p>Job Report for {job.description} (#{job.jobNumber})</p>
      </div>
    </div>
  );

  if (showPrintPreview) {
    return (
      <div className="print-preview">
        <style jsx global>{`
          @media print {
            .print-content {
              font-size: 12px;
            }
            .print-content .text-2xl {
              font-size: 18px;
            }
            .print-content .text-xl {
              font-size: 16px;
            }
            .print-content .text-lg {
              font-size: 14px;
            }
            .print-content .text-sm {
              font-size: 11px;
            }
            .print-content .text-xs {
              font-size: 10px;
            }
            .break-inside-avoid {
              break-inside: avoid;
            }
          }
        `}</style>
        <div ref={printRef}>
          {reportContent}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reportContent}
    </div>
  );
}