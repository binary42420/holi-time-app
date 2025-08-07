// Server-side types - ONLY for server components and API routes
// Safe to import @prisma/client here since it won't be bundled for the client

export {
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
  WorkerStatus as PrismaWorkerStatus,
  UserRole as PrismaUserRole
} from "@prisma/client";