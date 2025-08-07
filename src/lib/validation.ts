import { z } from 'zod';
import { UserRole } from '@/lib/types';

// Common validation patterns
export const commonValidation = {
  id: z.string().cuid('Invalid ID format'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  phone: z.string().regex(/^[+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional(),
  url: z.string().url('Invalid URL format').optional(),
  avatarUrl: z.union([
    z.string().url('Invalid URL format'),
    z.literal(''),
    z.null()
  ]).optional(),
  date: z.string().datetime('Invalid date format').or(z.date()),
  positiveInt: z.number().int().min(0, 'Must be a non-negative integer'),
  requiredString: z.string().min(1, 'This field is required'),
  optionalString: z.string().optional(),
  boolean: z.boolean(),
};

// User-related schemas
export const userValidation = {
  create: z.object({
    name: commonValidation.name,
    email: commonValidation.email,
    password: commonValidation.password,
    role: z.nativeEnum(UserRole),
    companyId: commonValidation.id.optional(),
    avatarUrl: commonValidation.avatarUrl,
    location: commonValidation.optionalString,
    certifications: z.array(z.string()).default([]),
    performance: z.number().min(0).max(100).optional(),
    crewChiefEligible: commonValidation.boolean.default(false),
    forkOperatorEligible: commonValidation.boolean.default(false),
  }),
  
  update: z.object({
    name: commonValidation.name.optional(),
    email: commonValidation.email.optional(),
    role: z.nativeEnum(UserRole).optional(),
    companyId: commonValidation.id.optional().nullable(),
    avatarUrl: commonValidation.avatarUrl,
    location: commonValidation.optionalString,
    certifications: z.array(z.string()).optional(),
    performance: z.number().min(0).max(100).optional(),
    crew_chief_eligible: commonValidation.boolean.optional(),
    fork_operator_eligible: commonValidation.boolean.optional(),
    OSHA_10_Certifications: commonValidation.boolean.optional(),
    isActive: commonValidation.boolean.optional(),
  }),
};

// Company-related schemas
export const companyValidation = {
  create: z.object({
    name: commonValidation.name,
    address: commonValidation.optionalString,
    phone: commonValidation.phone,
    email: commonValidation.email.optional(),
  }),
  
  update: z.object({
    name: commonValidation.name.optional(),
    address: commonValidation.optionalString,
    phone: commonValidation.phone,
    email: commonValidation.email.optional(),
  }),
};

// Job-related schemas
export const jobValidation = {
  create: z.object({
    name: commonValidation.name,
    description: commonValidation.optionalString,
    companyId: commonValidation.id,
    status: z.enum(['Pending', 'Active', 'OnHold', 'Completed', 'Cancelled']).default('Pending'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    location: commonValidation.optionalString,
    budget: commonValidation.optionalString,
    notes: commonValidation.optionalString,
  }),
  
  update: z.object({
    name: commonValidation.name.optional(),
    description: commonValidation.optionalString,
    companyId: commonValidation.id.optional(),
    status: z.enum(['Pending', 'Active', 'OnHold', 'Completed', 'Cancelled']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    location: commonValidation.optionalString,
    budget: commonValidation.optionalString,
    notes: commonValidation.optionalString,
    isCompleted: commonValidation.boolean.optional(),
  }),
};

// Shift-related schemas
export const shiftValidation = {
  create: z.object({
    jobId: commonValidation.id,
    date: z.string().datetime(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    requestedWorkers: commonValidation.positiveInt.optional(),
    status: z.enum(['Pending', 'Active', 'InProgress', 'Completed', 'Cancelled']).default('Pending'),
    location: commonValidation.optionalString,
    description: commonValidation.optionalString,
    requirements: commonValidation.optionalString,
    notes: commonValidation.optionalString,
  }),
  
  update: z.object({
    jobId: commonValidation.id.optional(),
    date: z.string().datetime().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    requestedWorkers: commonValidation.positiveInt.optional(),
    status: z.enum(['Pending', 'Active', 'InProgress', 'Completed', 'Cancelled']).optional(),
    location: commonValidation.optionalString,
    description: commonValidation.optionalString,
    requirements: commonValidation.optionalString,
    notes: commonValidation.optionalString,
  }),
};

// Timesheet-related schemas
export const timesheetValidation = {
  create: z.object({
    shiftId: commonValidation.id,
  }),
  
  approve: z.object({
    signature: commonValidation.optionalString,
    notes: commonValidation.optionalString,
    approvalType: z.enum(['client', 'manager']).default('manager'),
  }),
  
  reject: z.object({
    reason: commonValidation.requiredString,
    notes: commonValidation.optionalString,
  }),
};

// Notification-related schemas
export const notificationValidation = {
  create: z.object({
    userId: commonValidation.id,
    type: z.string().min(1, 'Type is required'),
    title: commonValidation.name,
    message: commonValidation.requiredString,
    relatedTimesheetId: commonValidation.id.optional(),
    relatedShiftId: commonValidation.id.optional(),
  }),
  
  bulk: z.object({
    action: z.enum(['delete', 'mark_read', 'mark_unread']),
    notificationIds: z.array(commonValidation.id).min(1, 'At least one notification ID is required'),
  }),
};

// Announcement-related schemas
export const announcementValidation = {
  create: z.object({
    title: commonValidation.name,
    content: commonValidation.requiredString,
    date: z.string().datetime().optional(),
  }),
  
  update: z.object({
    title: commonValidation.name.optional(),
    content: commonValidation.requiredString.optional(),
    date: z.string().datetime().optional(),
  }),
};

// Worker requirement schemas
export const workerRequirementValidation = {
  create: z.object({
    shiftId: commonValidation.id,
    roleCode: z.enum(['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']),
    roleName: commonValidation.name,
    requiredCount: commonValidation.positiveInt,
    color: commonValidation.optionalString,
  }),
  
  update: z.object({
    roleCode: z.enum(['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']).optional(),
    roleName: commonValidation.name.optional(),
    requiredCount: commonValidation.positiveInt.optional(),
    color: commonValidation.optionalString,
  }),
};

// Time entry schemas
export const timeEntryValidation = {
  clockIn: z.object({
    userId: commonValidation.id.optional(),
    notes: commonValidation.optionalString,
  }),
  
  clockOut: z.object({
    userId: commonValidation.id.optional(),
    notes: commonValidation.optionalString,
  }),
};

// Query parameter validation
export const queryValidation = {
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),
  
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  
  search: z.object({
    q: z.string().min(1).optional(),
  }),
};

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: any } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { 
    success: false, 
    error: {
      message: 'Invalid request data',
      issues: result.error.flatten().fieldErrors,
    }
  };
}
