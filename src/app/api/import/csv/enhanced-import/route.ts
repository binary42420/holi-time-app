import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { 
  ImportType,
  TimesheetCSVRow,
  TimesheetTemplateCSVRow,
  EmployeeCSVRow,
  CompanyCSVRow,
  JobCSVRow,
  ShiftCSVRow,
  AssignmentCSVRow,
  ComprehensiveCSVRow
} from '@/lib/types/csv-enhanced'
import { UserRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface ImportSummary {
  [key: string]: { created: number; updated: number }
  errors: Array<{ rowNumber: number; error: string }>
}

// Helper function to parse time strings (supports both 24-hour and AM/PM formats)
function parseTime(timeStr: string, baseDate: Date): Date | null {
  if (!timeStr) return null
  
  const trimmed = timeStr.trim()
  
  // Handle AM/PM format
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1])
    const minutes = parseInt(ampmMatch[2])
    const period = ampmMatch[3].toUpperCase()
    
    if (period === 'PM' && hours !== 12) {
      hours += 12
    } else if (period === 'AM' && hours === 12) {
      hours = 0
    }
    
    const result = new Date(baseDate)
    result.setHours(hours, minutes, 0, 0)
    return result
  }
  
  // Handle 24-hour format
  const parts = trimmed.split(':')
  if (parts.length === 2) {
    const hours = parseInt(parts[0])
    const minutes = parseInt(parts[1])
    
    if (!isNaN(hours) && !isNaN(minutes)) {
      const result = new Date(baseDate)
      result.setHours(hours, minutes, 0, 0)
      return result
    }
  }
  
  return null
}

// Helper function to calculate hours between two times
function calculateHours(startTime: Date | null, endTime: Date | null): number {
  if (!startTime || !endTime) return 0
  const diffMs = endTime.getTime() - startTime.getTime()
  return diffMs / (1000 * 60 * 60) // Convert to hours
}

async function importTimesheetData(rows: TimesheetCSVRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    companies: { created: 0, updated: 0 },
    users: { created: 0, updated: 0 },
    jobs: { created: 0, updated: 0 },
    shifts: { created: 0, updated: 0 },
    assignments: { created: 0, updated: 0 },
    timeEntries: { created: 0, updated: 0 },
    errors: []
  }

  // Process rows in batches to avoid too many open connections
  const batchSize = 5
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          try {
            // 1. Create or find company
            let company = await tx.company.findUnique({
              where: { name: row.client_name }
            })

            if (!company) {
              company = await tx.company.create({
                data: { name: row.client_name }
              })
              summary.companies.created++
            }

            // 2. Create or find user
            const userEmail = `${row.employee_name.toLowerCase().replace(/\s+/g, '.')}@temp.com`
            let user = await tx.user.findUnique({
              where: { email: userEmail }
            })

            if (!user) {
              user = await tx.user.create({
                data: {
                  name: row.employee_name,
                  email: userEmail,
                  role: UserRole.Staff,
                  companyId: company.id
                }
              })
              summary.users.created++
            }

            // 3. Create or find job
            const jobName = `${row.client_name} - ${new Date(row.date_time).toLocaleDateString()}`
            let job = await tx.job.findFirst({
              where: {
                name: jobName,
                companyId: company.id
              }
            })

            if (!job) {
              job = await tx.job.create({
                data: {
                  name: jobName,
                  companyId: company.id,
                  location: row.location,
                  startDate: new Date(row.date_time)
                }
              })
              summary.jobs.created++
            }

            // 4. Create or find shift
            const shiftDate = new Date(row.date_time)
            const startTime = parseTime(row.in_time, shiftDate) || new Date(shiftDate.getTime() + 8 * 60 * 60 * 1000)
            const endTime = parseTime(row.out_time, shiftDate) || new Date(shiftDate.getTime() + 17 * 60 * 60 * 1000)

            let shift = await tx.shift.findFirst({
              where: {
                jobId: job.id,
                date: {
                  gte: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate()),
                  lt: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate() + 1)
                }
              }
            })

            if (!shift) {
              shift = await tx.shift.create({
                data: {
                  jobId: job.id,
                  date: shiftDate,
                  startTime,
                  endTime,
                  location: row.location
                }
              })
              summary.shifts.created++
            }

            // 5. Create assignment
            let assignment = await tx.assignedPersonnel.findFirst({
              where: {
                shiftId: shift.id,
                userId: user.id
              }
            })

            if (!assignment) {
              assignment = await tx.assignedPersonnel.create({
                data: {
                  shiftId: shift.id,
                  userId: user.id,
                  roleCode: 'WR'
                }
              })
              summary.assignments.created++
            }

            // 6. Create time entries
            const baseDate = new Date(row.date_time)
            
            // Entry 1
            if (row.in_time && row.out_time) {
              const clockIn1 = parseTime(row.in_time, baseDate)
              const clockOut1 = parseTime(row.out_time, baseDate)
              
              if (clockIn1 && clockOut1) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn1,
                    clockOut: clockOut1,
                    entryNumber: 1
                  }
                })
                summary.timeEntries.created++
              }
            }

            // Entry 2
            if (row.in_time_2 && row.out_time_2) {
              const clockIn2 = parseTime(row.in_time_2, baseDate)
              const clockOut2 = parseTime(row.out_time_2, baseDate)
              
              if (clockIn2 && clockOut2) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn2,
                    clockOut: clockOut2,
                    entryNumber: 2
                  }
                })
                summary.timeEntries.created++
              }
            }

            // Entry 3
            if (row.in_time_3 && row.out_time_3) {
              const clockIn3 = parseTime(row.in_time_3, baseDate)
              const clockOut3 = parseTime(row.out_time_3, baseDate)
              
              if (clockIn3 && clockOut3) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn3,
                    clockOut: clockOut3,
                    entryNumber: 3
                  }
                })
                summary.timeEntries.created++
              }
            }

            // Entry 4
            if (row.in_time_4 && row.out_time_4) {
              const clockIn4 = parseTime(row.in_time_4, baseDate)
              const clockOut4 = parseTime(row.out_time_4, baseDate)
              
              if (clockIn4 && clockOut4) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn4,
                    clockOut: clockOut4,
                    entryNumber: 4
                  }
                })
                summary.timeEntries.created++
              }
            }

          } catch (error) {
            console.error('Error importing timesheet row:', error)
            summary.errors.push({
              rowNumber: row._rowNumber,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }, {
        timeout: 30000 // 30 second timeout
      })
    } catch (error) {
      console.error('Error in batch transaction:', error)
      // Add errors for all rows in this batch
      batch.forEach(row => {
        summary.errors.push({
          rowNumber: row._rowNumber,
          error: error instanceof Error ? error.message : 'Transaction failed'
        })
      })
    }
  }

  return summary
}

async function importTimesheetTemplateData(rows: TimesheetTemplateCSVRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    companies: { created: 0, updated: 0 },
    users: { created: 0, updated: 0 },
    jobs: { created: 0, updated: 0 },
    shifts: { created: 0, updated: 0 },
    assignments: { created: 0, updated: 0 },
    timeEntries: { created: 0, updated: 0 },
    errors: []
  }

  // Process rows in batches to avoid too many open connections
  const batchSize = 5
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          try {
            // 1. Create or find company
            let company = await tx.company.findUnique({
              where: { name: row.client_name }
            })

            if (!company) {
              company = await tx.company.create({
                data: { 
                  name: row.client_name,
                  description: row.client_po ? `PO: ${row.client_po}` : undefined
                }
              })
              summary.companies.created++
            }

            // 2. Create or find user
            const userEmail = `${row.employee_name.toLowerCase().replace(/\s+/g, '.')}@temp.com`
            let user = await tx.user.findUnique({
              where: { email: userEmail }
            })

            if (!user) {
              user = await tx.user.create({
                data: {
                  name: row.employee_name,
                  email: userEmail,
                  role: UserRole.Staff,
                  companyId: company.id
                }
              })
              summary.users.created++
            }

            // 3. Create or find job
            const jobName = row.hands_on_job_number || `${row.client_name} - ${new Date(row.date_time).toLocaleDateString()}`
            let job = await tx.job.findFirst({
              where: {
                name: jobName,
                companyId: company.id
              }
            })

            if (!job) {
              job = await tx.job.create({
                data: {
                  name: jobName,
                  companyId: company.id,
                  location: row.location,
                  startDate: new Date(row.date_time),
                  description: row.hands_on_job_number ? `Hands On Job #${row.hands_on_job_number}` : undefined
                }
              })
              summary.jobs.created++
            }

            // 4. Create or find shift
            const shiftDate = new Date(row.date_time)
            const startTime = parseTime(row.in_time, shiftDate) || new Date(shiftDate.getTime() + 8 * 60 * 60 * 1000)
            const endTime = parseTime(row.out_time, shiftDate) || new Date(shiftDate.getTime() + 17 * 60 * 60 * 1000)

            let shift = await tx.shift.findFirst({
              where: {
                jobId: job.id,
                date: {
                  gte: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate()),
                  lt: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate() + 1)
                }
              }
            })

            if (!shift) {
              shift = await tx.shift.create({
                data: {
                  jobId: job.id,
                  date: shiftDate,
                  startTime,
                  endTime,
                  location: row.location
                }
              })
              summary.shifts.created++
            }

            // 5. Create assignment
            let assignment = await tx.assignedPersonnel.findFirst({
              where: {
                shiftId: shift.id,
                userId: user.id
              }
            })

            if (!assignment) {
              // Map employee initials to role codes
              let roleCode = 'WR' // Default to Worker
              if (row.employee_initials) {
                const initials = row.employee_initials.toLowerCase()
                if (initials === 'cc') roleCode = 'CC' // Crew Chief
                else if (initials === 'sh') roleCode = 'SH' // Stagehand
                else if (initials === 'fo') roleCode = 'FO' // Fork Operator
                else if (initials === 'rg') roleCode = 'RG' // Rigger
                else if (initials === 'gl') roleCode = 'GL' // General Laborer
              }

              assignment = await tx.assignedPersonnel.create({
                data: {
                  shiftId: shift.id,
                  userId: user.id,
                  roleCode
                }
              })
              summary.assignments.created++
            }

            // 6. Create time entries
            const baseDate = new Date(row.date_time)
            
            // Entry 1
            if (row.in_time && row.out_time) {
              const clockIn1 = parseTime(row.in_time, baseDate)
              const clockOut1 = parseTime(row.out_time, baseDate)
              
              if (clockIn1 && clockOut1) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn1,
                    clockOut: clockOut1,
                    entryNumber: 1
                  }
                })
                summary.timeEntries.created++
              }
            }

            // Entry 2
            if (row.in_time_2 && row.out_time_2) {
              const clockIn2 = parseTime(row.in_time_2, baseDate)
              const clockOut2 = parseTime(row.out_time_2, baseDate)
              
              if (clockIn2 && clockOut2) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn2,
                    clockOut: clockOut2,
                    entryNumber: 2
                  }
                })
                summary.timeEntries.created++
              }
            }

            // Entry 3
            if (row.in_time_3 && row.out_time_3) {
              const clockIn3 = parseTime(row.in_time_3, baseDate)
              const clockOut3 = parseTime(row.out_time_3, baseDate)
              
              if (clockIn3 && clockOut3) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn3,
                    clockOut: clockOut3,
                    entryNumber: 3
                  }
                })
                summary.timeEntries.created++
              }
            }

            // Entry 4
            if (row.in_time_4 && row.out_time_4) {
              const clockIn4 = parseTime(row.in_time_4, baseDate)
              const clockOut4 = parseTime(row.out_time_4, baseDate)
              
              if (clockIn4 && clockOut4) {
                await tx.timeEntry.create({
                  data: {
                    assignedPersonnelId: assignment.id,
                    clockIn: clockIn4,
                    clockOut: clockOut4,
                    entryNumber: 4
                  }
                })
                summary.timeEntries.created++
              }
            }

          } catch (error) {
            console.error('Error importing timesheet template row:', error)
            summary.errors.push({
              rowNumber: row._rowNumber,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }, {
        timeout: 30000 // 30 second timeout
      })
    } catch (error) {
      console.error('Error in batch transaction:', error)
      // Add errors for all rows in this batch
      batch.forEach(row => {
        summary.errors.push({
          rowNumber: row._rowNumber,
          error: error instanceof Error ? error.message : 'Transaction failed'
        })
      })
    }
  }

  return summary
}

async function importEmployeeData(rows: EmployeeCSVRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    users: { created: 0, updated: 0 },
    companies: { created: 0, updated: 0 },
    errors: []
  }

  // Process in smaller batches
  const batchSize = 10
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          try {
            // 1. Find or create company if specified
            let companyId: string | null = null
            if (row.company_name) {
              let company = await tx.company.findUnique({
                where: { name: row.company_name }
              })

              if (!company) {
                company = await tx.company.create({
                  data: { name: row.company_name }
                })
                summary.companies.created++
              }
              companyId = company.id
            }

            // 2. Create or update user
            const existingUser = await tx.user.findUnique({
              where: { email: row.email }
            })

            const userData = {
              name: row.name,
              email: row.email,
              phone: row.phone || null,
              role: (row.role as UserRole) || UserRole.Staff,
              companyId,
              crew_chief_e_eigible: row.crew_chief_eligible === 'true',
              fork_operator_e_eigible: row.fork_operator_eligible === 'true',
              OSHA_10_Certifications: row.OSHA_10_Certifications === 'true',
              OSHA_10_Certifications: row.OSHA_10_Certifications === 'true',
              certifications: row.certifications ? row.certifications.split(',').map(c => c.trim()) : []? row.certifications.split(',').map(c => c.trim()) : [],
              location: row.location || null
            }

            if (existingUser) {
              await tx.user.update({
                where: { email: row.email },
                data: userData
              })
              summary.users.updated++
            } else {
              await tx.user.create({
                data: userData
              })
              summary.users.created++
            }

          } catch (error) {
            console.error('Error importing employee row:', error)
            summary.errors.push({
              rowNumber: row._rowNumber,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }, {
        timeout: 30000
      })
    } catch (error) {
      console.error('Error in employee batch transaction:', error)
      batch.forEach(row => {
        summary.errors.push({
          rowNumber: row._rowNumber,
          error: error instanceof Error ? error.message : 'Transaction failed'
        })
      })
    }
  }

  return summary
}

async function importCompanyData(rows: CompanyCSVRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    companies: { created: 0, updated: 0 },
    errors: []
  }

  // Process in batches
  const batchSize = 10
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          try {
            const existingCompany = await tx.company.findUnique({
              where: { name: row.name }
            })

            const companyData = {
              name: row.name,
              address: row.address || null,
              phone: row.phone || null,
              email: row.email || null,
              website: row.website || null,
              description: row.description || null,
              contactName: row.contact_name || null
            }

            if (existingCompany) {
              await tx.company.update({
                where: { name: row.name },
                data: companyData
              })
              summary.companies.updated++
            } else {
              await tx.company.create({
                data: companyData
              })
              summary.companies.created++
            }

          } catch (error) {
            console.error('Error importing company row:', error)
            summary.errors.push({
              rowNumber: row._rowNumber,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }, {
        timeout: 30000
      })
    } catch (error) {
      console.error('Error in company batch transaction:', error)
      batch.forEach(row => {
        summary.errors.push({
          rowNumber: row._rowNumber,
          error: error instanceof Error ? error.message : 'Transaction failed'
        })
      })
    }
  }

  return summary
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { data, importType } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      )
    }

    let summary: ImportSummary

    switch (importType) {
      case 'timesheet':
        summary = await importTimesheetData(data as TimesheetCSVRow[])
        break
      case 'timesheet_template':
        summary = await importTimesheetTemplateData(data as TimesheetTemplateCSVRow[])
        break
      case 'employees':
        summary = await importEmployeeData(data as EmployeeCSVRow[])
        break
      case 'companies':
        summary = await importCompanyData(data as CompanyCSVRow[])
        break
      case 'jobs':
        // Implement job import
        summary = { errors: [], jobs: { created: 0, updated: 0 } }
        break
      case 'shifts':
        // Implement shift import
        summary = { errors: [], shifts: { created: 0, updated: 0 } }
        break
      case 'assignments':
        // Implement assignment import
        summary = { errors: [], assignments: { created: 0, updated: 0 } }
        break
      case 'comprehensive':
        // Implement comprehensive import (existing logic)
        summary = { errors: [], comprehensive: { created: 0, updated: 0 } }
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported import type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ summary })

  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    )
  }
}