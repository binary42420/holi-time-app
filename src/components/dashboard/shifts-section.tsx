import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Timer,
  UserCheck,
  Coffee,
  Building2,
} from "lucide-react";
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { CompanyAvatar } from '@/components/CompanyAvatar';
import { UnifiedStatusBadge } from '@/components/ui/unified-status-badge';

// Helper function to safely format time strings
const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return '';

  try {
    let date: Date;

    // Attempt to parse directly first (handles ISO strings like "2025-08-02T17:00:00.000Z")
    const directDate = new Date(timeString);
    if (!isNaN(directDate.getTime())) {
      date = directDate;
    } else {
      // If direct parsing fails, assume it's a time-only string (e.g., "17:00")
      // Prepend a dummy date to create a valid Date object for time formatting
      const dummyDate = new Date(`2000-01-01T${timeString}`);
      if (!isNaN(dummyDate.getTime())) {
        date = dummyDate;
      } else {
        // If still invalid, log and return original string
        console.warn(`Invalid time format: ${timeString}`);
        return timeString;
      }
    }
    
    return format(date, 'h:mm a');
  } catch (error) {
    console.warn(`Error formatting time: ${timeString}`, error);
    return timeString || '';
  }
};

interface ShiftsSectionProps {
  shifts: any[];
  isLoading: boolean;
  error: any;
  meta: any;
  onShiftClick: (shiftId: string) => void;
  onPageChange: (page: number) => void;
  className?: string;
}



interface FulfillmentBadgeProps {
  assigned: number;
  requested: number;
}

export const FulfillmentBadge = ({ assigned, requested }: FulfillmentBadgeProps) => {
  const fulfillmentStatus = assigned >= requested ? 'FULL' : 
                           assigned >= requested * 0.7 ? 'GOOD' : 
                           'CRITICAL';
  
  return (
    <UnifiedStatusBadge 
      status={fulfillmentStatus}
      count={assigned}
      total={requested}
      showCount 
      size="sm"
    />
  );
};

const formatShiftDate = (date: string) => {
  const shiftDate = new Date(date);
  if (isToday(shiftDate)) return 'Today';
  if (isTomorrow(shiftDate)) return 'Tomorrow';
  if (isYesterday(shiftDate)) return 'Yesterday';
  return format(shiftDate, 'MMM d');
};

const WorkerStatusSummary = ({ workerStatus }: { workerStatus: any }) => {
  const statusItems = [
    { key: 'clockedIn', label: 'Working', icon: UserCheck, color: 'text-green-600' },
    { key: 'onBreak', label: 'Break', icon: Coffee, color: 'text-yellow-600' },
    { key: 'assigned', label: 'Assigned', icon: Users, color: 'text-blue-600' },
    { key: 'noShow', label: 'No Show', icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <div className="flex items-center gap-3 text-xs">
      {statusItems.map(({ key, label, icon: Icon, color }) => {
        const count = workerStatus[key] || 0;
        if (count === 0) return null;
        
        return (
          <div key={key} className="flex items-center gap-1">
            <Icon className={cn("h-3 w-3", color)} />
            <span className="font-medium">{count}</span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export function ShiftsSection({
  shifts,
  isLoading,
  error,
  meta,
  onShiftClick,
  onPageChange,
  className,
}: ShiftsSectionProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load shifts. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!shifts || shifts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground">No shifts scheduled</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No shifts in the 72-hour window.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Shifts
            <Badge variant="secondary" className="ml-2">
              {meta?.total || shifts.length}
            </Badge>
          </CardTitle>
          
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(meta.page - 1)}
                disabled={!meta.hasPrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(meta.page + 1)}
                disabled={!meta.hasNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shifts.map((shift) => (
          <div
            key={shift.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onShiftClick(shift.id)}
          >
            <div className="flex items-center space-x-4 flex-1">
              <CompanyAvatar
                src={shift.job.company.company_logo_url}
                name={shift.job.company.name}
                className="h-12 w-12"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{shift.job.name}</h4>
                  <UnifiedStatusBadge status={shift.status} size="sm" />
                  <FulfillmentBadge 
                    assigned={shift.fulfillment.totalAssigned}
                    requested={shift.fulfillment.totalRequired}
                  />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatShiftDate(shift.date)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {shift.startTime && formatTime(shift.startTime)}
                    {shift.endTime && ` - ${formatTime(shift.endTime)}`}
                  </div>
                  {shift.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {shift.location}
                    </div>
                  )}
                </div>

                <WorkerStatusSummary workerStatus={shift.workerStatus} />

                {shift.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {shift.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {shift.assignedPersonnel.slice(0, 3).map((ap: any, index: number) => (
                  <Avatar
                    key={ap.user.id}
                    src={ap.user.avatarUrl}
                    name={ap.user.name}
                    userId={ap.user.id}
                    size="sm"
                    enableSmartCaching={true}
                    className={cn(
                      "h-8 w-8 border-2 border-background",
                      index > 0 && "ml-0"
                    )}
                  />
                ))}
                {shift.assignedPersonnel.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{shift.assignedPersonnel.length - 3}
                  </div>
                )}
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
