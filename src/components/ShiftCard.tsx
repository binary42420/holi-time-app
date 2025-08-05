import React from 'react';
import Link from 'next/link';
import { Shift, WorkerRole } from '@/lib/types';
import { ROLE_DEFINITIONS } from '@/lib/constants';
import { ShiftStatus } from '@prisma/client';
import { BuildingOfficeIcon, CalendarIcon, ClockIcon } from './IconComponents';
import { FileText, AlertTriangle } from "lucide-react";
import { CompanyAvatar } from './CompanyAvatar';
import { getWorkersNeeded, calculateShiftRequirements, calculateAssignedWorkers } from '@/lib/worker-count-utils';
import { getFulfillmentStatus } from '@/components/ui/status-badge';

interface ShiftCardProps {
  shift: Shift;
  onClick: (shift: Shift) => void;
}

const ShiftCard: React.FC<ShiftCardProps> = ({ shift, onClick }) => {
  // Use shared calculation functions for consistency
  const totalSlots = calculateShiftRequirements(shift);
  const filledSlots = calculateAssignedWorkers(shift);
  const filledPercentage = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
  const isOverfilled = filledSlots > totalSlots;
  const overfilledBy = Math.max(0, filledSlots - totalSlots);
  
  // Get fulfillment status
  const fulfillmentStatus = getFulfillmentStatus(filledSlots, totalSlots);

  // Get progress bar color based on fulfillment status
  const getProgressBarColor = () => {
    switch (fulfillmentStatus) {
      case 'OVERSTAFFED_HIGH':
        return "bg-gradient-to-r from-red-400 to-red-500";
      case 'OVERSTAFFED_MEDIUM':
        return "bg-gradient-to-r from-orange-400 to-orange-500";
      case 'OVERSTAFFED_LOW':
        return "bg-gradient-to-r from-yellow-400 to-yellow-500";
      case 'FULL':
        return "bg-gradient-to-r from-green-400 to-green-600";
      case 'GOOD':
        return "bg-gradient-to-r from-yellow-400 to-yellow-500"; // 80%+ but not full - yellow warning
      case 'LOW':
        return "bg-gradient-to-r from-orange-400 to-orange-500"; // 60-80% - orange warning
      case 'CRITICAL':
        return "bg-gradient-to-r from-red-400 to-red-500"; // <60% - red critical
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500";
    }
  };

  // Get text color based on fulfillment status
  const getStatusTextColor = () => {
    switch (fulfillmentStatus) {
      case 'OVERSTAFFED_HIGH':
        return "text-red-400";
      case 'OVERSTAFFED_MEDIUM':
        return "text-orange-400";
      case 'OVERSTAFFED_LOW':
        return "text-yellow-400";
      case 'FULL':
        return "text-green-400";
      case 'GOOD':
        return "text-yellow-400";
      case 'LOW':
        return "text-orange-400";
      case 'CRITICAL':
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  // Create role counts from required fields
  const roleCounts: Record<string, number> = {};
  if ((shift as any).requiredCrewChiefs > 0) roleCounts['CC'] = (shift as any).requiredCrewChiefs;
  if ((shift as any).requiredStagehands > 0) roleCounts['SH'] = (shift as any).requiredStagehands;
  if ((shift as any).requiredForkOperators > 0) roleCounts['FO'] = (shift as any).requiredForkOperators;
  if ((shift as any).requiredReachForkOperators > 0) roleCounts['RFO'] = (shift as any).requiredReachForkOperators;
  if ((shift as any).requiredRiggers > 0) roleCounts['RG'] = (shift as any).requiredRiggers;
  if ((shift as any).requiredGeneralLaborers > 0) roleCounts['GL'] = (shift as any).requiredGeneralLaborers;

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
          <CompanyAvatar
            src={shift.job.company.company_logo_url}
            name={shift.job.company.name}
            className="w-5 h-5 mr-2"
          />
          <span className="text-sm">{shift.job.company.name}</span>
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
          {(() => {
            const workersNeeded = getWorkersNeeded({
              assignedPersonnel: shift.assignedPersonnel,
              requiredCrewChiefs: (shift as any).requiredCrewChiefs,
              requiredStagehands: (shift as any).requiredStagehands,
              requiredForkOperators: (shift as any).requiredForkOperators,
              requiredReachForkOperators: (shift as any).requiredReachForkOperators,
              requiredRiggers: (shift as any).requiredRiggers,
              requiredGeneralLaborers: (shift as any).requiredGeneralLaborers,
            });

            return workersNeeded.length > 0 ? (
              <>
                <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Workers Needed</h3>
                <div className="flex flex-wrap gap-2">
                  {workersNeeded.map((worker) => {
                    const roleDetails = ROLE_DEFINITIONS[worker.roleCode as WorkerRole];
                    if (!roleDetails) return null;
                    return (
                      <span key={worker.roleCode} className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${roleDetails.badgeClasses}`}>
                        {worker.needed} {worker.roleName}{worker.needed > 1 ? 's' : ''}
                      </span>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xs uppercase font-bold text-green-500 mb-2">Fully Staffed</h3>
                <div className="text-sm text-green-400">
                  All positions filled
                </div>
              </>
            );
          })()}
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-1 text-xs text-gray-400">
            <span>Filled Positions</span>
            <div className="flex items-center gap-1">
              {(fulfillmentStatus !== 'FULL' && fulfillmentStatus !== 'GOOD') && (
                <AlertTriangle className={`h-3 w-3 ${getStatusTextColor()}`} />
              )}
              <span className={fulfillmentStatus !== 'FULL' ? `${getStatusTextColor()} font-medium` : ""}>
                {filledSlots} of {totalSlots}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ 
                width: isOverfilled ? '100%' : `${filledPercentage}%`
              }}
            ></div>
          </div>
          {isOverfilled && (
            <div className={`text-xs ${getStatusTextColor()} mt-1 font-medium`}>
              Overstaffed by {overfilledBy}
            </div>
          )}
          {fulfillmentStatus === 'GOOD' && (
            <div className={`text-xs ${getStatusTextColor()} mt-1 font-medium`}>
              {totalSlots - filledSlots} more needed
            </div>
          )}
          {(fulfillmentStatus === 'LOW' || fulfillmentStatus === 'CRITICAL') && (
            <div className={`text-xs ${getStatusTextColor()} mt-1 font-medium`}>
              {totalSlots - filledSlots} more needed
            </div>
          )}
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
