/**
 * API Response Types
 * Standardized response types for all API endpoints
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
  status?: number;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    page?: number;
    totalPages?: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationErrorResponse extends ApiError {
  validationErrors: ValidationError[];
}

/**
 * Request Types
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ListRequestParams extends PaginationParams, SortParams, FilterParams {}

/**
 * User Types
 */
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string;
  crewChiefEligible?: boolean;
  forkOperatorEligible?: boolean;
  certifications?: string[];
  location?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  companyId?: string;
  crewChiefEligible?: boolean;
  forkOperatorEligible?: boolean;
  certifications?: string[];
  location?: string;
  performance?: number;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  company?: CompanyResponse;
  crewChiefEligible: boolean;
  forkOperatorEligible: boolean;
  certifications: string[];
  location?: string;
  performance?: number;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Company Types
 */
export interface CreateCompanyRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  company_logo_url?: string;
  isActive?: boolean;
}

export interface UpdateCompanyRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  company_logo_url?: string;
  isActive?: boolean;
}

export interface CompanyResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  company_logo_url?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    jobs: number;
    users: number;
  };
}

/**
 * Job Types
 */
export interface CreateJobRequest {
  name: string;
  description?: string;
  companyId: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  budget?: string;
  notes?: string;
}

export interface UpdateJobRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  budget?: string;
  notes?: string;
  status?: string;
  isCompleted?: boolean;
}

export interface JobResponse {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  budget?: string;
  notes?: string;
  isCompleted: boolean;
  companyId: string;
  company: CompanyResponse;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shift Types
 */
export interface CreateShiftRequest {
  jobId: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  requestedWorkers?: number;
  workerRequirements?: WorkerRequirementRequest[];
}

export interface UpdateShiftRequest {
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  requestedWorkers?: number;
  status?: string;
}

export interface WorkerRequirementRequest {
  roleCode: string;
  requiredCount: number;
}

export interface ShiftResponse {
  id: string;
  jobId: string;
  job: JobResponse;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  requestedWorkers?: number;
  status: string;
  assignedPersonnel: AssignedPersonnelResponse[];
  workerRequirements: WorkerRequirementResponse[];
  timesheet?: TimesheetResponse;
  createdAt: string;
  updatedAt: string;
}

/**
 * Assigned Personnel Types
 */
export interface AssignPersonnelRequest {
  userId: string;
  roleCode: string;
}

export interface AssignedPersonnelResponse {
  id: string;
  shiftId: string;
  userId: string;
  user: UserResponse;
  roleCode: string;
  timeEntries: TimeEntryResponse[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Time Entry Types
 */
export interface ClockInRequest {
  location?: string;
  notes?: string;
}

export interface ClockOutRequest {
  location?: string;
  notes?: string;
}

export interface TimeEntryResponse {
  id: string;
  assignedPersonnelId: string;
  clockIn: string;
  clockOut?: string;
  location?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Timesheet Types
 */
export interface TimesheetResponse {
  id: string;
  shiftId: string;
  shift: ShiftResponse;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
  clientApprovedAt?: string;
  clientApprovedBy?: string;
  clientSignature?: string;
  managerApprovedAt?: string;
  managerApprovedBy?: string;
  managerSignature?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveTimesheetRequest {
  signature?: string;
  notes?: string;
}

export interface RejectTimesheetRequest {
  reason: string;
  notes?: string;
}

/**
 * Notification Types
 */
export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedShiftId?: string;
  relatedTimesheetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedShiftId?: string;
  relatedTimesheetId?: string;
}

export interface BulkNotificationActionRequest {
  action: 'mark_read' | 'mark_unread' | 'delete';
  notificationIds: string[];
}

/**
 * Announcement Types
 */
export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  date?: string;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  date?: string;
}

export interface AnnouncementResponse {
  id: string;
  title: string;
  content: string;
  date: string;
  createdById: string;
  createdBy: UserResponse;
  createdAt: string;
  updatedAt: string;
}

/**
 * Worker Requirement Types
 */
export interface WorkerRequirementResponse {
  id: string;
  shiftId: string;
  roleCode: string;
  requiredCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard Types
 */
export interface DashboardStats {
  totalUsers: number;
  totalJobs: number;
  totalShifts: number;
  activeShifts: number;
  pendingTimesheets: number;
}

export interface ClientDashboardData {
  activeJobsCount: number;
  upcomingShiftsCount: number;
  completedShiftsCount: number;
  recentJobs: JobResponse[];
  upcomingShifts: ShiftResponse[];
}

export interface CrewChiefDashboardData {
  activeShifts: ShiftResponse[];
  pendingTimesheets: TimesheetResponse[];
  teamMembers: UserResponse[];
}

/**
 * Import/Export Types
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'json';
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, any>;
}

/**
 * Utility Types
 */
export type UserRole = 'Admin' | 'Staff' | 'CrewChief' | 'Employee' | 'CompanyUser';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiEndpoint {
  method: ApiMethod;
  path: string;
  description: string;
  requestType?: string;
  responseType: string;
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
}

/**
 * Database Model Types (from Prisma)
 */
export interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  crewChiefEligible: boolean;
  forkOperatorEligible: boolean;
  certifications: string[];
  performance?: number;
  location?: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseCompany {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  company_logo_url?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    jobs: number;
    users: number;
  };
}

export interface DatabaseJob {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  budget?: string;
  notes?: string;
  isCompleted: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseShift {
  id: string;
  jobId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location?: string;
  notes?: string;
  requestedWorkers?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
