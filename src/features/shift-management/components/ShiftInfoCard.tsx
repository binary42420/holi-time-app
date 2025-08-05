"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Info, FileText, CheckCircle, AlertTriangle, Shield, XCircle } from "lucide-react";
import { Shift } from "@/lib/types";
import { ShiftStatus } from "@prisma/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { TIMESHEET_STATUS } from "@/constants";
import { UnifiedStatusBadge } from "@/components/ui/unified-status-badge";

interface ShiftInfoCardProps {
  shift: Shift & {
    timesheets?: {
      id: string;
      status: string;
    }[];
  };
}



export function ShiftInfoCard({ shift }: ShiftInfoCardProps) {
  const router = useRouter();
  const timesheet = shift.timesheets?.[0]; // Get the first (and should be only) timesheet

  const getTimesheetStatusBadge = (status?: string) => {
    if (!status) {
      return <UnifiedStatusBadge status="CRITICAL" size="sm" />;
    }

    const handleTimesheetClick = () => {
      if (!timesheet?.id) return;
      
      // Route based on status and user permissions
      if (status === TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL) {
        router.push(`/timesheets/${timesheet.id}/client-approval`);
      } else if (status === TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL) {
        router.push(`/timesheets/${timesheet.id}/final-approval`);
      } else if (status === TIMESHEET_STATUS.COMPLETED) {
        router.push(`/timesheets/${timesheet.id}/details`);
      }
    };

    const isClickable = [
      TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL, 
      TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL, 
      TIMESHEET_STATUS.COMPLETED
    ].includes(status as any);

    const badgeElement = <UnifiedStatusBadge status={status} size="sm" />;

    if (isClickable) {
      return (
        <div onClick={handleTimesheetClick} className="cursor-pointer">
          {badgeElement}
        </div>
      );
    }

    return badgeElement;
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">Shift Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2"><Info className="h-4 w-4" /> Status</span>
            <UnifiedStatusBadge status={shift.status} size="sm" />
          </div>

          {/* Timesheet Status */}
          {timesheet && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Timesheet</span>
              {getTimesheetStatusBadge(timesheet.status)}
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Date</span>
            <span className="font-medium">{format(new Date(shift.date), 'PPP')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Time</span>
            <span className="font-medium">
              {format(new Date(shift.startTime), 'p')} - {format(new Date(shift.endTime), 'p')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</span>
            <span className="font-medium">{shift.location}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}