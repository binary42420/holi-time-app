import {
  UserRole,
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
export type {
  UserRole,
  PrismaCompany,
  PrismaJob,
  PrismaShift,
  PrismaAssignment,
  PrismaTimeEntry,
  PrismaUser,
  PrismaCrewChiefPermission,
  PrismaTimesheet,
  PrismaJobStatus,
  PrismaShiftStatus,
  PrismaNotification,
  PrismaAnnouncement,
  PrismaWorkerStatus
};

// Manually defined enums based on schema strings
// Removed export const ShiftStatus and JobStatus as they are imported from Prisma

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
