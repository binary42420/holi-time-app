import React from 'react';
import { Job } from '@/lib/types';
import { Briefcase, MoreHorizontal, Edit, Trash2, Eye, Clock, MapPin, FileText } from "lucide-react";
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { StatusBadge, getFulfillmentStatus, getPriorityBadge } from './ui/status-badge';
import { getShiftStatus, getShiftStatusDisplay } from '@/lib/shift-status';
import Link from 'next/link';
import { differenceInDays } from 'date-fns';



const calculateShiftRequirements = (shift: any) => {
  return (shift.requiredCrewChiefs || 0) + 
         (shift.requiredStagehands || 0) + 
         (shift.requiredForkOperators || 0) + 
         (shift.requiredReachForkOperators || 0) + 
         (shift.requiredRiggers || 0) + 
         (shift.requiredGeneralLaborers || 0);
};

const calculateAssignedWorkers = (shift: any) => {
  if (!shift.assignedPersonnel) return 0;
  
  // Count all assigned personnel that have a valid assignment
  return shift.assignedPersonnel.filter((p: any) => {
    // Check if the assignment exists and is not cancelled/withdrawn
    return p && p.userId && !['Cancelled', 'Withdrawn', 'Rejected'].includes(p.status);
  }).length;
};

interface JobCardProps {
  job: Job;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onView, onEdit, onDelete }) => {
  return (
    <div 
      className="group bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-indigo-500/20 hover:ring-2 hover:ring-indigo-500"
    >
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight pr-2">
            {job.name}
          </h2>
        </div>
        
        <div className="flex items-center text-gray-400 mt-2 mb-4 transition-colors group-hover:text-gray-200">
          <Briefcase className="h-4 w-4" />
          <span className="ml-2 text-sm">{job.company?.name}</span>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-300 mb-2">Recent/Upcoming Shifts</div>
          {job.recentShifts?.slice(0, 3).map(shift => {
            const required = calculateShiftRequirements(shift);
            const assigned = calculateAssignedWorkers(shift);
            const fulfillmentStatus = getFulfillmentStatus(assigned, required);
            const daysUntil = differenceInDays(new Date(shift.date), new Date());
            const priorityStatus = getPriorityBadge(daysUntil);
            
            // Get actual shift status based on timing and completion
            const shiftStatus = getShiftStatus(shift);
            const displayStatus = getShiftStatusDisplay(shiftStatus);
            
            const startTime = new Date(shift.startTime).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            const endTime = new Date(shift.endTime).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            
            const isCompleted = shiftStatus.isCompleted;
            const hasTimesheet = shift.timesheets && shift.timesheets.length > 0;
            const timesheet = hasTimesheet ? shift.timesheets[0] : null;
            
            return (
              <Link 
                href={`/shifts/${shift.id}`} 
                key={shift.id} 
                className={`block p-3 rounded-md border transition-all ${
                  shiftStatus.isLive
                    ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30 hover:border-red-500/50 ring-1 ring-red-500/20'
                    : isCompleted 
                    ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30 hover:border-green-500/50' 
                    : 'hover:bg-gray-700/50 border-gray-600/50 hover:border-gray-500/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(shift.date).toLocaleDateString()}</span>
                      <span className="text-gray-500">•</span>
                      <span>{startTime} - {endTime}</span>
                    </div>
                    
                    {shift.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="h-3 w-3" />
                        <span>{shift.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={shiftStatus.status} size="sm" />
                      {daysUntil <= 1 && !shiftStatus.isLive && <StatusBadge status={priorityStatus} size="sm" />}
                    </div>
                    
                    {isCompleted && hasTimesheet ? (
                      <Link
                        href={`/timesheets/${timesheet.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-400 bg-green-900/30 border border-green-500/50 rounded-md hover:bg-green-900/50 transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Timesheet</span>
                        <StatusBadge status={timesheet.status} size="sm" />
                      </Link>
                    ) : !isCompleted ? (
                      <StatusBadge 
                        status={fulfillmentStatus}
                        count={assigned}
                        total={required}
                        showCount
                        size="sm"
                      />
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
          {(!job.recentShifts || job.recentShifts.length === 0) && (
            <div className="text-xs text-gray-500 italic">No recent shifts</div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-700 flex justify-between items-center gap-2">
          <Button 
            variant="outline" 
            className="text-xs p-1.5 h-auto" 
            onClick={() => onView(job)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      </div>
    </div>
  );
};

export default JobCard;
