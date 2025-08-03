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

interface ShiftInfoCardProps {
  shift: Shift & {
    timesheets?: {
      id: string;
      status: string;
    }[];
  };
}

const statusStyles: Record<ShiftStatus, string> = {
  [ShiftStatus.Pending]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [ShiftStatus.InProgress]: "bg-green-100 text-green-800 border-green-200",
  [ShiftStatus.Completed]: "bg-gray-100 text-gray-800 border-gray-200",
  [ShiftStatus.Cancelled]: "bg-red-100 text-red-800 border-red-200",
  [ShiftStatus.Active]: "bg-blue-100 text-blue-800 border-blue-200",
};

export function ShiftInfoCard({ shift }: ShiftInfoCardProps) {
  const router = useRouter();
  const timesheet = shift.timesheets?.[0]; // Get the first (and should be only) timesheet

  const getTimesheetStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <Badge variant="outline" className="text-sm bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Missing Timesheet
        </Badge>
      );
    }

    if (!status) return null;

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

    switch (status) {
      case TIMESHEET_STATUS.DRAFT:
        return (
          <Badge variant="outline" className="text-sm bg-gray-50 text-gray-700 border-gray-200">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      case TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL:
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-sm bg-yellow-50 text-yellow-700 border-yellow-200",
              isClickable && "cursor-pointer hover:bg-yellow-100"
            )}
            onClick={handleTimesheetClick}
          >
            <Clock className="h-3 w-3 mr-1" />
            Awaiting Client Signature
          </Badge>
        );
      case TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL:
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-sm bg-orange-50 text-orange-700 border-orange-200",
              isClickable && "cursor-pointer hover:bg-orange-100"
            )}
            onClick={handleTimesheetClick}
          >
            <Shield className="h-3 w-3 mr-1" />
            Pending Final Approval
          </Badge>
        );
      case TIMESHEET_STATUS.COMPLETED:
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-sm bg-green-50 text-green-700 border-green-200",
              isClickable && "cursor-pointer hover:bg-green-100"
            )}
            onClick={handleTimesheetClick}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalized
          </Badge>
        );
      case TIMESHEET_STATUS.REJECTED:
        return (
          <Badge variant="outline" className="text-sm bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
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
            <Badge variant="outline" className={cn("text-sm", statusStyles[shift.status])}>
              {shift.status}
            </Badge>
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