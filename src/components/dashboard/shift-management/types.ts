import { 
  User, 
  Shift, 
  AssignedPersonnel, 
  TimeEntry, 
  Job, 
  Company 
} from '@prisma/client';

export type TimeEntryWithDetails = TimeEntry;

export type AssignedPersonnelWithDetails = AssignedPersonnel & {
  user: User;
  timeEntries: TimeEntryWithDetails[];
  role_code: string;
};

export type ShiftWithDetails = Shift & {
  job: Job & {
    company: Company;
  };
  assignedPersonnel: AssignedPersonnelWithDetails[];
  timesheet: {
    id: string;
    status: string;
  } | null;
};

export type ClockAction = 'clock_in' | 'clock_out';

export type WorkerStatus = 'Assigned' | 'ClockedIn' | 'OnBreak' | 'ClockedOut' | 'ShiftEnded' | 'NoShow' | 'UpForGrabs';

export interface IShiftManagerProps {
  shift: ShiftWithDetails;
  onUpdate: () => void;
  isOnline?: boolean;
}

export interface IWorkerCardProps {
  worker: AssignedPersonnelWithDetails;
  onClockAction: (assignmentId: string, action: ClockAction) => Promise<void>;
  onEndShift: (assignmentId: string) => Promise<void>;
  loading: boolean;
  isOnline: boolean;
}

export interface IShiftActionsProps {
  shift: ShiftWithDetails;
  onEndAllShifts: () => Promise<void>;
  onFinalizeTimesheet: () => Promise<void>;
  loading: boolean;
  isOnline: boolean;
}

export interface IShiftStatsProps {
  assignedPersonnel: AssignedPersonnelWithDetails[];
}
