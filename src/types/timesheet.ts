interface Employee {
  id: string
  name: string
  avatar?: string | null
}

interface TimeEntry {
  entryNumber: number
  clockIn: string
  clockOut?: string
}

interface AssignedPersonnel {
  id: string
  employee: Employee
  roleCode: string
  timeEntries: TimeEntry[]
}

export interface Timesheet {
  id: string
  status: 'DRAFT' | 'PENDING_COMPANY_APPROVAL' | 'PENDING_MANAGER_APPROVAL' | 'COMPLETED' | 'REJECTED'
  shiftId: string
  company_signature?: string | null
  company_approved_at?: Date | string | null
  company_notes?: string | null
  manager_signature?: string | null
  manager_approved_at?: Date | string | null
  manager_notes?: string | null
  rejection_reason?: string | null
  pdf_url?: string | null
  shift: {
    id: string
    date: Date | string
    startTime: string
    endTime: string
    location: string
    jobName: string
    companyName: string
    crewChiefName: string
    assignedPersonnel: AssignedPersonnel[]
    job: {
      id: string
      name: string
      company: {
        id: string
        name: string
      }
    }
  }
}
