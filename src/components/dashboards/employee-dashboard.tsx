import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge, getPriorityBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/Avatar';
import { 
  Clock,
  Play,
  Pause,
  StopCircle,
  Coffee,
  Calendar,
  MapPin,
  Phone,
  MessageSquare,
  User,
  Timer,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Wifi,
  WifiOff,
  Home,
  Building2
} from 'lucide-react';
import { format, differenceInMinutes, formatDistanceToNow, differenceInDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmployeeDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    performance?: number;
    certifications?: string[];
    location?: string;
  };
  myAssignments: Array<{
    id: string;
    status: string;
    roleCode: string;
    shift: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      location?: string;
      description?: string;
      job: {
        id: string;
        name: string;
        company: {
          name: string;
        };
      };
    };
    timeEntries?: Array<{
      id: string;
      clockIn: string;
      clockOut?: string;
      breakStart?: string;
      breakEnd?: string;
      notes?: string;
      isActive: boolean;
      verified: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
  crewChiefs?: Array<{
    id: string;
    name: string;
    phone?: string;
    email: string;
  }>;
  onClockIn: (assignmentId: string) => Promise<void>;
  onClockOut: (assignmentId: string) => Promise<void>;
  onStartBreak: (assignmentId: string) => Promise<void>;
  onEndBreak: (assignmentId: string) => Promise<void>;
  onEndShift: (assignmentId: string) => Promise<void>;
  onContactCrewChief: (crewChiefId: string, method: 'call' | 'text') => void;
  onReportIssue: (shiftId: string, issue: string) => void;
  isOnline?: boolean;
  className?: string;
}

export function EmployeeDashboard({ 
  user, 
  myAssignments, 
  crewChiefs = [],
  onClockIn, 
  onClockOut, 
  onStartBreak,
  onEndBreak,
  onEndShift,
  onContactCrewChief,
  onReportIssue,
  isOnline = true,
  className 
}: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState('today');
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter assignments
  const todayAssignments = myAssignments.filter(assignment => 
    isToday(new Date(assignment.shift.date))
  );
  const upcomingAssignments = myAssignments.filter(assignment => 
    new Date(assignment.shift.date) > new Date() && !isToday(new Date(assignment.shift.date))
  );
  const recentAssignments = myAssignments.filter(assignment => 
    assignment.status === 'ShiftEnded' || assignment.shift.status === 'Completed'
  ).slice(0, 5);

  // Find active assignment
  const activeAssignment = todayAssignments.find(a => a.status === 'ClockedIn');
  const activeTimeEntry = activeAssignment?.timeEntries?.find(entry => entry.isActive);

  // Calculate current session time
  const currentSessionMinutes = activeTimeEntry ? 
    differenceInMinutes(currentTime, new Date(activeTimeEntry.clockIn)) : 0;

  // Calculate total hours today
  const totalTodayMinutes = todayAssignments.reduce((total, assignment) => {
    return total + (assignment.timeEntries?.reduce((entryTotal, entry) => {
      if (entry.clockIn && entry.clockOut) {
        return entryTotal + differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn));
      }
      return entryTotal;
    }, 0) || 0);
  }, 0);

  const handleAction = async (assignmentId: string, action: string) => {
    setLoadingActions(prev => ({ ...prev, [assignmentId]: true }));
    try {
      switch (action) {
        case 'clock_in':
          await onClockIn(assignmentId);
          break;
        case 'clock_out':
          await onClockOut(assignmentId);
          break;
        case 'start_break':
          await onStartBreak(assignmentId);
          break;
        case 'end_break':
          await onEndBreak(assignmentId);
          break;
        case 'end_shift':
          await onEndShift(assignmentId);
          break;
      }
    } finally {
      setLoadingActions(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={user.avatarUrl}
              name={user.name}
              userId={user.id}
              size="md"
              className="h-10 w-10"
            />
            <div>
              <h1 className="text-lg font-semibold">My Schedule</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user.name}</span>
                {!isOnline && <WifiOff className="h-4 w-4 text-red-500" />}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {user.performance && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                {user.performance.toFixed(1)}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Active Work Session */}
      {activeAssignment && (
        <section className="container px-4 py-4">
          <ActiveWorkSession 
            assignment={activeAssignment}
            currentSessionMinutes={currentSessionMinutes}
            onAction={handleAction}
            loadingActions={loadingActions}
            isOnline={isOnline}
          />
        </section>
      )}

      {/* Daily Summary */}
      <section className="container px-4 py-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{todayAssignments.length}</div>
              <div className="text-xs text-muted-foreground">Today's Shifts</div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{formatTime(totalTodayMinutes)}</div>
              <div className="text-xs text-muted-foreground">Hours Today</div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{upcomingAssignments.length}</div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {user.certifications?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Certifications</div>
            </div>
          </Card>
        </div>
      </section>

      {/* Main Tabs */}
      <div className="container px-4 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Today ({todayAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming ({upcomingAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Recent
            </TabsTrigger>
          </TabsList>

          {/* Today's Shifts */}
          <TabsContent value="today" className="space-y-4">
            {todayAssignments.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground">No shifts today</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Enjoy your day off!
                </p>
              </Card>
            ) : (
              todayAssignments.map(assignment => (
                <EmployeeShiftCard
                  key={assignment.id}
                  assignment={assignment}
                  onAction={handleAction}
                  onContactCrewChief={onContactCrewChief}
                  onReportIssue={onReportIssue}
                  crewChiefs={crewChiefs}
                  loadingActions={loadingActions}
                  isOnline={isOnline}
                  showActions
                />
              ))
            )}
          </TabsContent>

          {/* Upcoming Shifts */}
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingAssignments.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground">No upcoming shifts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for new assignments.
                </p>
              </Card>
            ) : (
              upcomingAssignments.map(assignment => (
                <EmployeeShiftCard
                  key={assignment.id}
                  assignment={assignment}
                  onAction={handleAction}
                  onContactCrewChief={onContactCrewChief}
                  onReportIssue={onReportIssue}
                  crewChiefs={crewChiefs}
                  loadingActions={loadingActions}
                  isOnline={isOnline}
                />
              ))
            )}
          </TabsContent>

          {/* Recent Shifts */}
          <TabsContent value="recent" className="space-y-4">
            {recentAssignments.map(assignment => (
              <RecentShiftCard
                key={assignment.id}
                assignment={assignment}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Emergency Contact */}
      {crewChiefs.length > 0 && (
        <section className="container px-4 pb-6">
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">Need Help?</h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Contact your crew chief for assistance
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onContactCrewChief(crewChiefs[0].id, 'call')}
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Working offline - changes will sync when reconnected</span>
        </div>
      )}
    </div>
  );
}

// Active work session component
function ActiveWorkSession({ 
  assignment, 
  currentSessionMinutes, 
  onAction, 
  loadingActions, 
  isOnline 
}: {
  assignment: any;
  currentSessionMinutes: number;
  onAction: (id: string, action: string) => void;
  loadingActions: Record<string, boolean>;
  isOnline: boolean;
}) {
  const activeEntry = assignment.timeEntries?.find((entry: any) => entry.isActive);
  
  return (
    <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
                Currently Working
              </h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {assignment.shift.job.name}
              </p>
            </div>
          </div>
          
          <StatusBadge status={assignment.status} />
        </div>
        
        {/* Session Timer */}
        <div className="text-center py-6 border-2 border-dashed border-emerald-200 rounded-lg bg-white/50 dark:bg-emerald-950/50">
          <div className="text-3xl font-bold text-emerald-600 mb-2">
            {Math.floor(currentSessionMinutes / 60)}:{(currentSessionMinutes % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-sm text-emerald-600">
            Started at {activeEntry ? format(new Date(activeEntry.clockIn), 'h:mm a') : '--:--'}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onAction(assignment.id, 'start_break')}
            disabled={!isOnline || loadingActions[assignment.id]}
            className="flex-1"
          >
            <Coffee className="h-4 w-4 mr-1" />
            Take Break
          </Button>
          
          <Button
            variant="destructive"
            onClick={() => onAction(assignment.id, 'end_shift')}
            disabled={!isOnline || loadingActions[assignment.id]}
            className="flex-1"
          >
            <StopCircle className="h-4 w-4 mr-1" />
            End Shift
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Employee shift card component
function EmployeeShiftCard({ 
  assignment, 
  onAction, 
  onContactCrewChief, 
  onReportIssue,
  crewChiefs,
  loadingActions, 
  isOnline, 
  showActions = false 
}: {
  assignment: any;
  onAction: (id: string, action: string) => void;
  onContactCrewChief: (id: string, method: 'call' | 'text') => void;
  onReportIssue: (shiftId: string, issue: string) => void;
  crewChiefs: any[];
  loadingActions: Record<string, boolean>;
  isOnline: boolean;
  showActions?: boolean;
}) {
  const shift = assignment.shift;
  const daysUntil = differenceInDays(new Date(shift.date), new Date());
  const priorityStatus = getPriorityBadge(daysUntil);
  
  // Calculate role badge config
  const roleConfigs: Record<string, { name: string; color: string }> = {
    'CC': { name: 'Crew Chief', color: 'bg-blue-100 text-blue-800' },
    'SH': { name: 'Stagehand', color: 'bg-emerald-100 text-emerald-800' },
    'FO': { name: 'Fork Operator', color: 'bg-purple-100 text-purple-800' },
    'RFO': { name: 'Rough Fork Op.', color: 'bg-orange-100 text-orange-800' },
    'RG': { name: 'Rigger', color: 'bg-red-100 text-red-800' },
    'GL': { name: 'General Labor', color: 'bg-slate-100 text-slate-800' }
  };
  
  const roleConfig = roleConfigs[assignment.roleCode] || { 
    name: assignment.roleCode, 
    color: 'bg-gray-100 text-gray-800' 
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      assignment.status === 'ClockedIn' && "border-l-4 border-l-emerald-500",
      assignment.status === 'OnBreak' && "border-l-4 border-l-amber-500"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{shift.job.name}</h3>
              <StatusBadge status={assignment.status} size="sm" />
              {daysUntil <= 1 && <StatusBadge status={priorityStatus} size="sm" />}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{shift.job.company.name}</span>
              </div>
              <Badge className={cn("text-xs", roleConfig.color)}>
                {roleConfig.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
        </div>
      </CardHeader>
      
      {showActions && (
        <CardContent className="pt-0">
          <div className="flex gap-2">
            {assignment.status === 'Assigned' && (
              <Button
                onClick={() => onAction(assignment.id, 'clock_in')}
                disabled={!isOnline || loadingActions[assignment.id]}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-1" />
                Clock In
              </Button>
            )}
            
            {assignment.status === 'ClockedIn' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onAction(assignment.id, 'start_break')}
                  disabled={!isOnline || loadingActions[assignment.id]}
                  className="flex-1"
                >
                  <Coffee className="h-4 w-4 mr-1" />
                  Break
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onAction(assignment.id, 'end_shift')}
                  disabled={!isOnline || loadingActions[assignment.id]}
                  className="flex-1"
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  End
                </Button>
              </>
            )}
            
            {assignment.status === 'OnBreak' && (
              <>
                <Button
                  onClick={() => onAction(assignment.id, 'end_break')}
                  disabled={!isOnline || loadingActions[assignment.id]}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Return
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onAction(assignment.id, 'end_shift')}
                  disabled={!isOnline || loadingActions[assignment.id]}
                  className="flex-1"
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  End
                </Button>
              </>
            )}
            
            {/* Contact/Help Button */}
            {crewChiefs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContactCrewChief(crewChiefs[0].id, 'call')}
                className="px-3"
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Time Tracking Summary */}
          {assignment.timeEntries && assignment.timeEntries.length > 0 && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time logged:</span>
                <span className="font-medium">
                  {assignment.timeEntries.reduce((total: number, entry: any) => {
                    if (entry.clockIn && entry.clockOut) {
                      return total + differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn));
                    }
                    return total;
                  }, 0)} minutes
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Recent shift summary component
function RecentShiftCard({ assignment }: { assignment: any }) {
  const shift = assignment.shift;
  const totalTimeMinutes = assignment.timeEntries?.reduce((total: number, entry: any) => {
    if (entry.clockIn && entry.clockOut) {
      return total + differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn));
    }
    return total;
  }, 0) || 0;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">{shift.job.name}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{format(new Date(shift.date), 'MMM dd')}</span>
              <span>{formatTime(totalTimeMinutes)}</span>
            </div>
          </div>
          <div className="text-right">
            <StatusBadge status={assignment.status} size="sm" />
            {assignment.timeEntries?.some((entry: any) => entry.verified) && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}