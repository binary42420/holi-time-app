// Enhanced type definitions for better type safety

import { z } from 'zod';
import { UserRole, ShiftStatus, JobStatus } from '@prisma/client';

// Runtime type validation schemas
export const UserRoleSchema = z.nativeEnum(UserRole);
export const ShiftStatusSchema = z.nativeEnum(ShiftStatus);
export const JobStatusSchema = z.nativeEnum(JobStatus);

// Enhanced user types with validation
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  role: UserRoleSchema,
  isActive: z.boolean(),
  companyId: z.string().uuid().optional(),
  crew_chief_eligible: z.boolean().optional(),
  fork_operator_eligible: z.boolean().optional(),
  OSHA_10_Certifications: z.boolean().optional(),
  certifications: z.array(z.string()).optional(),
  performance: z.number().min(0).max(5).optional(),
  avatarData: z.string().optional(),
  location: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Enhanced shift types with validation
export const ShiftSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  date: z.date(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  status: ShiftStatusSchema,
  location: z.string().optional(),
  description: z.string().optional(),
  requiredCrewChiefs: z.number().int().min(0).optional(),
  requiredStagehands: z.number().int().min(0).optional(),
  requiredForkOperators: z.number().int().min(0).optional(),
  requiredReachForkOperators: z.number().int().min(0).optional(),
  requiredRiggers: z.number().int().min(0).optional(),
  requiredGeneralLaborers: z.number().int().min(0).optional(),
  requestedWorkers: z.number().int().min(0).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Shift = z.infer<typeof ShiftSchema>;

// Enhanced job types with validation
export const JobSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Job name is required'),
  description: z.string().optional(),
  status: JobStatusSchema,
  startDate: z.date(),
  endDate: z.date(),
  location: z.string().optional(),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Job = z.infer<typeof JobSchema>;

// API request/response types with validation
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }).optional(),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string(),
    version: z.string(),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }).optional(),
  }).optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
};

// Filter schemas for API endpoints
export const ShiftFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  userRole: UserRoleSchema.optional(),
  companyId: z.string().uuid().optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  search: z.string().optional(),
  jobId: z.string().uuid().optional(),
  pagination: PaginationSchema.optional(),
});

export type ShiftFilters = z.infer<typeof ShiftFiltersSchema>;

export const JobFiltersSchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['recentShifts', 'created', 'updated']).default('recentShifts'),
  userId: z.string().uuid().optional(),
  pagination: PaginationSchema.optional(),
});

export type JobFilters = z.infer<typeof JobFiltersSchema>;

export const UserFiltersSchema = z.object({
  role: UserRoleSchema.optional(),
  companyId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  excludeCompanyUsers: z.boolean().default(false),
  search: z.string().optional(),
  pagination: PaginationSchema.optional(),
  fetchAll: z.boolean().default(false),
});

export type UserFilters = z.infer<typeof UserFiltersSchema>;

// Form validation schemas
export const CreateShiftSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  location: z.string().optional(),
  description: z.string().optional(),
  requiredCrewChiefs: z.number().int().min(0).default(0),
  requiredStagehands: z.number().int().min(0).default(0),
  requiredForkOperators: z.number().int().min(0).default(0),
  requiredReachForkOperators: z.number().int().min(0).default(0),
  requiredRiggers: z.number().int().min(0).default(0),
  requiredGeneralLaborers: z.number().int().min(0).default(0),
  requestedWorkers: z.number().int().min(0).optional(),
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.startTime}`);
  const end = new Date(`2000-01-01T${data.endTime}`);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export type CreateShiftData = z.infer<typeof CreateShiftSchema>;

export const UpdateShiftSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid('Invalid job ID').optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  requiredCrewChiefs: z.number().int().min(0).default(0).optional(),
  requiredStagehands: z.number().int().min(0).default(0).optional(),
  requiredForkOperators: z.number().int().min(0).default(0).optional(),
  requiredReachForkOperators: z.number().int().min(0).default(0).optional(),
  requiredRiggers: z.number().int().min(0).default(0).optional(),
  requiredGeneralLaborers: z.number().int().min(0).default(0).optional(),
  requestedWorkers: z.number().int().min(0).optional(),
  status: ShiftStatusSchema.optional(),
});

export type UpdateShiftData = z.infer<typeof UpdateShiftSchema>;

export const CreateJobSchema = z.object({
  name: z.string().min(1, 'Job name is required').max(255, 'Job name too long'),
  description: z.string().optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  location: z.string().optional(),
  companyId: z.string().uuid('Invalid company ID'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

export type CreateJobData = z.infer<typeof CreateJobSchema>;

export const UpdateJobSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Job name is required').max(255, 'Job name too long').optional(),
  description: z.string().optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  location: z.string().optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  status: JobStatusSchema.optional(),
});

export type UpdateJobData = z.infer<typeof UpdateJobSchema>;

// Assignment types
export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  shiftId: z.string().uuid(),
  userId: z.string().uuid(),
  roleCode: z.string(),
  status: z.string(),
  assignedAt: z.date(),
  updatedAt: z.date(),
});

export type Assignment = z.infer<typeof AssignmentSchema>;

export const CreateAssignmentSchema = z.object({
  shiftId: z.string().uuid('Invalid shift ID'),
  userId: z.string().uuid('Invalid user ID'),
  roleCode: z.string().min(1, 'Role code is required'),
});

export type CreateAssignmentData = z.infer<typeof CreateAssignmentSchema>;

// Timesheet types
export const TimesheetSchema = z.object({
  id: z.string().uuid(),
  shiftId: z.string().uuid(),
  userId: z.string().uuid(),
  clockIn: z.date().optional(),
  clockOut: z.date().optional(),
  breakStart: z.date().optional(),
  breakEnd: z.date().optional(),
  totalHours: z.number().min(0).optional(),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected']),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Timesheet = z.infer<typeof TimesheetSchema>;

// Error types
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  statusCode: z.number(),
  details: z.any().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// Utility types for better type safety
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type NonNullable<T> = T extends null | undefined ? never : T;

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Database query result types
export type QueryResult<T> = {
  data: T[];
  total: number;
  pages: number;
  currentPage: number;
  hasNextPage: boolean;
  nextCursor?: string;
};

export type SingleQueryResult<T> = {
  data: T | null;
  found: boolean;
};

// Runtime type guards
export function isUser(obj: any): obj is User {
  return UserSchema.safeParse(obj).success;
}

export function isShift(obj: any): obj is Shift {
  return ShiftSchema.safeParse(obj).success;
}

export function isJob(obj: any): obj is Job {
  return JobSchema.safeParse(obj).success;
}

export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return ApiResponseSchema.safeParse(obj).success;
}

// Validation helpers
export function validateAndParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

// Type-safe environment variable validation
export const EnvSchema = z.object({
  DATABASE_URL: z.string().url('Invalid database URL'),
  NEXTAUTH_SECRET: z.string().min(1, 'NextAuth secret is required'),
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_CONNECTION_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('10'),
  DATABASE_POOL_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('10000'),
  DATABASE_QUERY_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),
});

export type EnvVars = z.infer<typeof EnvSchema>;

// Validate environment variables at startup
export function validateEnv(): EnvVars {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation failed:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}