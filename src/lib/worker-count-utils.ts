/**
 * Utility functions for consistent worker count calculations across the application
 */

export interface WorkerCountData {
  assignedPersonnel?: Array<{
    user?: any;
    userId?: string;
  }>;
  requiredCrewChiefs?: number;
  requiredStagehands?: number;
  requiredForkOperators?: number;
  requiredReachForkOperators?: number;
  requiredRiggers?: number;
  requiredGeneralLaborers?: number;
  requestedWorkers?: number;
  requiredWorkers?: number; // Legacy field used in some places
}

/**
 * Calculate the number of assigned workers (only those with actual users assigned)
 * This matches the logic used in StaffingOverviewCard
 */
export function getAssignedWorkerCount(data: WorkerCountData): number {
  if (!data.assignedPersonnel) return 0;
  return data.assignedPersonnel.filter((p) => p.userId).length;
}

/**
 * Calculate the total required workers from shift requirements
 * This matches the logic used in StaffingOverviewCard
 */
export function getTotalRequiredWorkers(data: WorkerCountData): number {
  const totalRequired = (data.requiredCrewChiefs || 0) + 
                       (data.requiredStagehands || 0) + 
                       (data.requiredForkOperators || 0) + 
                       (data.requiredReachForkOperators || 0) + 
                       (data.requiredRiggers || 0) + 
                       (data.requiredGeneralLaborers || 0);
  
  // Use the sum of specific requirements if available, otherwise fall back to legacy fields
  return totalRequired || data.requestedWorkers || data.requiredWorkers || 0;
}

/**
 * Get a formatted string showing assigned vs total workers
 */
export function getWorkerCountDisplay(data: WorkerCountData): string {
  const assigned = getAssignedWorkerCount(data);
  const total = getTotalRequiredWorkers(data);
  return `${assigned} of ${total} Workers Assigned`;
}

/**
 * Get worker count data for display components
 */
export function getWorkerCountData(data: WorkerCountData) {
  const assigned = getAssignedWorkerCount(data);
  const total = getTotalRequiredWorkers(data);
  const progress = total > 0 ? (assigned / total) * 100 : 0;
  
  return {
    assigned,
    total,
    progress,
    display: `${assigned} of ${total} Workers Assigned`
  };
}