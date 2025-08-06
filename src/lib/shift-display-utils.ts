/**
 * Utility functions for displaying shift information
 */

/**
 * Get the display name for a shift, prioritizing description over job name
 * @param shift - The shift object
 * @param fallbackJobName - Optional fallback job name if shift.job is not available
 * @returns The display name for the shift
 */
export const getShiftDisplayName = (shift: any, fallbackJobName?: string): string => {
  // Prioritize shift description if it exists and is not empty
  if (shift.description && shift.description.trim()) {
    return shift.description.trim()
  }
  
  // Fallback to job name
  return shift.job?.name || fallbackJobName || 'Unnamed Shift'
}

/**
 * Get a short display name for a shift (truncated if too long)
 * @param shift - The shift object
 * @param maxLength - Maximum length before truncation (default: 50)
 * @param fallbackJobName - Optional fallback job name
 * @returns The truncated display name
 */
export const getShiftDisplayNameShort = (
  shift: any, 
  maxLength: number = 50, 
  fallbackJobName?: string
): string => {
  const fullName = getShiftDisplayName(shift, fallbackJobName)
  
  if (fullName.length <= maxLength) {
    return fullName
  }
  
  return fullName.substring(0, maxLength - 3) + '...'
}