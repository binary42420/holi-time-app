import React from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Play, StopCircle, Coffee, CheckCircle2, AlertCircle } from "lucide-react";
import { IWorkerCardProps } from './types';
import { format, differenceInMinutes } from 'date-fns';

const roleColors: Record<string, { name: string; color: string; bgColor: string; borderColor: string }> = {
  'CC': { name: 'Crew Chief', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  'SH': { name: 'Stage Hand', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  'FO': { name: 'Fork Operator', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  'RFO': { name: 'Rough Fork Operator', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  'RG': { name: 'Rigger', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  'GL': { name: 'General Labor', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'Assigned':
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: Clock };
    case 'ClockedIn':
      return { label: 'Working', color: 'bg-green-100 text-green-800', icon: Play };
    case 'OnBreak':
    case 'ClockedOut':
      return { label: 'On Break', color: 'bg-yellow-100 text-yellow-800', icon: Coffee };
    case 'ShiftEnded':
      return { label: 'Completed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 };
    case 'NoShow':
      return { label: 'No Show', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    case 'UpForGrabs':
      return { label: 'Available', color: 'bg-orange-100 text-orange-800', icon: AlertCircle };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
  }
};

const calculateTotalHours = (timeEntries: any[] = []) => {
  let totalMinutes = 0;
  timeEntries.forEach(entry => {
    if (entry.clock_in && entry.clock_out) {
      totalMinutes += differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in));
    }
  });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const WorkerCard: React.FC<IWorkerCardProps> = ({ worker, onClockAction, onEndShift, loading, isOnline }) => {
  const statusConfig = getStatusConfig(worker.status);
  const roleConfig = roleColors[worker.role_code] || { name: worker.role_code, color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors" style={{ opacity: loading ? 0.5 : 1 }}>
      <div className="flex items-center gap-4">
        <Avatar
          src={(worker.user as any).avatar || (worker.user as any).avatarUrl}
          name={worker.user.name}
          userId={worker.user.id}
          size="xl"
          enableSmartCaching={true}
          className="h-16 w-16"
        />
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{worker.user.name}</h3>
            <Badge variant="outline" className={`${roleConfig.color} ${roleConfig.bgColor} ${roleConfig.borderColor}`}>
              {roleConfig.name}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-4 w-4 mr-1" />
              {statusConfig.label}
            </Badge>
            
            {worker.timeEntries && worker.timeEntries.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Total: {calculateTotalHours(worker.timeEntries)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          {worker.status === 'Assigned' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={() => onClockAction(worker.id, 'clock_in')} disabled={!isOnline || loading}>
                  <Play className="h-4 w-4 mr-1" />
                  Clock In
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start this worker's shift</TooltipContent>
            </Tooltip>
          )}

          {worker.status === 'ClockedIn' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => onClockAction(worker.id, 'clock_out')} disabled={!isOnline || loading}>
                    <Coffee className="h-4 w-4 mr-1" />
                    Break
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send worker on break</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="sm" onClick={() => onEndShift(worker.id)} disabled={!isOnline || loading}>
                    <StopCircle className="h-4 w-4 mr-1" />
                    End Shift
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
                  <Button size="sm" onClick={() => onClockAction(worker.id, 'clock_in')} disabled={!isOnline || loading}>
                    <Play className="h-4 w-4 mr-1" />
                    Return
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Return from break</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="sm" onClick={() => onEndShift(worker.id)} disabled={!isOnline || loading}>
                    <StopCircle className="h-4 w-4 mr-1" />
                    End Shift
                  </Button>
                </TooltipTrigger>
                <TooltipContent>End this worker's shift</TooltipContent>
              </Tooltip>
            </>
          )}

          {worker.status === 'ShiftEnded' && (
            <Badge variant="secondary">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default WorkerCard;
