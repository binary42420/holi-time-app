import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusBadge, getFulfillmentStatus, getPriorityBadge } from '@/components/ui/status-badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { 
  Briefcase, 
  Calendar, 
  MapPin, 
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Building2
} from 'lucide-react';
import { format, differenceInDays, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EnhancedJobCardProps {
  job: {
    id: string;
    name: string;
    description?: string;
    status: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    budget?: string;
    company: {
      id: string;
      name: string;
      company_logo_url?: string;
    };
    shifts?: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      requiredCrewChiefs: number;
      requiredStagehands: number;
      requiredForkOperators: number;
      requiredReachForkOperators: number;
      requiredRiggers: number;
      requiredGeneralLaborers: number;
      assignedPersonnel?: Array<{
        id: string;
        status: string;
        user: { id: string; name: string; };
      }>;
    }>;
    _count?: {
      shifts: number;
      documents: number;
    };
  };
  onView: (job: any) => void;
  onEdit: (job: any) => void;
  onDelete: (job: any) => void;
  className?: string;
}

export function EnhancedJobCard({ job, onView, onEdit, onDelete, className }: EnhancedJobCardProps) {
  // Calculate job metrics
  const totalShifts = job.shifts?.length || job._count?.shifts || 0;
  const totalDocuments = job._count?.documents || 0;
  
  // Calculate overall staffing metrics
  const staffingMetrics = job.shifts?.reduce((acc, shift) => {
    const required = (shift.requiredCrewChiefs || 0) + 
                    (shift.requiredStagehands || 0) + 
                    (shift.requiredForkOperators || 0) + 
                    (shift.requiredReachForkOperators || 0) + 
                    (shift.requiredRiggers || 0) + 
                    (shift.requiredGeneralLaborers || 0);
    
    const assigned = shift.assignedPersonnel?.length || 0;
    const working = shift.assignedPersonnel?.filter(p => p.status === 'ClockedIn').length || 0;
    const completed = shift.assignedPersonnel?.filter(p => p.status === 'ShiftEnded').length || 0;
    
    return {
      totalRequired: acc.totalRequired + required,
      totalAssigned: acc.totalAssigned + assigned,
      totalWorking: acc.totalWorking + working,
      totalCompleted: acc.totalCompleted + completed,
      shiftsWithIssues: acc.shiftsWithIssues + (assigned < required ? 1 : 0)
    };
  }, { totalRequired: 0, totalAssigned: 0, totalWorking: 0, totalCompleted: 0, shiftsWithIssues: 0 }) || 
  { totalRequired: 0, totalAssigned: 0, totalWorking: 0, totalCompleted: 0, shiftsWithIssues: 0 };

  // Calculate job progress and health
  const overallFulfillment = getFulfillmentStatus(staffingMetrics.totalAssigned, staffingMetrics.totalRequired);
  const fulfillmentPercentage = staffingMetrics.totalRequired > 0 ? 
    Math.min((staffingMetrics.totalAssigned / staffingMetrics.totalRequired) * 100, 100) : 100;

  // Upcoming shifts analysis
  const upcomingShifts = job.shifts?.filter(shift => 
    isAfter(new Date(shift.date), new Date())
  ).slice(0, 3) || [];
  
  const nextShift = upcomingShifts[0];
  const urgentShifts = upcomingShifts.filter(shift => {
    const daysUntil = differenceInDays(new Date(shift.date), new Date());
    return daysUntil <= 2;
  }).length;

  // Job timeline status
  const now = new Date();
  const startDate = job.startDate ? new Date(job.startDate) : null;
  const endDate = job.endDate ? new Date(job.endDate) : null;
  
  let timelineStatus = 'SCHEDULED';
  if (startDate && isBefore(now, startDate)) {
    const daysUntil = differenceInDays(startDate, now);
    timelineStatus = getPriorityBadge(daysUntil);
  } else if (startDate && endDate && isAfter(now, startDate) && isBefore(now, endDate)) {
    timelineStatus = 'ACTIVE';
  } else if (endDate && isAfter(now, endDate)) {
    timelineStatus = 'COMPLETED';
  }

  // Determine card accent color and styling
  const getCardStyling = () => {
    if (job.status === 'Cancelled') return 'border-l-red-500 hover:shadow-red-500/20';
    if (urgentShifts > 0 && overallFulfillment === 'CRITICAL') return 'border-l-red-500 hover:shadow-red-500/20';
    if (job.status === 'Active' && overallFulfillment === 'FULL') return 'border-l-emerald-500 hover:shadow-emerald-500/20';
    if (job.status === 'OnHold') return 'border-l-amber-500 hover:shadow-amber-500/20';
    if (job.status === 'Completed') return 'border-l-blue-500 hover:shadow-blue-500/20';
    return 'border-l-slate-500 hover:shadow-slate-500/20';
  };

  return (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-300 border-l-4',
      getCardStyling(),
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-tight truncate">{job.name}</h3>
              <StatusBadge status={job.status} size="sm" />
              {timelineStatus !== 'SCHEDULED' && (
                <StatusBadge status={timelineStatus} size="sm" />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{job.company.name}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(job)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(job)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(job)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Job Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {job.startDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(job.startDate), 'MMM dd')}
                {job.endDate && ` - ${format(new Date(job.endDate), 'MMM dd, yyyy')}`}
              </span>
            </div>
          )}
          
          {job.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{job.location}</span>
            </div>
          )}
          
          {job.budget && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{job.budget}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{totalDocuments} Document{totalDocuments !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Staffing Overview */}
        {staffingMetrics.totalRequired > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Overall Staffing</span>
              </div>
              <StatusBadge 
                status={overallFulfillment}
                count={staffingMetrics.totalAssigned}
                total={staffingMetrics.totalRequired}
                showCount
                size="sm"
              />
            </div>
            
            <Progress value={fulfillmentPercentage} className="h-2" />
            
            {staffingMetrics.shiftsWithIssues > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>{staffingMetrics.shiftsWithIssues} shift{staffingMetrics.shiftsWithIssues > 1 ? 's' : ''} understaffed</span>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Shifts Preview */}
        {upcomingShifts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-muted-foreground">
                Upcoming Shifts ({totalShifts} total)
              </span>
              {urgentShifts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {urgentShifts} Urgent
                </Badge>
              )}
            </div>
            
            <div className="space-y-1">
              {upcomingShifts.map(shift => {
                const required = (shift.requiredCrewChiefs || 0) + 
                                (shift.requiredStagehands || 0) + 
                                (shift.requiredForkOperators || 0) + 
                                (shift.requiredReachForkOperators || 0) + 
                                (shift.requiredRiggers || 0) + 
                                (shift.requiredGeneralLaborers || 0);
                const assigned = shift.assignedPersonnel?.length || 0;
                const fulfillment = getFulfillmentStatus(assigned, required);
                const daysUntil = differenceInDays(new Date(shift.date), new Date());

                return (
                  <Link 
                    href={`/shifts/${shift.id}`} 
                    key={shift.id}
                    className="block p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(new Date(shift.date), 'MMM dd')}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(shift.startTime), 'h:mm a')}
                        </span>
                        {daysUntil <= 1 && (
                          <StatusBadge status={getPriorityBadge(daysUntil)} size="sm" />
                        )}
                      </div>
                      
                      <StatusBadge 
                        status={fulfillment}
                        count={assigned}
                        total={required}
                        showCount
                        size="sm"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {nextShift ? (
              `Next shift: ${format(new Date(nextShift.date), 'MMM dd')}`
            ) : (
              totalShifts === 0 ? 'No shifts scheduled' : 'All shifts completed'
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => onView(job)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}