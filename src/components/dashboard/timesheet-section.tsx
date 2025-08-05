import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Users,
  Calendar,
  Building2,
  ChevronRight,
} from "lucide-react";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { UnifiedStatusBadge } from '@/components/ui/unified-status-badge';

interface TimesheetSectionProps {
  timesheets: any[];
  isLoading: boolean;
  error: any;
  onTimesheetClick: (timesheetId: string, shiftId: string) => void;
  onApproveTimesheet?: (timesheetId: string) => void;
  onRejectTimesheet?: (timesheetId: string) => void;
  className?: string;
}



export function TimesheetSection({
  timesheets,
  isLoading,
  error,
  onTimesheetClick,
  onApproveTimesheet,
  onRejectTimesheet,
  className,
}: TimesheetSectionProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Timesheets Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
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
            <FileText className="h-5 w-5" />
            Timesheets Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load timesheets. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!timesheets || timesheets.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Timesheets Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No timesheets pending approval at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Timesheets Pending Approval
          <Badge variant="secondary" className="ml-auto">
            {timesheets.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {timesheets.map((timesheet) => (
          <div
            key={timesheet.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onTimesheetClick(timesheet.id, timesheet.shiftId)}
          >
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex -space-x-2">
                {timesheet.shift.assignedPersonnel.slice(0, 3).map((ap: any, index: number) => (
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
                {timesheet.shift.assignedPersonnel.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{timesheet.shift.assignedPersonnel.length - 3}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{timesheet.shift.job.name}</h4>
                  <UnifiedStatusBadge status={timesheet.status} size="sm" />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(timesheet.shift.date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {timesheet.shift.job.company.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {timesheet.shift.assignedPersonnel.length} workers
                  </div>
                </div>
                
                {timesheet.submittedAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Submitted {format(new Date(timesheet.submittedAt), 'MMM d, h:mm a')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {timesheet.permissions.canApprove && onApproveTimesheet && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApproveTimesheet(timesheet.id);
                  }}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              
              {timesheet.permissions.canModify && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimesheetClick(timesheet.id, timesheet.shiftId);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onTimesheetClick(timesheet.id, timesheet.shiftId);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}