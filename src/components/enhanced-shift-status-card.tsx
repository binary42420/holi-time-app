import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  StatusBadge, 
  getFulfillmentStatus, 
  getPriorityBadge, 
  getRoleStatus,
  getPerformanceStatus,
  getNetworkStatus
} from '@/components/ui/status-badge';
import { Avatar } from '@/components/Avatar';
import { 
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  Building2,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Timer,
  TrendingUp,
  Eye,
  MoreHorizontal,
  Play,
  Pause,
  StopCircle
} from 'lucide-react';
import { format, differenceInDays, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EnhancedShiftStatusCardProps {
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    location?: string;
    description?: string;
    requiredCrewChiefs: number;
    requiredStagehands: number;
    requiredForkOperators: number;
    requiredReachForkOperators: number;
    requiredRiggers: number;
    requiredGeneralLaborers: number;
    assignedPersonnel: Array<{
      id: string;
      status: string;
      roleCode: string;
      user: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        avatarUrl?: string;
        performance?: number;
      };
      timeEntries?: Array<{
        id: string;
        clockIn: string;
        clockOut?: string;
        isActive: boolean;
      }>;
    }>;
    job: {
      id: string;
      name: string;
      company: {
        name: string;
      };
    };
  };
  onAction?: (action: string, shiftId: string, workerId?: string) => void;
  showActions?: boolean;
  compact?: boolean;
  isOnline?: boolean;
  className?: string;
}

export function EnhancedShiftStatusCard({
  shift,
  onAction,
  showActions = false,
  compact = false,
  isOnline = true,
  className
}: EnhancedShiftStatusCardProps) {
  // Calculate staffing metrics
  const totalRequired = shift.requiredCrewChiefs + shift.requiredStagehands + 
                       shift.requiredForkOperators + shift.requiredReachForkOperators + 
                       shift.requiredRiggers + shift.requiredGeneralLaborers;
  const totalAssigned = shift.assignedPersonnel.length;
  const fulfillmentStatus = getFulfillmentStatus(totalAssigned, totalRequired);
  
  // Calculate time-based metrics
  const daysUntil = differenceInDays(new Date(shift.date), new Date());
  const priorityStatus = getPriorityBadge(daysUntil);
  const isToday = daysUntil === 0;
  const isPast = daysUntil < 0;
  
  // Calculate worker status breakdown
  const workingNow = shift.assignedPersonnel.filter(w => w.status === 'ClockedIn').length;
  const onBreak = shift.assignedPersonnel.filter(w => w.status === 'OnBreak' || w.status === 'ClockedOut').length;
  const noShows = shift.assignedPersonnel.filter(w => w.status === 'NoShow').length;
  const completed = shift.assignedPersonnel.filter(w => w.status === 'ShiftEnded').length;
  
  // Calculate role breakdown
  const roleBreakdown = {
    CC: { required: shift.requiredCrewChiefs, assigned: 0 },
    SH: { required: shift.requiredStagehands, assigned: 0 },
    FO: { required: shift.requiredForkOperators, assigned: 0 },
    RFO: { required: shift.requiredReachForkOperators, assigned: 0 },
    RG: { required: shift.requiredRiggers, assigned: 0 },
    GL: { required: shift.requiredGeneralLaborers, assigned: 0 }
  };
  
  shift.assignedPersonnel.forEach(worker => {
    if (roleBreakdown[worker.roleCode as keyof typeof roleBreakdown]) {
      roleBreakdown[worker.roleCode as keyof typeof roleBreakdown].assigned++;
    }
  });
  
  // Calculate progress percentage
  const progressPercentage = totalRequired > 0 ? (workingNow / totalRequired) * 100 : 0;
  
  // Determine card border color based on status and urgency
  const getBorderColor = () => {
    if (noShows > 0) return 'border-l-red-500';
    if (fulfillmentStatus === 'CRITICAL') return 'border-l-red-500';
    if (fulfillmentStatus === 'LOW') return 'border-l-orange-500';
    if (shift.status === 'Active' || shift.status === 'InProgress') return 'border-l-emerald-500';
    if (isToday) return 'border-l-blue-500';
    return 'border-l-gray-300';
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg border-l-4",
      getBorderColor(),
      className
    )}>
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            {/* Job and Company Info */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
                {shift.job.name}
              </h3>
              <StatusBadge status={shift.status} size="sm" />
              {(isToday || daysUntil === 1) && <StatusBadge status={priorityStatus} size="sm" />}
              {!isOnline && <StatusBadge status="OFFLINE" size="sm" />}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{shift.job.company.name}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(shift.date), 'MMM dd, yyyy')}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(shift.startTime), 'h:mm a')} - {format(new Date(shift.endTime), 'h:mm a')}
                </span>
              </div>
            </div>
            
            {shift.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{shift.location}</span>
              </div>
            )}
          </div>
          
          {/* Staffing Status */}
          <div className="text-right space-y-2">
            <StatusBadge 
              status={fulfillmentStatus}
              count={totalAssigned}
              total={totalRequired}
              showCount
              size={compact ? "sm" : "md"}
            />
            
            {shift.status === 'Active' && workingNow > 0 && (
              <div className="text-xs text-emerald-600 font-medium">
                {workingNow} working now
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar for Active Shifts */}
        {(shift.status === 'Active' || shift.status === 'InProgress') && !compact && (
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-sm">
              <span>Work Progress</span>
              <span>{workingNow}/{totalAssigned} active</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      {!compact && (
        <CardContent className="space-y-4">
          {/* Worker Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {workingNow > 0 && (
              <div className="text-center p-2 bg-emerald-50 rounded-lg">
                <div className="text-lg font-bold text-emerald-600">{workingNow}</div>
                <div className="text-xs text-emerald-800">Working</div>
              </div>
            )}
            
            {onBreak > 0 && (
              <div className="text-center p-2 bg-amber-50 rounded-lg">
                <div className="text-lg font-bold text-amber-600">{onBreak}</div>
                <div className="text-xs text-amber-800">On Break</div>
              </div>
            )}
            
            {noShows > 0 && (
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">{noShows}</div>
                <div className="text-xs text-red-800">No Shows</div>
              </div>
            )}
            
            {completed > 0 && (
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{completed}</div>
                <div className="text-xs text-blue-800">Completed</div>
              </div>
            )}
          </div>
          
          {/* Role Breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Role Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(roleBreakdown).map(([role, counts]) => {
                if (counts.required === 0) return null;
                const roleStatus = getFulfillmentStatus(counts.assigned, counts.required);
                
                return (
                  <div key={role} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={getRoleStatus(role)} size="sm" />
                      <span className="text-sm font-medium">{role}</span>
                    </div>
                    <StatusBadge 
                      status={roleStatus}
                      count={counts.assigned}
                      total={counts.required}
                      showCount
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Top Workers Preview */}
          {shift.assignedPersonnel.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Assigned Workers</h4>
                <span className="text-xs text-muted-foreground">
                  {shift.assignedPersonnel.length} total
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {shift.assignedPersonnel.slice(0, 6).map(worker => (
                  <div key={worker.id} className="flex items-center gap-2">
                    <Avatar
                      src={worker.user.avatarUrl}
                      name={worker.user.name}
                      userId={worker.user.id}
                      size="sm"
                      className="h-6 w-6"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{worker.user.name.split(' ')[0]}</span>
                      <StatusBadge status={worker.status} size="sm" />
                      {worker.user.performance && (
                        <StatusBadge 
                          status={getPerformanceStatus(worker.user.performance)} 
                          size="sm" 
                        />
                      )}
                    </div>
                  </div>
                ))}
                
                {shift.assignedPersonnel.length > 6 && (
                  <span className="text-xs text-muted-foreground">
                    +{shift.assignedPersonnel.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {showActions && onAction && (
            <div className="flex gap-2 pt-2 border-t">
              {shift.status === 'Pending' && (
                <Button
                  size="sm"
                  onClick={() => onAction('start_shift', shift.id)}
                  disabled={!isOnline}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start Shift
                </Button>
              )}
              
              {(shift.status === 'Active' || shift.status === 'InProgress') && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction('pause_shift', shift.id)}
                    disabled={!isOnline}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => onAction('complete_shift', shift.id)}
                    disabled={!isOnline}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                </>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction('view_details', shift.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Compact version for lists and grids
export function CompactShiftStatusCard(props: EnhancedShiftStatusCardProps) {
  return <EnhancedShiftStatusCard {...props} compact={true} />;
}

// Example usage component
export function ShiftStatusCardsExample() {
  const mockShift = {
    id: 'shift-1',
    date: new Date().toISOString(),
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: 'Active',
    location: 'Madison Square Garden',
    description: 'Concert setup and sound check',
    requiredCrewChiefs: 2,
    requiredStagehands: 8,
    requiredForkOperators: 2,
    requiredReachForkOperators: 1,
    requiredRiggers: 4,
    requiredGeneralLaborers: 6,
    assignedPersonnel: [
      {
        id: 'ap-1',
        status: 'ClockedIn',
        roleCode: 'CC',
        user: {
          id: 'user-1',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          phone: '+1234567890',
          avatarUrl: '/api/placeholder/48/48',
          performance: 4.5
        },
        timeEntries: [{
          id: 'te-1',
          clockIn: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isActive: true
        }]
      },
      {
        id: 'ap-2',
        status: 'OnBreak',
        roleCode: 'SH',
        user: {
          id: 'user-2',
          name: 'Sarah Davis',
          email: 'sarah@example.com',
          performance: 4.2
        }
      },
      {
        id: 'ap-3',
        status: 'NoShow',
        roleCode: 'GL',
        user: {
          id: 'user-3',
          name: 'Bob Wilson',
          email: 'bob@example.com',
          performance: 2.1
        }
      }
    ],
    job: {
      id: 'job-1',
      name: 'Taylor Swift Concert Setup',
      company: {
        name: 'Live Nation Entertainment'
      }
    }
  };

  const handleAction = (action: string, shiftId: string, workerId?: string) => {
    console.log(`Action: ${action}, ShiftID: ${shiftId}, WorkerID: ${workerId}`);
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Enhanced Shift Status Cards</h2>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Full Detail Card</h3>
        <EnhancedShiftStatusCard 
          shift={mockShift} 
          onAction={handleAction}
          showActions={true}
          isOnline={true}
        />
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Compact Card</h3>
        <CompactShiftStatusCard 
          shift={mockShift} 
          isOnline={true}
        />
      </div>
    </div>
  );
}