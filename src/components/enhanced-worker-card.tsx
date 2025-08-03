import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  StatusBadge, 
  getPerformanceStatus, 
  getRoleStatus,
  getCertificationStatus,
  getNetworkStatus
} from '@/components/ui/status-badge';
import { Avatar } from '@/components/Avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Clock, 
  Play, 
  StopCircle, 
  Coffee, 
  CheckCircle2, 
  AlertCircle,
  Timer,
  Award,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Star,
  Crown,
  Shield,
  Activity
} from "lucide-react";
import { format, differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnhancedWorkerCardProps {
  worker: {
    id: string;
    status: string;
    roleCode: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      avatarUrl?: string;
      crew_chief_eligible?: boolean;
      fork_operator_eligible?: boolean;
      certifications?: string[];
      performance?: number;
      location?: string;
    };
    timeEntries?: Array<{
      id: string;
      clockIn: string;
      clockOut?: string;
      breakStart?: string;
      breakEnd?: string;
      notes?: string;
      isActive: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
  };
  shift?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  };
  onClockAction: (workerId: string, action: string) => void;
  onEndShift: (workerId: string) => void;
  onViewDetails?: (workerId: string) => void;
  loading?: boolean;
  isOnline?: boolean;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

// Helper function to get role display name
const getRoleDisplayName = (roleCode: string) => {
  const roleNames: Record<string, string> = {
    'CC': 'Crew Chief',
    'SH': 'Stagehand', 
    'FO': 'Fork Operator',
    'RFO': 'Rough Fork Op.',
    'RG': 'Rigger',
    'GL': 'General Labor'
  };
  return roleNames[roleCode] || roleCode;
};

// Helper function to get role priority for sorting
const getRolePriority = (roleCode: string) => {
  const priorities: Record<string, number> = {
    'CC': 1, 'SH': 2, 'FO': 3, 'RFO': 4, 'RG': 5, 'GL': 6
  };
  return priorities[roleCode] || 99;
};

export function EnhancedWorkerCard({ 
  worker, 
  shift,
  onClockAction, 
  onEndShift, 
  onViewDetails,
  loading = false,
  isOnline = true,
  showDetails = false,
  compact = false,
  className 
}: EnhancedWorkerCardProps) {
  // Calculate time tracking info
  const activeTimeEntry = worker.timeEntries?.find(entry => entry.isActive);
  const totalHours = calculateTotalHours(worker.timeEntries || []);
  const currentSessionMinutes = activeTimeEntry ? 
    differenceInMinutes(new Date(), new Date(activeTimeEntry.clockIn)) : 0;

  // Enhanced status indicators using new system
  const performanceStatus = worker.user.performance ? getPerformanceStatus(worker.user.performance) : null;
  const roleStatus = getRoleStatus(worker.roleCode);
  const networkStatus = getNetworkStatus(isOnline);
  const certificationStatuses = worker.user.certifications?.map(cert => 
    getCertificationStatus(null) // You can pass actual expiration dates if available
  ) || [];
  
  // Role and eligibility indicators
  const isEligibleForSpecialRoles = worker.user.crew_chief_eligible || worker.user.fork_operator_eligible;
  const certificationCount = worker.user.certifications?.length || 0;
  const roleName = getRoleDisplayName(worker.roleCode);
  const rolePriority = getRolePriority(worker.roleCode);

  // Determine card styling based on status
  const getCardStyling = () => {
    switch (worker.status) {
      case 'ClockedIn':
        return 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20';
      case 'OnBreak':
      case 'ClockedOut':
        return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20';
      case 'ShiftEnded':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      case 'NoShow':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'UpForGrabs':
        return 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20';
      default:
        return 'border-l-slate-300';
    }
  };

  if (compact) {
    return (
      <Card className={cn(
        'transition-all duration-200 border-l-4 hover:shadow-md',
        getCardStyling(),
        loading && 'opacity-50',
        className
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                src={worker.user.avatarUrl}
                name={worker.user.name}
                userId={worker.user.id}
                size="md"
                className="h-10 w-10"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm truncate">{worker.user.name}</h4>
                  {!isOnline && <StatusBadge status="OFFLINE" size="sm" />}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <StatusBadge status={worker.status} size="sm" />
                  <StatusBadge status={roleStatus} size="sm" />
                  {performanceStatus && <StatusBadge status={performanceStatus} size="sm" />}
                </div>
              </div>
            </div>
            <WorkerActions 
              worker={worker}
              onClockAction={onClockAction}
              onEndShift={onEndShift}
              loading={loading}
              isOnline={isOnline}
              compact
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'transition-all duration-200 border-l-4 hover:shadow-lg',
      getCardStyling(),
      loading && 'opacity-50',
      className
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                src={worker.user.avatarUrl}
                name={worker.user.name}
                userId={worker.user.id}
                size="xl"
                className="h-16 w-16"
              />
              {worker.status === 'ClockedIn' && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              )}
              {!isOnline && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white">
                  <WifiOff className="h-2 w-2 text-white m-0.5" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold text-lg">{worker.user.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={roleStatus} />
                  <StatusBadge status={worker.status} />
                  
                  {performanceStatus && <StatusBadge status={performanceStatus} />}
                  
                  {isEligibleForSpecialRoles && (
                    <StatusBadge status="CERTIFIED" size="sm" />
                  )}
                  
                  {!isOnline && <StatusBadge status="OFFLINE" size="sm" />}
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {worker.user.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{worker.user.phone}</span>
                  </div>
                )}
                {worker.user.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{worker.user.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <WorkerActions 
            worker={worker}
            onClockAction={onClockAction}
            onEndShift={onEndShift}
            loading={loading}
            isOnline={isOnline}
          />
        </div>

        {/* Time Tracking Info */}
        {(worker.status === 'ClockedIn' || totalHours !== '0h 0m') && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Total: {totalHours}</span>
              </div>
              
              {worker.status === 'ClockedIn' && activeTimeEntry && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span>Working {Math.floor(currentSessionMinutes / 60)}h {currentSessionMinutes % 60}m</span>
                </div>
              )}
            </div>
            
            {worker.user.performance && (
              <div className="flex items-center gap-1 text-sm">
                {worker.user.performance >= 4.0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                )}
                <span className="font-medium">{worker.user.performance.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Details */}
        {showDetails && (
          <div className="space-y-3 pt-2 border-t">
            {/* Certifications */}
            {certificationCount > 0 && (
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-1">Certifications</h5>
                <div className="flex flex-wrap gap-1">
                  {worker.user.certifications?.slice(0, 3).map(cert => (
                    <Badge key={cert} variant="outline" className="text-xs">
                      {cert}
                    </Badge>
                  ))}
                  {certificationCount > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{certificationCount - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Special Eligibilities */}
            {isEligibleForSpecialRoles && (
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-1">Eligible For</h5>
                <div className="flex gap-1">
                  {worker.user.crew_chief_eligible && (
                    <Badge variant="secondary" className="text-xs">Crew Chief</Badge>
                  )}
                  {worker.user.fork_operator_eligible && (
                    <Badge variant="secondary" className="text-xs">Fork Operator</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Recent Notes */}
            {activeTimeEntry?.notes && (
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-1">Notes</h5>
                <p className="text-sm bg-muted/50 p-2 rounded">
                  {activeTimeEntry.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            Assigned {formatDistanceToNow(new Date(worker.createdAt), { addSuffix: true })}
          </span>
          {onViewDetails && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs p-1 h-auto"
              onClick={() => onViewDetails(worker.id)}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for action buttons
function WorkerActions({ 
  worker, 
  onClockAction, 
  onEndShift, 
  loading, 
  isOnline, 
  compact = false 
}: {
  worker: any;
  onClockAction: (id: string, action: string) => void;
  onEndShift: (id: string) => void;
  loading: boolean;
  isOnline: boolean;
  compact?: boolean;
}) {
  const buttonSize = compact ? "sm" : "sm";
  const iconSize = compact ? "h-3 w-3" : "h-4 w-4";

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {worker.status === 'Assigned' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size={buttonSize} 
                onClick={() => onClockAction(worker.id, 'clock_in')} 
                disabled={!isOnline || loading}
                className={compact ? "px-2" : ""}
              >
                <Play className={cn(iconSize, compact && "mr-0", !compact && "mr-1")} />
                {!compact && "Clock In"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start this worker's shift</TooltipContent>
          </Tooltip>
        )}

        {worker.status === 'ClockedIn' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size={buttonSize} 
                  onClick={() => onClockAction(worker.id, 'clock_out')} 
                  disabled={!isOnline || loading}
                  className={compact ? "px-2" : ""}
                >
                  <Coffee className={cn(iconSize, compact && "mr-0", !compact && "mr-1")} />
                  {!compact && "Break"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send worker on break</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  size={buttonSize} 
                  onClick={() => onEndShift(worker.id)} 
                  disabled={!isOnline || loading}
                  className={compact ? "px-2" : ""}
                >
                  <StopCircle className={cn(iconSize, compact && "mr-0", !compact && "mr-1")} />
                  {!compact && "End"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>End this worker's shift</TooltipContent>
            </Tooltip>
          </>
        )}

        {(worker.status === 'ClockedOut' || worker.status === 'OnBreak') && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size={buttonSize} 
                  onClick={() => onClockAction(worker.id, 'clock_in')} 
                  disabled={!isOnline || loading}
                  className={compact ? "px-2" : ""}
                >
                  <Play className={cn(iconSize, compact && "mr-0", !compact && "mr-1")} />
                  {!compact && "Return"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Return from break</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  size={buttonSize} 
                  onClick={() => onEndShift(worker.id)} 
                  disabled={!isOnline || loading}
                  className={compact ? "px-2" : ""}
                >
                  <StopCircle className={cn(iconSize, compact && "mr-0", !compact && "mr-1")} />
                  {!compact && "End"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>End this worker's shift</TooltipContent>
            </Tooltip>
          </>
        )}

        {worker.status === 'ShiftEnded' && (
          <Badge variant="secondary" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )}

        {worker.status === 'NoShow' && (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            No Show
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

// Helper function to calculate total hours
function calculateTotalHours(timeEntries: any[] = []) {
  let totalMinutes = 0;
  timeEntries.forEach(entry => {
    if (entry.clockIn && entry.clockOut) {
      totalMinutes += differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn));
    }
  });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}