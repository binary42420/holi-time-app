/**
 * Utility functions for consistent worker count calculations across the application
 */

export interface WorkerCountData {
  assignedPersonnel?: Array<{
    user?: any;
    userId?: string;
    roleCode?: string;
    status?: string;
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

export interface WorkerNeeded {
  roleCode: string;
  roleName: string;
  needed: number;
  required: number;
  assigned: number;
}

/**
 * Calculate the total number of assigned personnel
 * This is the numerator in "X/Y workers" display
 * Only counts actual assignments (not placeholders) and excludes no-shows
 */
export function getAssignedWorkerCount(data: WorkerCountData): number {
  if (!data.assignedPersonnel) return 0;
  return data.assignedPersonnel.filter(p => 
    p.userId && // Only count actual assignments, not placeholders
    p.status !== 'NoShow' // Exclude no-shows
  ).length;
}

/**
 * Calculate the total required worker slots (sum of all specific role requirements)
 * This is the denominator in "X/Y workers" display
 * 
 * Example: 2 Crew Chiefs + 3 Stagehands + 1 Fork Operator = 6 total required slots
 */
export function getTotalRequiredWorkers(data: WorkerCountData): number {
  // Sum all specific role requirements
  const totalRequiredSlots = (data.requiredCrewChiefs || 0) + 
                            (data.requiredStagehands || 0) + 
                            (data.requiredForkOperators || 0) + 
                            (data.requiredReachForkOperators || 0) + 
                            (data.requiredRiggers || 0) + 
                            (data.requiredGeneralLaborers || 0);
  
  // Always prioritize the sum of specific role requirements if any are set
  if (totalRequiredSlots > 0) {
    return totalRequiredSlots;
  }
  
  // Fall back to requestedWorkers or legacy requiredWorkers only if no specific requirements are set
  return data.requestedWorkers || data.requiredWorkers || 0;
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

/**
 * Calculate additional workers needed by role
 * Returns only roles that need additional workers
 */
export function getWorkersNeeded(data: WorkerCountData): WorkerNeeded[] {
  const roleDefinitions = [
    { code: 'CC', name: 'Crew Chief', requiredKey: 'requiredCrewChiefs' },
    { code: 'SH', name: 'Stagehand', requiredKey: 'requiredStagehands' },
    { code: 'FO', name: 'Fork Operator', requiredKey: 'requiredForkOperators' },
    { code: 'RFO', name: 'Reach Fork Operator', requiredKey: 'requiredReachForkOperators' },
    { code: 'RG', name: 'Rigger', requiredKey: 'requiredRiggers' },
    { code: 'GL', name: 'General Labor', requiredKey: 'requiredGeneralLaborers' }
  ];

  const workersNeeded: WorkerNeeded[] = [];

  roleDefinitions.forEach(role => {
    const required = (data as any)[role.requiredKey] || 0;
    if (required === 0) return; // Skip roles not required for this shift

    // Count assigned workers for this role (excluding NoShow status)
    const assigned = data.assignedPersonnel?.filter(p => 
      p.roleCode === role.code && 
      p.userId && // Only count actual assignments, not placeholders
      p.status !== 'NoShow' // Exclude no-shows
    ).length || 0;

    const needed = Math.max(0, required - assigned);
    
    if (needed > 0) {
      workersNeeded.push({
        roleCode: role.code,
        roleName: role.name,
        needed,
        required,
        assigned
      });
    }
  });

  return workersNeeded;
}

/**
 * Get a summary of workers needed for display
 */
export function getWorkersNeededSummary(data: WorkerCountData): {
  totalNeeded: number;
  rolesSummary: string[];
  hasOpenings: boolean;
} {
  const workersNeeded = getWorkersNeeded(data);
  const totalNeeded = workersNeeded.reduce((sum, role) => sum + role.needed, 0);
  const rolesSummary = workersNeeded.map(role => `${role.needed} ${role.roleName}${role.needed > 1 ? 's' : ''}`);
  
  return {
    totalNeeded,
    rolesSummary,
    hasOpenings: totalNeeded > 0
  };
}

/**
 * Calculate total required workers for a shift
 * Standardized function used by both job cards and shift cards
 */
export function calculateShiftRequirements(shift: any): number {
  return (shift.requiredCrewChiefs || 0) + 
         (shift.requiredStagehands || 0) + 
         (shift.requiredForkOperators || 0) + 
         (shift.requiredReachForkOperators || 0) + 
         (shift.requiredRiggers || 0) + 
         (shift.requiredGeneralLaborers || 0);
}

/**
 * Calculate assigned workers for a shift
 * Standardized function used by both job cards and shift cards
 * Only counts actual assignments (not placeholders) and excludes no-shows
 */
export function calculateAssignedWorkers(shift: any): number {
  if (!shift.assignedPersonnel) return 0;
  
  return shift.assignedPersonnel.filter((p: any) => {
    return p && p.userId && p.status !== 'NoShow';
  }).length;
}