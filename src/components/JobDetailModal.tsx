import React, { useEffect, useCallback, useState } from 'react';
import { Job, Shift, User } from '../lib/types';
import { JobStatus, ShiftStatus } from '@prisma/client';
import { XIcon, UsersIcon, BuildingOfficeIcon, CalendarIcon, ClockIcon, PlusIcon } from './IconComponents';
import { Avatar } from './Avatar';

interface JobDetailModalProps {
  job: Job;
  users: User[];
  onClose: () => void;
  onAddShift: () => void;
  onViewShift: (shift: Shift) => void;
}

const AvatarStack: React.FC<{ users: (User | undefined)[]; maxVisible?: number }> = ({ users, maxVisible = 4 }) => {
  const assignedUsers = users.filter((u): u is User => !!u);
  const visibleUsers = assignedUsers.slice(0, maxVisible);
  const hiddenCount = assignedUsers.length - visibleUsers.length;

  if (assignedUsers.length === 0) {
    return <span className="text-xs text-gray-400">No workers</span>;
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-3 overflow-hidden">
        {visibleUsers.map(user => (
          <Avatar key={user.id} src={user.avatarUrl} name={user.name || ''} userId={user.id} size="sm" enableSmartCaching={true} className="h-8 w-8" />
        ))}
      </div>
      {hiddenCount > 0 && (
        <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-xs font-bold text-white ring-2 ring-gray-800">
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, users, onClose, onAddShift, onViewShift }) => {
  const [isShowing, setIsShowing] = useState(false);

  const handleClose = () => {
    setIsShowing(false);
    setTimeout(onClose, 200); // match duration-200
  }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [onClose]);

  useEffect(() => {
    setIsShowing(true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const getStatusClasses = (status: JobStatus) => {
    switch (status) {
      case JobStatus.Active:
        return 'bg-success text-white';
      case JobStatus.Completed:
        return 'bg-surface-2 text-foreground-secondary';
      case JobStatus.Pending:
        return 'bg-warning text-white';
      case JobStatus.OnHold:
        return 'bg-error text-white';
      default:
        return 'bg-surface-2 text-foreground-secondary';
    }
  };

  const getShiftStatusTag = (status: ShiftStatus) => {
    let classes = '';
    switch (status) {
      case ShiftStatus.Completed:
        classes = 'bg-success/20 text-success'; break;
      case ShiftStatus.InProgress:
        classes = 'bg-warning/20 text-warning animate-pulse'; break;
      case ShiftStatus.Pending:
      default:
        classes = 'bg-info/20 text-info'; break;
    }
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${classes}`}>{status}</span>
  }


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity duration-200 ${isShowing ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-[90vw] max-w-2xl max-h-[90vh] bg-surface rounded-xl shadow-2xl transform transition-all duration-200 flex flex-col ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-foreground-muted hover:text-foreground"
            aria-label="Close modal"
          >
            <XIcon />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
            <h2 id="job-detail-title" className="text-2xl font-bold text-foreground mb-2 sm:mb-0 pr-8">
              {job.name}
            </h2>
            <span className={`flex-shrink-0 px-3 py-1 text-sm font-semibold rounded-full ${getStatusClasses(job.status)}`}>
              {job.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-foreground-secondary mb-6 border-b border-t border-border py-4">
            <div className="flex items-center">
              <BuildingOfficeIcon />
              <span className="ml-2 text-base">{job.company.name}</span>
            </div>
            <div className="flex items-center">
              <UsersIcon />
              <span className="ml-2 text-base">{job.requestedWorkers} workers needed</span>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6 sm:px-8 pb-6 -mt-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Job Description</h3>
            <p className="text-foreground-secondary whitespace-pre-wrap">{job.description}</p>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-foreground">Shifts for this Job</h3>
              <button
                onClick={onAddShift}
                className="flex items-center gap-1 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold py-1.5 px-3 rounded-md shadow-sm transition-transform transform hover:scale-105"
              >
                <PlusIcon className="h-4 w-4" />
                Add Shift
              </button>
            </div>
            {job.shifts && job.shifts.length > 0 ? (
              <div className="space-y-3">
                {[...job.shifts].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(shift => {
                  const assignedUsers = shift.assignedPersonnel
                    .map(a => users.find(u => u.id === a.userId))
                    .filter((u): u is User => !!u);
                  return (
                    <div
                      key={shift.id}
                      className="bg-surface-2 p-4 rounded-lg hover:bg-surface-2/60 cursor-pointer transition-colors border-l-4 border-transparent hover:border-primary-500"
                      onClick={() => onViewShift(shift)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-grow">
                          <div className="flex items-center text-foreground-secondary">
                            <CalendarIcon className="h-5 w-5 text-foreground-muted"/>
                            <span className="ml-2 font-semibold text-foreground">{new Date(shift.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center text-foreground-muted mt-1">
                            <ClockIcon className="h-5 w-5 text-foreground-muted"/>
                            <span className="ml-2 text-sm">{new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <AvatarStack users={assignedUsers} />
                          </div>
                          {getShiftStatusTag(shift.status)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-surface-2/50 rounded-lg mt-4 border border-dashed border-border-2">
                <p className="text-foreground-muted">No shifts have been created for this job yet.</p>
                <button
                  onClick={onAddShift}
                  className="mt-3 text-primary-600 font-semibold hover:text-primary-700 text-sm"
                >
                  + Create the first shift
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto p-6 sm:p-8 pt-4 border-t border-border flex-shrink-0 flex justify-end bg-surface/50 rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-border-2 shadow-sm px-4 py-2 bg-surface-2 text-base font-medium text-foreground hover:bg-border sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;