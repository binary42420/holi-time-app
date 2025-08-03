import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge, getFulfillmentStatus } from '@/components/ui/status-badge';
import { EnhancedWorkerCard } from '@/components/enhanced-worker-card';
import { Avatar } from '@/components/Avatar';
import { 
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  StopCircle,
  Coffee,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Timer,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Bell,
  Settings,
  Eye,
  TrendingUp,
  Shield,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format, differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CrewChiefDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    crew_chief_eligible: boolean;
  };
  myShifts: Array<{
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
        breakStart?: string;
        breakEnd?: string;
        notes?: string;
        isActive: boolean;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
    job: {
      id: string;
      name: string;
      company: {
        name: string;
      };
    };
  }>;
  onClockAction: (workerId: string, action: string) => Promise<void>;
  onEndShift: (workerId: string) => Promise<void>;
  onUpdateShiftStatus: (shiftId: string, status: string) => Promise<void>;
  onContactWorker: (workerId: string, method: 'call' | 'text') => void;
  onReportIssue: (shiftId: string, issue: string) => void;
  isOnline?: boolean;
  className?: string;
}

export function CrewChiefDashboard({ 
  user, 
  myShifts, 
  onClockAction, 
  onEndShift, 
  onUpdateShiftStatus,
  onContactWorker,
  onReportIssue,
  isOnline = true,
  className 
}: CrewChiefDashboardProps) {
  const [activeTab, setActiveTab] = useState('current');
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Filter shifts
  const currentShifts = myShifts.filter(shift => 
    shift.status === 'Active' || shift.status === 'InProgress'
  );
  const upcomingShifts = myShifts.filter(shift => 
    shift.status === 'Pending' && new Date(shift.date) >= new Date()
  );
  const completedShifts = myShifts.filter(shift => 
    shift.status === 'Completed'
  );

  // Calculate overall metrics
  const totalWorkers = currentShifts.reduce((sum, shift) => sum + shift.assignedPersonnel.length, 0);
  const workingNow = currentShifts.reduce((sum, shift) => 
    sum + shift.assignedPersonnel.filter(w => w.status === 'ClockedIn').length, 0
  );
  const onBreakNow = currentShifts.reduce((sum, shift) => 
    sum + shift.assignedPersonnel.filter(w => w.status === 'OnBreak' || w.status === 'ClockedOut').length, 0
  );
  const noShows = currentShifts.reduce((sum, shift) => 
    sum + shift.assignedPersonnel.filter(w => w.status === 'NoShow').length, 0
  );
  const criticalShifts = currentShifts.filter(shift => {
    const required = shift.requiredCrewChiefs + shift.requiredStagehands + 
                    shift.requiredForkOperators + shift.requiredReachForkOperators + 
                    shift.requiredRiggers + shift.requiredGeneralLaborers;
    const assigned = shift.assignedPersonnel.length;
    return getFulfillmentStatus(assigned, required) === 'CRITICAL';
  }).length;

  const handleAction = async (workerId: string, action: string) => {
    setLoadingActions(prev => ({ ...prev, [workerId]: true }));
    try {
      if (action === 'end_shift') {
        await onEndShift(workerId);
      } else {
        await onClockAction(workerId, action);
      }
    } finally {
      setLoadingActions(prev => ({ ...prev, [workerId]: false }));
      setLastUpdate(new Date());
    }
  };

  const handleShiftStatusUpdate = async (shiftId: string, status: string) => {
    setLoadingActions(prev => ({ ...prev, [`shift_${shiftId}`]: true }));
    try {
      await onUpdateShiftStatus(shiftId, status);
    } finally {
      setLoadingActions(prev => ({ ...prev, [`shift_${shiftId}`]: false }));
      setLastUpdate(new Date());
    }
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
              <h1 className="text-lg font-semibold">Crew Chief</h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  CC
                </Badge>
                {!isOnline && <WifiOff className="h-4 w-4 text-red-500" />}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {criticalShifts > 0 && (
              <StatusBadge status="CRITICAL" count={criticalShifts} showCount pulse size="sm" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastUpdate(new Date())}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="container px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{workingNow}</div>
              <div className="text-xs text-muted-foreground">Working Now</div>
              {workingNow > 0 && <div className="w-2 h-2 bg-emerald-500 rounded-full mx-auto mt-1 animate-pulse" />}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{onBreakNow}</div>
              <div className="text-xs text-muted-foreground">On Break</div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{noShows}</div>
              <div className="text-xs text-muted-foreground">No Shows</div>
              {noShows > 0 && <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalWorkers}</div>
              <div className="text-xs text-muted-foreground">Total Crew</div>
            </div>
          </Card>
        </div>
      </section>

      {/* Main Tabs */}
      <div className="container px-4 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Current ({currentShifts.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming ({upcomingShifts.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Done ({completedShifts.length})
            </TabsTrigger>
          </TabsList>

          {/* Current Shifts */}
          <TabsContent value="current" className="space-y-6">
            {currentShifts.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground">No active shifts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All caught up! Check upcoming shifts to prepare.
                </p>
              </Card>
            ) : (
              currentShifts.map(shift => (
                <CrewChiefShiftCard
                  key={shift.id}
                  shift={shift}
                  onClockAction={handleAction}
                  onEndShift={handleAction}
                  onContactWorker={onContactWorker}
                  onUpdateShiftStatus={handleShiftStatusUpdate}
                  onReportIssue={onReportIssue}
                  loadingActions={loadingActions}
                  isOnline={isOnline}
                />
              ))
            )}
          </TabsContent>

          {/* Upcoming Shifts */}
          <TabsContent value="upcoming" className="space-y-6">
            {upcomingShifts.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground">No upcoming shifts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your schedule is clear for now.
                </p>
              </Card>
            ) : (
              upcomingShifts.map(shift => (
                <UpcomingShiftCard
                  key={shift.id}
                  shift={shift}
                  onUpdateShiftStatus={handleShiftStatusUpdate}
                  loadingActions={loadingActions}
                />
              ))
            )}
          </TabsContent>

          {/* Completed Shifts */}
          <TabsContent value="completed" className="space-y-4">
            {completedShifts.slice(0, 10).map(shift => (
              <CompletedShiftCard
                key={shift.id}
                shift={shift}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>

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

// Component for active shift management
function CrewChiefShiftCard({ 
  shift, 
  onClockAction, 
  onEndShift, 
  onContactWorker, 
  onUpdateShiftStatus,
  onReportIssue,
  loadingActions, 
  isOnline 
}: {
  shift: any;
  onClockAction: (workerId: string, action: string) => void;
  onEndShift: (workerId: string) => void;
  onContactWorker: (workerId: string, method: 'call' | 'text') => void;
  onUpdateShiftStatus: (shiftId: string, status: string) => void;
  onReportIssue: (shiftId: string, issue: string) => void;
  loadingActions: Record<string, boolean>;
  isOnline: boolean;
}) {
  const [showAllWorkers, setShowAllWorkers] = useState(false);
  
  const totalRequired = shift.requiredCrewChiefs + shift.requiredStagehands + 
                       shift.requiredForkOperators + shift.requiredReachForkOperators + 
                       shift.requiredRiggers + shift.requiredGeneralLaborers;
  const totalAssigned = shift.assignedPersonnel.length;
  const fulfillmentStatus = getFulfillmentStatus(totalAssigned, totalRequired);
  
  const workingCount = shift.assignedPersonnel.filter((w: any) => w.status === 'ClockedIn').length;
  const workProgress = totalAssigned > 0 ? (workingCount / totalAssigned) * 100 : 0;

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{shift.job.name}</h3>
              <StatusBadge status={shift.status} />
              <StatusBadge 
                status={fulfillmentStatus}
                count={totalAssigned}
                total={totalRequired}
                showCount
                size="sm"
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(shift.startTime), 'h:mm a')} - {format(new Date(shift.endTime), 'h:mm a')}
                </span>
              </div>
              {shift.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{shift.location}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReportIssue(shift.id, 'general')}
              disabled={!isOnline}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
            
            {shift.status === 'Active' && (
              <Button
                size="sm"
                onClick={() => onUpdateShiftStatus(shift.id, 'Completed')}
                disabled={!isOnline || loadingActions[`shift_${shift.id}`]}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Crew Progress</span>
            <span>{workingCount}/{totalAssigned} working</span>
          </div>
          <Progress value={workProgress} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Worker Management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Your Crew</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllWorkers(!showAllWorkers)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {showAllWorkers ? 'Hide' : 'Show All'}
            </Button>
          </div>
          
          <div className="space-y-2">
            {(showAllWorkers ? shift.assignedPersonnel : shift.assignedPersonnel.slice(0, 3))
              .map((worker: any) => (
                <div key={worker.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={worker.user.avatarUrl}
                      name={worker.user.name}
                      userId={worker.user.id}
                      size="sm"
                      className="h-8 w-8"
                    />
                    <div>
                      <div className="font-medium text-sm">{worker.user.name}</div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={worker.status} size="sm" />
                        <Badge variant="outline" className="text-xs">{worker.roleCode}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Contact buttons */}
                    {worker.user.phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onContactWorker(worker.id, 'call')}
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {/* Action buttons based on status */}
                    {worker.status === 'Assigned' && (
                      <Button
                        size="sm"
                        onClick={() => onClockAction(worker.id, 'clock_in')}
                        disabled={!isOnline || loadingActions[worker.id]}
                        className="h-8 px-2"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    
                    {worker.status === 'ClockedIn' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onClockAction(worker.id, 'clock_out')}
                          disabled={!isOnline || loadingActions[worker.id]}
                          className="h-8 px-2"
                        >
                          <Coffee className="h-3 w-3 mr-1" />
                          Break
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onEndShift(worker.id)}
                          disabled={!isOnline || loadingActions[worker.id]}
                          className="h-8 px-2"
                        >
                          <StopCircle className="h-3 w-3 mr-1" />
                          End
                        </Button>
                      </>
                    )}
                    
                    {(worker.status === 'OnBreak' || worker.status === 'ClockedOut') && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onClockAction(worker.id, 'clock_in')}
                          disabled={!isOnline || loadingActions[worker.id]}
                          className="h-8 px-2"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Return
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onEndShift(worker.id)}
                          disabled={!isOnline || loadingActions[worker.id]}
                          className="h-8 px-2"
                        >
                          <StopCircle className="h-3 w-3 mr-1" />
                          End
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            
            {!showAllWorkers && shift.assignedPersonnel.length > 3 && (
              <div className="text-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllWorkers(true)}
                >
                  +{shift.assignedPersonnel.length - 3} more workers
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Upcoming shift preview component
function UpcomingShiftCard({ shift, onUpdateShiftStatus, loadingActions }: any) {
  const totalRequired = shift.requiredCrewChiefs + shift.requiredStagehands + 
                       shift.requiredForkOperators + shift.requiredReachForkOperators + 
                       shift.requiredRiggers + shift.requiredGeneralLaborers;
  const totalAssigned = shift.assignedPersonnel.length;
  const fulfillmentStatus = getFulfillmentStatus(totalAssigned, totalRequired);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold">{shift.job.name}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(shift.date), 'MMM dd')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(shift.startTime), 'h:mm a')}</span>
              </div>
            </div>
            <StatusBadge 
              status={fulfillmentStatus}
              count={totalAssigned}
              total={totalRequired}
              showCount
            />
          </div>
          
          <Button
            size="sm"
            onClick={() => onUpdateShiftStatus(shift.id, 'Active')}
            disabled={loadingActions[`shift_${shift.id}`]}
          >
            <Play className="h-4 w-4 mr-1" />
            Start Shift
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Completed shift summary component
function CompletedShiftCard({ shift }: any) {
  const completedWorkers = shift.assignedPersonnel.filter((w: any) => w.status === 'ShiftEnded').length;
  const totalWorkers = shift.assignedPersonnel.length;

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">{shift.job.name}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{format(new Date(shift.date), 'MMM dd')}</span>
              <span>{completedWorkers}/{totalWorkers} completed</span>
            </div>
          </div>
          <StatusBadge status="Completed" />
        </div>
      </CardContent>
    </Card>
  );
}