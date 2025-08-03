import { RoleCode } from "./types";

// Timesheet Status Constants
export const TIMESHEET_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_COMPANY_APPROVAL: 'PENDING_COMPANY_APPROVAL',
  PENDING_MANAGER_APPROVAL: 'PENDING_MANAGER_APPROVAL',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
} as const;

export type TimesheetStatus = typeof TIMESHEET_STATUS[keyof typeof TIMESHEET_STATUS];

// Timesheet Status Display Configuration
export const TIMESHEET_STATUS_CONFIG = {
  [TIMESHEET_STATUS.DRAFT]: {
    label: 'Draft',
    description: 'Timesheet is being prepared',
    color: 'gray',
    badgeVariant: 'secondary' as const,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: '📝'
  },
  [TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL]: {
    label: 'Pending Client Approval',
    description: 'Waiting for client signature and approval',
    color: 'blue',
    badgeVariant: 'default' as const,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: '✍️'
  },
  [TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL]: {
    label: 'Pending Manager Approval',
    description: 'Client approved, waiting for manager review',
    color: 'orange',
    badgeVariant: 'secondary' as const,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: '👔'
  },
  [TIMESHEET_STATUS.COMPLETED]: {
    label: 'Completed',
    description: 'Fully approved and finalized',
    color: 'green',
    badgeVariant: 'default' as const,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: '✅'
  },
  [TIMESHEET_STATUS.REJECTED]: {
    label: 'Rejected',
    description: 'Timesheet was rejected and needs revision',
    color: 'red',
    badgeVariant: 'destructive' as const,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: '❌'
  }
} as const;

// User Role Constants
export const USER_ROLES = {
  STAFF: 'Staff',
  ADMIN: 'Admin',
  COMPANY_USER: 'CompanyUser',
  CREW_CHIEF: 'CrewChief',
  EMPLOYEE: 'Employee'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Shift Status Constants
export const SHIFT_STATUS = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
} as const;

export type ShiftStatus = typeof SHIFT_STATUS[keyof typeof SHIFT_STATUS];

// Worker Status Constants
export const WORKER_STATUS = {
  ASSIGNED: 'Assigned',
  CLOCKED_IN: 'ClockedIn',
  ON_BREAK: 'OnBreak',
  CLOCKED_OUT: 'ClockedOut',
  SHIFT_ENDED: 'ShiftEnded',
  NO_SHOW: 'NoShow'
} as const;

export type WorkerStatus = typeof WORKER_STATUS[keyof typeof WORKER_STATUS];

export const ROLE_DEFINITIONS: Record<RoleCode, { name: string; roleColor: "purple" | "blue" | "green" | "yellow" | "red" | "gray"; cardBgColor: string; textColor: string; borderColor: string; badgeClasses: string; }> = {
  'CC': { name: 'Crew Chief', roleColor: 'purple', cardBgColor: 'bg-purple-50 dark:bg-purple-900/30', textColor: 'text-purple-900 dark:text-purple-100', borderColor: 'border-purple-200 dark:border-purple-700', badgeClasses: 'bg-purple-500 text-white shadow-md' },
  'RG': { name: 'Rigger', roleColor: 'red', cardBgColor: 'bg-red-50 dark:bg-red-900/30', textColor: 'text-red-900 dark:text-red-100', borderColor: 'border-red-200 dark:border-red-700', badgeClasses: 'bg-red-500 text-white shadow-md' },
  'RFO': { name: 'Reach Fork Operator', roleColor: 'yellow', cardBgColor: 'bg-yellow-50 dark:bg-yellow-900/30', textColor: 'text-yellow-900 dark:text-yellow-100', borderColor: 'border-yellow-200 dark:border-yellow-700', badgeClasses: 'bg-yellow-500 text-black shadow-md' },
  'FO': { name: 'Fork Operator', roleColor: 'green', cardBgColor: 'bg-green-50 dark:bg-green-900/30', textColor: 'text-green-900 dark:text-green-100', borderColor: 'border-green-200 dark:border-green-700', badgeClasses: 'bg-green-500 text-white shadow-md' },
  'SH': { name: 'Stage Hand', roleColor: 'blue', cardBgColor: 'bg-blue-50 dark:bg-blue-900/30', textColor: 'text-blue-900 dark:text-blue-100', borderColor: 'border-blue-200 dark:border-blue-700', badgeClasses: 'bg-blue-500 text-white shadow-md' },
  'GL': { name: 'General Labor', roleColor: 'gray', cardBgColor: 'bg-gray-100 dark:bg-gray-800/30', textColor: 'text-gray-900 dark:text-gray-100', borderColor: 'border-gray-200 dark:border-gray-700', badgeClasses: 'bg-gray-500 text-white shadow-md' },
} as const;

// Role order for consistent sorting across the application
export const ROLE_ORDER: RoleCode[] = ['CC', 'RG', 'RFO', 'FO', 'SH', 'GL'];

// Utility function to get roles in the correct order
export function getRolesInOrder(): [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][] {
  return ROLE_ORDER.map(roleCode => [roleCode, ROLE_DEFINITIONS[roleCode]]);
}

// Utility function to sort assignments by role
export function sortAssignmentsByRole<T extends { roleCode: string }>(assignments: T[]): T[] {
  return assignments.sort((a, b) => {
    const aIndex = ROLE_ORDER.indexOf(a.roleCode as RoleCode);
    const bIndex = ROLE_ORDER.indexOf(b.roleCode as RoleCode);
    return aIndex - bIndex;
  });
}