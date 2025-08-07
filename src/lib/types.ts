import {
  Company as PrismaCompany,
  Job as PrismaJob,
  Shift as PrismaShift,
  AssignedPersonnel as PrismaAssignment,
  TimeEntry as PrismaTimeEntry,
  User as PrismaUser,
  CrewChiefPermission as PrismaCrewChiefPermission,
  Timesheet as PrismaTimesheet,
  JobStatus as PrismaJobStatus,
  ShiftStatus as PrismaShiftStatus,
  Notification as PrismaNotification,
  Announcement as PrismaAnnouncement,
  WorkerStatus as PrismaWorkerStatus
} from "@prisma/client";

// Manual UserRole enum definition (temporary fix for Prisma client issue)
export enum UserRole {
  Staff = 'Staff',
  Admin = 'Admin',
  CompanyUser = 'CompanyUser',
  CrewChief = 'CrewChief',
  Employee = 'Employee'
}

// Basic type definitions (client-safe)
export interface Company {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  location: string;
  companyId: string;
  status: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  jobId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  maxCapacity: number;
  currentCount: number;
  hourlyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

// Additional interfaces for client-side use
export interface Assignment {
  id: string;
  shiftId: string;
  userId: string;
  status: string;
  assignedAt: Date;
}

export interface TimeEntry {
  id: string;
  userId: string;
  shiftId: string;
  clockInTime: Date;
  clockOutTime?: Date;
  breakStartTime?: Date;
  breakEndTime?: Date;
  totalHours?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrewChiefPermission {
  id: string;
  userId: string;
  companyId: string;
  grantedBy: string;
  grantedAt: Date;
}

export interface Timesheet {
  id: string;
  userId: string;
  weekStarting: Date;
  weekEnding: Date;
  totalHours: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended interfaces with relations (client-safe)
export interface UserWithAssignments extends User {
  assignments?: Assignment[];
}

export interface ShiftWithDetails extends Shift {
  job?: Job;
  assignments?: Assignment[];
}

export interface TimesheetDetails extends Timesheet {
  user?: User;
  timeEntries?: TimeEntry[];
}

// Manually defined enums and constants
export const WorkerRoles = {
  CrewChief: 'CC',
  StageHand: 'SH',
  ForkliftOperator: 'FO',
  ReachForkOperator: 'RFO',
  Rigger: 'RG',
  GeneralLabor: 'GL',
} as const;

export type WorkerRole = typeof WorkerRoles[keyof typeof WorkerRoles];

export type RoleCode = WorkerRole;


// Models
export interface User extends PrismaUser {
  avatarUrl?: string; // Added by API transformation from avatarData
  OSHA_10_Certifications: boolean; // Explicitly include this property for type safety
}

export interface UserWithAssignments extends User {
  assignments: (PrismaAssignment & {
    shift: PrismaShift & {
      job: PrismaJob;
      timesheets: PrismaTimesheet[];
    };
    timeEntries: PrismaTimeEntry[];
  })[];
}

export interface UserAuth {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  avatarUrl?: string;
}

export interface TimeEntry extends PrismaTimeEntry {
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  endTime?: Date | null;
}

export interface Assignment extends PrismaAssignment {
  timeEntries: TimeEntry[];
  user?: User;
  status: PrismaWorkerStatus;
}

// Export AssignedPersonnel for compatibility
export interface AssignedPersonnel extends PrismaAssignment {
  user: User;
  time_entries: TimeEntry[];
}

export interface Shift extends Omit<PrismaShift, 'status'> {
  status: PrismaShiftStatus; // Use Prisma's ShiftStatus
  assignedPersonnel: Assignment[];
  job: Job;
  fulfillment?: string;
  requiredCrewChiefs: number;
  timesheets?: {
    id: string;
    status: string;
  }[];
}

export interface Job extends Omit<PrismaJob, 'status'> {
  status: PrismaJobStatus; // Use Prisma's JobStatus
  company: Company;
  shifts: Shift[];
  recentShifts?: Shift[];
  requestedWorkers: number;
}

export interface Company extends PrismaCompany {
  _count?: {
    users: number;
    jobs: number;
  };
}

export interface CompanyWithJobs extends Company {
  jobs: Job[];
}

export interface ShiftWithDetails extends Shift {
  job: Job & {
    company: Company;
  };
  assignedPersonnel: Assignment[];
  timesheets: {
    id: string;
    status: string;
  }[];
}

export type CrewChiefPermissionType = 'client' | 'job' | 'shift'; // Keep one definition

export interface CrewChiefPermission extends PrismaCrewChiefPermission {}

export interface CrewChiefPermissionCheck {
  hasPermission: boolean;
  isDesignatedCrewChief?: boolean;
  hasClientPermission?: boolean;
  hasJobPermission?: boolean;
  hasShiftPermission?: boolean;
}


export interface Timesheet extends PrismaTimesheet {}
export interface Notification extends PrismaNotification {}
export interface Announcement extends PrismaAnnouncement {}

export type TimesheetDetails = PrismaTimesheet & {
  shift: PrismaShift & {
    job: PrismaJob & {
      company: PrismaCompany;
    };
    assignedPersonnel: (PrismaAssignment & {
      user: PrismaUser;
      timeEntries: PrismaTimeEntry[];
    })[];
  };
};

export type ShiftStatus = PrismaShiftStatus;

export type JobStatus = PrismaJobStatus;

export type NotificationType = 'timesheet_rejected' | 'timesheet_approved' | 'timesheet_ready_for_approval';
