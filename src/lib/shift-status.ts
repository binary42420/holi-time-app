import { isWithinInterval, parseISO, isAfter, isBefore } from 'date-fns';

export interface ShiftStatusResult {
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Pending';
  isLive: boolean;
  isCompleted: boolean;
}

/**
 * Determines the actual status of a shift based on timing and completion state
 */
export function getShiftStatus(shift: any): ShiftStatusResult {
  const now = new Date();
  
  // If shift is explicitly cancelled
  if (shift.status === 'Cancelled') {
    return {
      status: 'Cancelled',
      isLive: false,
      isCompleted: false
    };
  }

  // Check if timesheet is finalized (shift is completed)
  const hasTimesheet = shift.timesheets && shift.timesheets.length > 0;
  const timesheet = hasTimesheet ? shift.timesheets[0] : null;
  const isTimesheetFinalized = timesheet && (
    timesheet.status === 'PENDING_COMPANY_APPROVAL' || 
    timesheet.status === 'PENDING_MANAGER_APPROVAL' ||
    timesheet.status === 'APPROVED'
  );

  if (isTimesheetFinalized) {
    return {
      status: 'Completed',
      isLive: false,
      isCompleted: true
    };
  }

  // Parse shift times
  let shiftStart: Date;
  let shiftEnd: Date;

  try {
    // Handle different date formats
    if (typeof shift.startTime === 'string') {
      // If it's a time string like "09:00", combine with shift date
      if (shift.startTime.includes(':') && !shift.startTime.includes('T')) {
        const shiftDate = new Date(shift.date);
        const [hours, minutes] = shift.startTime.split(':').map(Number);
        shiftStart = new Date(shiftDate);
        shiftStart.setHours(hours, minutes, 0, 0);
      } else {
        shiftStart = parseISO(shift.startTime);
      }
    } else {
      shiftStart = new Date(shift.startTime);
    }

    if (typeof shift.endTime === 'string') {
      // If it's a time string like "17:00", combine with shift date
      if (shift.endTime.includes(':') && !shift.endTime.includes('T')) {
        const shiftDate = new Date(shift.date);
        const [hours, minutes] = shift.endTime.split(':').map(Number);
        shiftEnd = new Date(shiftDate);
        shiftEnd.setHours(hours, minutes, 0, 0);
        
        // Handle overnight shifts
        if (shiftEnd <= shiftStart) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }
      } else {
        shiftEnd = parseISO(shift.endTime);
      }
    } else {
      shiftEnd = new Date(shift.endTime);
    }
  } catch (error) {
    console.error('Error parsing shift times:', error);
    return {
      status: 'Pending',
      isLive: false,
      isCompleted: false
    };
  }

  // Check if shift is currently ongoing
  const isOngoing = isWithinInterval(now, { start: shiftStart, end: shiftEnd });
  
  if (isOngoing) {
    return {
      status: 'Ongoing',
      isLive: true,
      isCompleted: false
    };
  }

  // Check if shift is in the future
  if (isBefore(now, shiftStart)) {
    return {
      status: 'Scheduled',
      isLive: false,
      isCompleted: false
    };
  }

  // Check if shift has ended but timesheet not finalized
  if (isAfter(now, shiftEnd)) {
    return {
      status: 'Pending',
      isLive: false,
      isCompleted: false
    };
  }

  // Default fallback
  return {
    status: 'Scheduled',
    isLive: false,
    isCompleted: false
  };
}

/**
 * Gets display-friendly status text
 */
export function getShiftStatusDisplay(shiftStatus: ShiftStatusResult): string {
  switch (shiftStatus.status) {
    case 'Ongoing':
      return 'Live';
    case 'Completed':
      return 'Completed';
    case 'Scheduled':
      return 'Scheduled';
    case 'Pending':
      return 'Pending Completion';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}