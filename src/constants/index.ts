/**
 * Application Constants
 * Centralized constants for the HoliTime application
 */

import { UserRole } from '@prisma/client';

// Application Configuration
export const APP_CONFIG = {
  NAME: 'HoliTime',
  VERSION: '1.0.0',
  DESCRIPTION: 'Workforce Management System',
  SUPPORT_EMAIL: 'support@holitime.com',
  COMPANY: 'HoliTime Inc.',
} as const;

// API Configuration
export const API_CONFIG = {
  BASE_URL: '/api',
  VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const;

// User Roles and Permissions
export const USER_ROLES = {
  ADMIN: 'Admin' as UserRole,
  STAFF: 'Staff' as UserRole,
  CREW_CHIEF: 'CrewChief' as UserRole,
  EMPLOYEE: 'Employee' as UserRole,
  COMPANY_USER: 'CompanyUser' as UserRole,
} as const;

export const ROLE_HIERARCHY = {
  [USER_ROLES.EMPLOYEE]: 1,
  [USER_ROLES.CREW_CHIEF]: 2,
  [USER_ROLES.COMPANY_USER]: 2,
  [USER_ROLES.STAFF]: 3,
  [USER_ROLES.ADMIN]: 4,
} as const;

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.STAFF]: 'Staff Member',
  [USER_ROLES.CREW_CHIEF]: 'Crew Chief',
  [USER_ROLES.EMPLOYEE]: 'Employee',
  [USER_ROLES.COMPANY_USER]: 'Company User',
} as const;

// Job Statuses
export const JOB_STATUS = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  ON_HOLD: 'OnHold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const JOB_STATUS_LABELS = {
  [JOB_STATUS.PENDING]: 'Pending',
  [JOB_STATUS.ACTIVE]: 'Active',
  [JOB_STATUS.ON_HOLD]: 'On Hold',
  [JOB_STATUS.COMPLETED]: 'Completed',
  [JOB_STATUS.CANCELLED]: 'Cancelled',
} as const;

export const JOB_STATUS_COLORS = {
  [JOB_STATUS.PENDING]: 'yellow',
  [JOB_STATUS.ACTIVE]: 'green',
  [JOB_STATUS.ON_HOLD]: 'orange',
  [JOB_STATUS.COMPLETED]: 'blue',
  [JOB_STATUS.CANCELLED]: 'red',
} as const;


// Timesheet Statuses
export const TIMESHEET_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_COMPANY_APPROVAL: 'PENDING_COMPANY_APPROVAL',
  PENDING_MANAGER_APPROVAL: 'PENDING_MANAGER_APPROVAL',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
} as const

export type TimesheetStatus = typeof TIMESHEET_STATUS[keyof typeof TIMESHEET_STATUS]

// Shift statuses
export const SHIFT_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const

export const SHIFT_STATUS_COLORS = {
  [SHIFT_STATUS.PENDING]: 'yellow',
  [SHIFT_STATUS.CONFIRMED]: 'blue',
  [SHIFT_STATUS.ACTIVE]: 'green',
  [SHIFT_STATUS.IN_PROGRESS]: 'green',
  [SHIFT_STATUS.COMPLETED]: 'gray',
  [SHIFT_STATUS.CANCELLED]: 'red',
} as const;

export const SHIFT_STATUS_LABELS = {
  [SHIFT_STATUS.PENDING]: 'Pending',
  [SHIFT_STATUS.CONFIRMED]: 'Confirmed',
  [SHIFT_STATUS.ACTIVE]: 'Active',
  [SHIFT_STATUS.IN_PROGRESS]: 'In Progress',
  [SHIFT_STATUS.COMPLETED]: 'Completed',
  [SHIFT_STATUS.CANCELLED]: 'Cancelled',
} as const;
export type ShiftStatus = typeof SHIFT_STATUS[keyof typeof SHIFT_STATUS]

// Timesheet status labels
export const TIMESHEET_STATUS_LABELS = {
  [TIMESHEET_STATUS.DRAFT]: 'Draft',
  [TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL]: 'Awaiting Client Signature',
  [TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL]: 'Pending Final Approval',
  [TIMESHEET_STATUS.COMPLETED]: 'Finalized',
  [TIMESHEET_STATUS.REJECTED]: 'Rejected',
} as const;

// Timesheet status colors (single definition)
export const TIMESHEET_STATUS_COLORS = {
  [TIMESHEET_STATUS.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-200',
  [TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL]: 'bg-orange-100 text-orange-800 border-orange-200',
  [TIMESHEET_STATUS.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
  [TIMESHEET_STATUS.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
} as const;

// Role Codes for Personnel
export const ROLE_CODES = {
  CC: 'CC', // Crew Chief
  FO: 'FO', // Fork Operator
  GW: 'GW', // General Worker
  SP: 'SP', // Specialist
  SV: 'SV', // Supervisor
} as const;

export const ROLE_CODE_LABELS = {
  [ROLE_CODES.CC]: 'Crew Chief',
  [ROLE_CODES.FO]: 'Fork Operator',
  [ROLE_CODES.GW]: 'General Worker',
  [ROLE_CODES.SP]: 'Specialist',
  [ROLE_CODES.SV]: 'Supervisor',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  SHIFT_ASSIGNED: 'shift_assigned',
  SHIFT_UPDATED: 'shift_updated',
  SHIFT_CANCELLED: 'shift_cancelled',
  TIMESHEET_SUBMITTED: 'timesheet_submitted',
  TIMESHEET_APPROVED: 'timesheet_approved',
  TIMESHEET_REJECTED: 'timesheet_rejected',
  ANNOUNCEMENT: 'announcement',
  SYSTEM: 'system',
} as const;

export const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.SHIFT_ASSIGNED]: 'Shift Assigned',
  [NOTIFICATION_TYPES.SHIFT_UPDATED]: 'Shift Updated',
  [NOTIFICATION_TYPES.SHIFT_CANCELLED]: 'Shift Cancelled',
  [NOTIFICATION_TYPES.TIMESHEET_SUBMITTED]: 'Timesheet Submitted',
  [NOTIFICATION_TYPES.TIMESHEET_APPROVED]: 'Timesheet Approved',
  [NOTIFICATION_TYPES.TIMESHEET_REJECTED]: 'Timesheet Rejected',
  [NOTIFICATION_TYPES.ANNOUNCEMENT]: 'Announcement',
  [NOTIFICATION_TYPES.SYSTEM]: 'System',
} as const;

// Date and Time Formats (simplified)
export const DATE_FORMATS = {
  DISPLAY: 'M/d/yyyy',        // 1/12/2025, 12/18/2024
  INPUT: 'yyyy-MM-dd',        // For HTML inputs
  FULL: 'EEEE, MMMM dd, yyyy', // Full format when needed
  SHORT: 'M/d/yyyy',          // Same as display
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

export const TIME_FORMATS = {
  DISPLAY: 'h:mm a',          // 4:00 PM, 12:45 PM
  SIMPLE: 'h a',              // 4 PM (for exact hours)
  INPUT: 'HH:mm',             // For HTML inputs
  FULL: 'h:mm:ss a',
  ISO: 'HH:mm:ss',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PHONE_PATTERN: /^\+?[\d\s-()]+$/,
  URL_PATTERN: /^https?:\/\/.+/,
} as const;

// File Upload Limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.csv'],
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  LONG_TTL: 60 * 60 * 1000, // 1 hour
  SHORT_TTL: 30 * 1000, // 30 seconds
  MAX_SIZE: 100, // Maximum number of cached items
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Successfully created.',
  UPDATED: 'Successfully updated.',
  DELETED: 'Successfully deleted.',
  SAVED: 'Successfully saved.',
  SENT: 'Successfully sent.',
  APPROVED: 'Successfully approved.',
  REJECTED: 'Successfully rejected.',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
} as const;

// Theme Configuration
export const THEME = {
  COLORS: {
    PRIMARY: '#3b82f6',
    SECONDARY: '#64748b',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#06b6d4',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
} as const;

// Feature Flags
export const FEATURES = {
  REAL_TIME_UPDATES: true,
  EMAIL_NOTIFICATIONS: true,
  GOOGLE_INTEGRATION: true,
  FILE_UPLOADS: true,
  ADVANCED_REPORTING: true,
  MOBILE_APP: false,
} as const;

// External Service URLs
export const EXTERNAL_URLS = {
  GOOGLE_OAUTH: 'https://accounts.google.com/oauth/authorize',
  GOOGLE_SHEETS_API: 'https://sheets.googleapis.com/v4',
  GOOGLE_DRIVE_API: 'https://www.googleapis.com/drive/v3',
  DOCUMENTATION: 'https://docs.holitime.com',
  SUPPORT: 'https://support.holitime.com',
} as const;

// Regular Expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/.+/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  TIME_24H: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
} as const;
