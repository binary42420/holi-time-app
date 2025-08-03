/** 
 * Time manipulation utilities for the labor staffing application.
 * Handles time formatting, rounding, and calculations for timesheets.
 */
import { format, differenceInMinutes } from 'date-fns';

// Converts 24-hour time string to 12-hour format with AM/PM (simplified format)
export function formatTimeTo12Hour(timeString: string) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;

  // Only show minutes if they're not zero for cleaner display
  if (minute === 0) {
    return `${formattedHour}:00 ${ampm}`;
  }

  const formattedMinute = minute < 10 ? `0${minute}` : minute;
  return `${formattedHour}:${formattedMinute} ${ampm}`;
}

// Formats date string or Date object to M/d/yyyy format (simplified)
export function formatDate(dateString?: string | Date): string {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, 'M/d/yyyy');
    } catch (error) {
        console.error("Invalid date:", dateString);
        return 'Invalid Date';
    }
}

// Formats Date object to simple time format (4:00 PM, 12:45 PM)
export function formatTime(dateString?: string | Date | null): string {
    if (!dateString) return '--:--';
    try {
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();

        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHour = hours % 12 || 12;

        // Only show minutes if they're not zero for cleaner display
        if (minutes === 0) {
            return `${formattedHour}:00 ${ampm}`;
        }

        const formattedMinute = minutes < 10 ? `0${minutes}` : minutes;
        return `${formattedHour}:${formattedMinute} ${ampm}`;
    } catch (error) {
        console.error("Invalid time:", dateString);
        return '--:--';
    }
}

// Formats date and time together (1/12/2025 at 4:00 PM)
export function formatDateTime(dateString?: string | Date | null): string {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return `${formatDate(date)} at ${formatTime(date)}`;
    } catch (error) {
        console.error("Invalid datetime:", dateString);
        return 'Invalid Date';
    }
}

// Formats time range (4:00 PM - 6:30 PM)
export function formatTimeRange(startTime?: string | Date | null, endTime?: string | Date | null): string {
    const start = formatTime(startTime);
    const end = formatTime(endTime);

    if (start === '--:--' && end === '--:--') return '--:-- - --:--';
    if (start === '--:--') return `--:-- - ${end}`;
    if (end === '--:--') return `${start} - --:--`;

    return `${start} - ${end}`;
}

// Rounds time to nearest 15 minute interval (up or down)
export function roundTime(time: Date, direction: 'up' | 'down'): Date {
    const minutes = time.getMinutes();
    const roundedMinutes = direction === 'up'
        ? Math.ceil(minutes / 15) * 15
        : Math.floor(minutes / 15) * 15;

    const newTime = new Date(time);
    newTime.setMinutes(roundedMinutes);
    newTime.setSeconds(0);
    newTime.setMilliseconds(0);

    if (roundedMinutes === 60) {
        newTime.setHours(newTime.getHours() + 1);
        newTime.setMinutes(0);
    }

    return newTime;
}

// Calculates total hours across time entries with 15 minute rounding
export function calculateTotalRoundedHours(timeEntries: { clockIn?: string; clockOut?: string }[]): string {
    if (!timeEntries || timeEntries.length === 0) {
        return '0.00';
    }

    const totalMinutes = timeEntries.reduce((acc, entry) => {
        if (entry.clockIn && entry.clockOut) {
            const clockInTime = new Date(`1970-01-01T${entry.clockIn}`);
            const clockOutTime = new Date(`1970-01-01T${entry.clockOut}`);
            
            if (!isNaN(clockInTime.getTime()) && !isNaN(clockOutTime.getTime())) {
                const roundedClockIn = roundTime(clockInTime, 'down');
                const roundedClockOut = roundTime(clockOutTime, 'up');
                return acc + differenceInMinutes(roundedClockOut, roundedClockIn);
            }
        }
        return acc;
    }, 0);

    const totalHours = totalMinutes / 60;
    return totalHours.toFixed(2);
}

// Formats clock in/out times and calculates duration for display
export function getTimeEntryDisplay(clockIn?: string, clockOut?: string) {
    const displayClockIn = clockIn ? formatTimeTo12Hour(clockIn) : 'Not Clocked In';
    const displayClockOut = clockOut ? formatTimeTo12Hour(clockOut) : 'Not Clocked Out';
    
    let totalHours = 0;
    if (clockIn && clockOut) {
        const clockInTime = new Date(`1970-01-01T${clockIn}`);
        const clockOutTime = new Date(`1970-01-01T${clockOut}`);
        if (!isNaN(clockInTime.getTime()) && !isNaN(clockOutTime.getTime())) {
            totalHours = differenceInMinutes(clockOutTime, clockInTime) / 60;
        }
    }

    return {
        displayClockIn,
        displayClockOut,
        totalHours,
    };
}
