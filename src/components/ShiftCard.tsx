import React from 'react';
import Link from 'next/link';
import { Shift, WorkerRole } from '@/lib/types';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import { ShiftStatus } from '@prisma/client';
import { BuildingOfficeIcon, CalendarIcon, ClockIcon } from './IconComponents';
import { FileText } from "lucide-react";

interface ShiftCardProps {
  shift: Shift;
  onClick: (shift: Shift) => void;
}

const ShiftCard: React.FC<ShiftCardProps> = ({ shift, onClick }) => {
  const totalSlots = shift.assignments.length;
  const filledSlots = shift.assignments.filter(a => a.userId !== null).length;
  const filledPercentage = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

  const roleCounts = shift.assignments.reduce((acc, assignment) => {
    const role = assignment.roleCode as WorkerRole;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<WorkerRole, number>);

  // Check if shift has a timesheet
  const hasTimesheet = shift.timesheets && shift.timesheets.length > 0;
  const timesheet = hasTimesheet ? shift.timesheets[0] : null;

  const getStatusClasses = (status: ShiftStatus) => {
    switch (status) {
      case ShiftStatus.Active:
      case ShiftStatus.InProgress:
        return 'bg-yellow-400/10 text-yellow-300 ring-1 ring-inset ring-yellow-400/30';
      case ShiftStatus.Completed:
        return 'bg-green-500/10 text-green-300 ring-1 ring-inset ring-green-500/30';
      case ShiftStatus.Cancelled:
        return 'bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/30';
      case ShiftStatus.Pending:
      default:
        return 'bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/30';
    }
  };

  return (
    <div
      onClick={() => onClick(shift)}
      className="group bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-indigo-500/20 hover:ring-2 hover:ring-indigo-500 flex flex-col cursor-pointer hover:-translate-y-1"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(shift)}
    >
      <div className="p-4 sm:p-6 flex-grow flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-white leading-tight pr-2 mb-2 sm:mb-0">{shift.job.name}</h2>
          <span className={`flex-shrink-0 self-start px-3 py-1 text-xs font-semibold rounded-full ${getStatusClasses(shift.status)}`}>
            {shift.status}
          </span>
        </div>

        <div className="flex items-center text-gray-400 mt-2 mb-4 transition-colors group-hover:text-gray-200">
          <BuildingOfficeIcon />
          <span className="ml-2 text-sm">{shift.job.company.name}</span>
        </div>

        <div className="space-y-2 text-gray-300 text-sm border-t border-b border-gray-700 py-3 my-3">
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 text-indigo-400" />
            <span className="ml-2 font-medium">{new Date(shift.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-indigo-400" />
            <span className="ml-2">{new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="flex-grow">
          <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Workers Needed</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(roleCounts).map(([role, count]) => {
              const roleDetails = ROLE_DEFINITIONS[role as WorkerRole];
              if (!roleDetails) return null;
              return (
                <span key={role} className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${roleDetails.cardBgColor}`}>
                  {count} {roleDetails.name}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between mb-1 text-xs text-gray-400">
            <span>Filled Positions</span>
            <span>{filledSlots} of {totalSlots}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${filledPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Timesheet Link */}
        {hasTimesheet && timesheet && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <Link
              href={`/timesheets?id=${timesheet.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between w-full p-2 text-sm bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 rounded-md transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">Timesheet Available</span>
              </div>
              <span className="text-xs text-green-300/80">
                {timesheet.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftCard;
