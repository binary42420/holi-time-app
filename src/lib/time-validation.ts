/**
 * Time tracking validation utilities
 */

export interface TimeValidationError {
  field: string;
  message: string;
}

export interface TimeEntry {
  clockIn: Date | string;
  clockOut?: Date | string;
  entryNumber: number;
}

export class TimeValidationService {
  private static readonly MIN_WORK_PERIOD_MINUTES = 15;
  private static readonly MAX_WORK_PERIOD_HOURS = 16;
  private static readonly MAX_DAILY_HOURS = 12;

  /**
   * Validates a clock-in time
   */
  static validateClockIn(
    clockInTime: Date,
    existingEntries: TimeEntry[],
    shiftStartTime: Date,
    shiftEndTime: Date
  ): TimeValidationError[] {
    const errors: TimeValidationError[] = [];

    // Check if clock-in is within shift bounds
    if (clockInTime < shiftStartTime || clockInTime > shiftEndTime) {
      errors.push({
        field: 'clockIn',
        message: 'Clock in time must be within shift hours'
      });
    }

    // Check for overlapping entries
    const overlapping = existingEntries.find(entry => {
      if (!entry.clockOut) return false; // Skip active entries
      const entryStart = new Date(entry.clockIn);
      const entryEnd = new Date(entry.clockOut);
      return clockInTime >= entryStart && clockInTime <= entryEnd;
    });

    if (overlapping) {
      errors.push({
        field: 'clockIn',
        message: `Clock in time overlaps with existing entry #${overlapping.entryNumber}`
      });
    }

    return errors;
  }

  /**
   * Validates a clock-out time
   */
  static validateClockOut(
    clockOutTime: Date,
    clockInTime: Date,
    existingEntries: TimeEntry[],
    shiftEndTime: Date
  ): TimeValidationError[] {
    const errors: TimeValidationError[] = [];

    // Check if clock-out is after clock-in
    if (clockOutTime <= clockInTime) {
      errors.push({
        field: 'clockOut',
        message: 'Clock out time must be after clock in time'
      });
    }

    // Check minimum work period
    const workPeriodMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
    if (workPeriodMinutes < this.MIN_WORK_PERIOD_MINUTES) {
      errors.push({
        field: 'clockOut',
        message: `Minimum work period of ${this.MIN_WORK_PERIOD_MINUTES} minutes required`
      });
    }

    // Check maximum work period
    const workPeriodHours = workPeriodMinutes / 60;
    if (workPeriodHours > this.MAX_WORK_PERIOD_HOURS) {
      errors.push({
        field: 'clockOut',
        message: `Maximum work period of ${this.MAX_WORK_PERIOD_HOURS} hours exceeded`
      });
    }

    // Check if clock-out is within reasonable bounds
    if (clockOutTime > shiftEndTime) {
      const hoursAfterShift = (clockOutTime.getTime() - shiftEndTime.getTime()) / (1000 * 60 * 60);
      if (hoursAfterShift > 2) { // Allow 2 hours overtime
        errors.push({
          field: 'clockOut',
          message: 'Clock out time is too far beyond shift end time'
        });
      }
    }

    return errors;
  }

  /**
   * Validates total daily hours across all entries
   */
  static validateDailyHours(entries: TimeEntry[]): TimeValidationError[] {
    const errors: TimeValidationError[] = [];

    const totalHours = entries.reduce((total, entry) => {
      if (entry.clockIn && entry.clockOut) {
        const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    if (totalHours > this.MAX_DAILY_HOURS) {
      errors.push({
        field: 'total',
        message: `Total daily hours (${totalHours.toFixed(2)}) exceeds maximum of ${this.MAX_DAILY_HOURS} hours`
      });
    }

    return errors;
  }

  /**
   * Checks for time entry conflicts and overlaps
   */
  static checkForConflicts(
    newEntry: { clockIn: Date; clockOut?: Date },
    existingEntries: TimeEntry[]
  ): TimeValidationError[] {
    const errors: TimeValidationError[] = [];

    for (const existing of existingEntries) {
      if (!existing.clockOut) continue; // Skip incomplete entries

      const existingStart = new Date(existing.clockIn);
      const existingEnd = new Date(existing.clockOut);
      const newStart = newEntry.clockIn;
      const newEnd = newEntry.clockOut;

      // Check for various overlap scenarios
      if (newEnd) {
        // Complete overlap check
        if (
          (newStart >= existingStart && newStart <= existingEnd) ||
          (newEnd >= existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          errors.push({
            field: 'timeEntry',
            message: `Time entry conflicts with existing entry #${existing.entryNumber}`
          });
        }
      } else {
        // Clock-in only check
        if (newStart >= existingStart && newStart <= existingEnd) {
          errors.push({
            field: 'clockIn',
            message: `Clock in time conflicts with existing entry #${existing.entryNumber}`
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validates if a time entry can be manually edited
   */
  static validateManualEdit(
    originalEntry: TimeEntry,
    editedEntry: TimeEntry,
    allEntries: TimeEntry[],
    userRole: string
  ): TimeValidationError[] {
    const errors: TimeValidationError[] = [];

    // Only admins can edit entries older than 24 hours
    if (userRole !== 'Admin') {
      const entryAge = Date.now() - new Date(originalEntry.clockIn).getTime();
      const hoursOld = entryAge / (1000 * 60 * 60);
      
      if (hoursOld > 24) {
        errors.push({
          field: 'edit',
          message: 'Only administrators can edit entries older than 24 hours'
        });
      }
    }

    // Validate the edited entry doesn't conflict with others
    const otherEntries = allEntries.filter(e => e.entryNumber !== editedEntry.entryNumber);
    const conflictErrors = this.checkForConflicts(
      { clockIn: new Date(editedEntry.clockIn), clockOut: editedEntry.clockOut ? new Date(editedEntry.clockOut) : undefined },
      otherEntries
    );

    errors.push(...conflictErrors);

    return errors;
  }
}