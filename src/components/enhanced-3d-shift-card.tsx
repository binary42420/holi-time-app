import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Enhanced3DStatusBadge, EnhancedDateStatusIndicator } from '@/components/enhanced-date-status-indicators';
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
  StopCircle,
  Zap,
  Flame,
  Star,
  Crown,
  Shield,
  Target,
  Award,
  Sparkles
} from "lucide-react";
import { format, differenceInDays, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Enhanced3DShiftCardProps {
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

export function Enhanced3DShiftCard({
  shift,
  onAction,
  showActions = false,
  compact = false,
  isOnline = true,
  className
}: Enhanced3DShiftCardProps) {
  // Calculate staffing metrics
  const totalRequired = shift.requiredCrewChiefs + shift.requiredStagehands + 
                       shift.requiredForkOperators + shift.requiredReachForkOperators + 
                       shift.requiredRiggers + shift.requiredGeneralLaborers;
  const totalAssigned = shift.assignedPersonnel.length;
  
  const getFulfillmentStatus = (assigned: number, required: number) => {
    if (required === 0) return 'FULL';
    const ratio = assigned / required;
    if (ratio >= 1.1) return 'OVERSTAFFED';
    if (ratio >= 1.0) return 'FULL';
    if (ratio >= 0.8) return 'GOOD';
    if (ratio >= 0.6) return 'LOW';
    return 'CRITICAL';
  };

  const fulfillmentStatus = getFulfillmentStatus(totalAssigned, totalRequired);
  
  // Calculate time-based metrics
  const daysUntil = differenceInDays(new Date(shift.date), new Date());
  const isShiftToday = isToday(new Date(shift.date));
  const isShiftTomorrow = isTomorrow(new Date(shift.date));
  const isPast = daysUntil < 0;
  
  // Calculate worker status breakdown
  const workingNow = shift.assignedPersonnel.filter(w => w.status === 'ClockedIn').length;
  const onBreak = shift.assignedPersonnel.filter(w => w.status === 'OnBreak' || w.status === 'ClockedOut').length;
  const noShows = shift.assignedPersonnel.filter(w => w.status === 'NoShow').length;
  const completed = shift.assignedPersonnel.filter(w => w.status === 'ShiftEnded').length;
  
  // Calculate progress percentage
  const progressPercentage = totalRequired > 0 ? (workingNow / totalRequired) * 100 : 0;
  
  // Determine card styling based on status and urgency
  const getCardStyling = () => {
    if (noShows > 0) {
      return {
        border: 'border-l-8 border-l-red-500 shadow-xl shadow-red-500/20',
        bg: 'bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-red-950/20 dark:via-gray-900 dark:to-red-950/20',
        glow: 'hover:shadow-2xl hover:shadow-red-500/30'
      };
    }
    if (fulfillmentStatus === 'CRITICAL') {
      return {
        border: 'border-l-8 border-l-orange-500 shadow-xl shadow-orange-500/20',
        bg: 'bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-orange-950/20 dark:via-gray-900 dark:to-orange-950/20',
        glow: 'hover:shadow-2xl hover:shadow-orange-500/30'
      };
    }
    if (shift.status === 'Active' || shift.status === 'InProgress') {
      return {
        border: 'border-l-8 border-l-emerald-500 shadow-xl shadow-emerald-500/20',
        bg: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-950/20',
        glow: 'hover:shadow-2xl hover:shadow-emerald-500/30'
      };
    }
    if (isShiftToday) {
      return {
        border: 'border-l-8 border-l-blue-500 shadow-xl shadow-blue-500/20',
        bg: 'bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20',
        glow: 'hover:shadow-2xl hover:shadow-blue-500/30'
      };
    }
    if (isShiftTomorrow) {
      return {
        border: 'border-l-8 border-l-purple-500 shadow-xl shadow-purple-500/20',
        bg: 'bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-purple-950/20 dark:via-gray-900 dark:to-purple-950/20',
        glow: 'hover:shadow-2xl hover:shadow-purple-500/30'
      };
    }
    return {
      border: 'border-l-4 border-l-gray-300 shadow-lg',
      bg: 'bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900',
      glow: 'hover:shadow-xl'
    };
  };

  const cardStyle = getCardStyling();

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border-2",
      cardStyle.border,
      cardStyle.bg,
      cardStyle.glow,
      className
    )}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
      
      <CardHeader className={cn("pb-4 relative z-10", compact && "pb-2")}>
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            {/* Job and Company Info with Enhanced Typography */}
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className={cn(
                "font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent",
                compact ? "text-lg" : "text-xl"
              )}>
                {shift.job.name}
              </h3>
              <Enhanced3DStatusBadge status={shift.status} size="sm" />
              {!isOnline && <Enhanced3DStatusBadge status="OFFLINE" size="sm" />}
            </div>
            
            {/* Enhanced Date and Time Display */}
            <div className="space-y-2">
              <EnhancedDateStatusIndicator
                date={shift.date}
                startTime={shift.startTime}
                endTime={shift.endTime}
                status={shift.status}
                size={compact ? "sm" : "md"}
                showTimeUntil={true}
              />
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{shift.job.company.name}</span>
                </div>
                
                {shift.location && (
                  <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{shift.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced Staffing Status */}
          <div className="text-right space-y-3">
            <Enhanced3DStatusBadge 
              status={fulfillmentStatus}
              count={totalAssigned}
              total={totalRequired}
              showCount
              size={compact ? "sm" : "md"}
            />
            
            {shift.status === 'Active' && workingNow > 0 && (
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg border border-emerald-300 dark:border-emerald-700">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {workingNow} working now
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Progress Bar for Active Shifts */}
        {(shift.status === 'Active' || shift.status === 'InProgress') && !compact && (
          <div className="space-y-3 mt-4 p-4 bg-white/30 dark:bg-gray-800/30 rounded-lg backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Work Progress
              </span>
              <span className="text-blue-700 dark:text-blue-300">{workingNow}/{totalAssigned} active</span>
            </div>
            <div className="relative">
              <Progress value={progressPercentage} className="h-3 bg-gray-200 dark:bg-gray-700" />
              <div 
                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-80 transition-all duration-500" 
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardHeader>
      
      {!compact && (
        <CardContent className="space-y-6 relative z-10">
          {/* Enhanced Worker Status Summary with 3D Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {workingNow > 0 && (
              <div className="text-center p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl shadow-lg border-2 border-emerald-300 dark:border-emerald-700 hover:scale-105 transition-transform duration-200">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-emerald-500 rounded-full shadow-lg">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{workingNow}</div>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Working</div>
              </div>
            )}
            
            {onBreak > 0 && (
              <div className="text-center p-4 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl shadow-lg border-2 border-amber-300 dark:border-amber-700 hover:scale-105 transition-transform duration-200">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-amber-500 rounded-full shadow-lg">
                    <Pause className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{onBreak}</div>
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">On Break</div>
              </div>
            )}
            
            {noShows > 0 && (
              <div className="text-center p-4 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-xl shadow-lg border-2 border-red-300 dark:border-red-700 hover:scale-105 transition-transform duration-200 animate-pulse">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-red-500 rounded-full shadow-lg">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{noShows}</div>
                <div className="text-xs font-medium text-red-600 dark:text-red-400">No Shows</div>
              </div>
            )}
            
            {completed > 0 && (
              <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl shadow-lg border-2 border-blue-300 dark:border-blue-700 hover:scale-105 transition-transform duration-200">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-blue-500 rounded-full shadow-lg">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{completed}</div>
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Completed</div>
              </div>
            )}
          </div>
          
          {/* Enhanced Worker Preview with Performance Indicators */}
          {shift.assignedPersonnel.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  Assigned Workers
                </h4>
                <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
                  {shift.assignedPersonnel.length} total
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shift.assignedPersonnel.slice(0, 4).map(worker => (
                  <div key={worker.id} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm border border-white/20 dark:border-gray-700/20 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200">
                    <Avatar
                      src={worker.user.avatarUrl}
                      name={worker.user.name}
                      userId={worker.user.id}
                      size="sm"
                      className="h-10 w-10 ring-2 ring-white shadow-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{worker.user.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Enhanced3DStatusBadge status={worker.status} size="sm" />
                        {worker.user.performance && worker.user.performance > 85 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs font-bold text-yellow-600">Top Performer</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {shift.assignedPersonnel.length > 4 && (
                  <div className="flex items-center justify-center p-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      +{shift.assignedPersonnel.length - 4} more workers
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Enhanced Action Buttons */}
          {showActions && onAction && (
            <div className="flex gap-3 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              {shift.status === 'Pending' && (
                <Button
                  size="sm"
                  onClick={() => onAction('start_shift', shift.id)}
                  disabled={!isOnline}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Play className="h-4 w-4 mr-2" />
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
                    className="border-2 border-amber-300 text-amber-700 hover:bg-amber-50 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => onAction('complete_shift', shift.id)}
                    disabled={!isOnline}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                </>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction('view_details', shift.id)}
                className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Eye className="h-4 w-4 mr-2" />
                Details
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}