import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { parse } from 'csv-parse/sync'
import { 
  ImportType, 
  CSV_TEMPLATES,
  TimesheetCSVRow,
  TimesheetTemplateCSVRow,
  EmployeeCSVRow,
  CompanyCSVRow,
  JobCSVRow,
  ShiftCSVRow,
  AssignmentCSVRow,
  ComprehensiveCSVRow
} from '@/lib/types/csv-enhanced'

export const dynamic = 'force-dynamic'

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateTime(timeStr: string): boolean {
  if (!timeStr) return true // Optional field
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(timeStr)
}

function validateDate(dateStr: string): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

function validateTimesheetRow(row: any, rowNumber: number): TimesheetCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.client_name?.trim()) errors.push('Client name is required')
  if (!row.employee_name?.trim()) errors.push('Employee name is required')
  if (!row.date_time?.trim()) errors.push('Date/time is required')
  else if (!validateDate(row.date_time)) errors.push('Invalid date format')

  // Time validation
  if (row.in_time && !validateTime(row.in_time)) errors.push('Invalid in_time format')
  if (row.out_time && !validateTime(row.out_time)) errors.push('Invalid out_time format')
  if (row.in_time_2 && !validateTime(row.in_time_2)) errors.push('Invalid in_time_2 format')
  if (row.out_time_2 && !validateTime(row.out_time_2)) errors.push('Invalid out_time_2 format')
  if (row.in_time_3 && !validateTime(row.in_time_3)) errors.push('Invalid in_time_3 format')
  if (row.out_time_3 && !validateTime(row.out_time_3)) errors.push('Invalid out_time_3 format')
  if (row.in_time_4 && !validateTime(row.in_time_4)) errors.push('Invalid in_time_4 format')
  if (row.out_time_4 && !validateTime(row.out_time_4)) errors.push('Invalid out_time_4 format')

  // Hours validation
  if (row.total_hours && isNaN(parseFloat(row.total_hours))) errors.push('Invalid total_hours format')
  if (row.reg_hours && isNaN(parseFloat(row.reg_hours))) errors.push('Invalid reg_hours format')
  if (row.ot_hours && isNaN(parseFloat(row.ot_hours))) errors.push('Invalid ot_hours format')
  if (row.dt_hours && isNaN(parseFloat(row.dt_hours))) errors.push('Invalid dt_hours format')

  return {
    client_name: row.client_name || '',
    location: row.location || '',
    date_time: row.date_time || '',
    employee_name: row.employee_name || '',
    in_time: row.in_time || '',
    out_time: row.out_time || '',
    in_time_2: row.in_time_2 || '',
    out_time_2: row.out_time_2 || '',
    in_time_3: row.in_time_3 || '',
    out_time_3: row.out_time_3 || '',
    in_time_4: row.in_time_4 || '',
    out_time_4: row.out_time_4 || '',
    total_hours: row.total_hours || '',
    reg_hours: row.reg_hours || '',
    ot_hours: row.ot_hours || '',
    dt_hours: row.dt_hours || '',
    ta: row.ta || '',
    _rowNumber: rowNumber,
    _errors: errors
  }
}

function validateTimesheetTemplateRow(row: any, rowNumber: number): TimesheetTemplateCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.client_name?.trim()) errors.push('Client name is required')
  if (!row.employee_name?.trim()) errors.push('Employee name is required')
  if (!row.date_time?.trim()) errors.push('Date/time is required')

  // Time validation (flexible format for template)
  const timeFields = ['in_time', 'out_time', 'in_time_2', 'out_time_2', 'in_time_3', 'out_time_3', 'in_time_4', 'out_time_4']
  timeFields.forEach(field => {
    const value = row[field]
    if (value && value.trim()) {
      // Accept various time formats: "9:00 AM", "09:00", "9:00"
      const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
      if (!timeRegex.test(value.trim())) {
        errors.push(`Invalid ${field} format: ${value}`)
      }
    }
  })

  return {
    client_name: row.client_name || '',
    client_po: row.client_po || '',
    hands_on_job_number: row.hands_on_job_number || '',
    location: row.location || '',
    date_time: row.date_time || '',
    employee_name: row.employee_name || '',
    employee_initials: row.employee_initials || '',
    in_time: row.in_time || '',
    out_time: row.out_time || '',
    in_time_2: row.in_time_2 || '',
    out_time_2: row.out_time_2 || '',
    in_time_3: row.in_time_3 || '',
    out_time_3: row.out_time_3 || '',
    in_time_4: row.in_time_4 || '',
    out_time_4: row.out_time_4 || '',
    total_hours: row.total_hours || '',
    reg_hours: row.reg_hours || '',
    ot_hours: row.ot_hours || '',
    dt_hours: row.dt_hours || '',
    ta: row.ta || '',
    _rowNumber: rowNumber,
    _errors: errors
  }
}

function validateEmployeeRow(row: any, rowNumber: number): EmployeeCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.name?.trim()) errors.push('Name is required')
  if (!row.email?.trim()) errors.push('Email is required')
  else if (!validateEmail(row.email)) errors.push('Invalid email format')

  // Role validation
  const validRoles = ['Staff', 'Admin', 'CompanyUser', 'CrewChief', 'Employee']
  if (row.role && !validRoles.includes(row.role)) {
    errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
  }

  // Boolean validation
  if (row.crew_chief_eligible && !['true', 'false'].includes(row.crew_chief_eligible.toLowerCase())) {
    errors.push('crew_chief_eligible must be true or false')
  }
  if (row.fork_operator_eligible && !['true', 'false'].includes(row.fork_operator_eligible.toLowerCase())) {
    errors.push('fork_operator_eligible must be true or false')
  }

  return {
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || 'Staff',
    company_name: row.company_name || '',
    crew_chief_eligible: row.crew_chief_eligible || 'false',
    fork_operator_eligible: row.fork_operator_eligible || 'false',
    certifications: row.certifications || '',
    location: row.location || '',
    _rowNumber: rowNumber,
    _errors: errors
  }
}

function validateCompanyRow(row: any, rowNumber: number): CompanyCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.name?.trim()) errors.push('Company name is required')

  // Email validation
  if (row.email && !validateEmail(row.email)) errors.push('Invalid email format')

  return {
    name: row.name || '',
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
    description: row.description || '',
    contact_name: row.contact_name || '',
    _rowNumber: rowNumber,
    _errors: errors
  }
}

function validateJobRow(row: any, rowNumber: number): JobCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.name?.trim()) errors.push('Job name is required')
  if (!row.company_name?.trim()) errors.push('Company name is required')

  // Date validation
  if (row.start_date && !validateDate(row.start_date)) errors.push('Invalid start_date format')
  if (row.end_date && !validateDate(row.end_date)) errors.push('Invalid end_date format')

  // Status validation
  const validStatuses = ['Pending', 'Active', 'OnHold', 'Completed', 'Cancelled']
  if (row.status && !validStatuses.includes(row.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  return {
    name: row.name || '',
    company_name: row.company_name || '',
    description: row.description || '',
    location: row.location || '',
    start_date: row.start_date || '',
    end_date: row.end_date || '',
    budget: row.budget || '',
    status: row.status || 'Pending',
    notes: row.notes || '',
    _rowNumber: rowNumber,
    _errors: errors
  }
}

function validateShiftRow(row: any, rowNumber: number): ShiftCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.job_name?.trim()) errors.push('Job name is required')
  if (!row.company_name?.trim()) errors.push('Company name is required')
  if (!row.date?.trim()) errors.push('Date is required')
  else if (!validateDate(row.date)) errors.push('Invalid date format')

  // Time validation
  if (!row.start_time?.trim()) errors.push('Start time is required')
  else if (!validateTime(row.start_time)) errors.push('Invalid start time format')
  if (!row.end_time?.trim()) errors.push('End time is required')
  else if (!validateTime(row.end_time)) errors.push('Invalid end time format')

  // Number validation
  const numberFields = ['requested_workers', 'required_crew_chiefs', 'required_stagehands', 
    'required_fork_operators', 'required_reach_fork_operators', 'required_riggers', 'required_general_laborers']
  
  numberFields.forEach(field => {
    if (row[field] && isNaN(parseInt(row[field]))) {
      errors.push(`Invalid ${field} format - must be a number`)
    }
  })

  return {
    job_name: row.job_name || '',
    company_name: row.company_name || '',
    date: row.date || '',
    start_time: row.start_time || '',
    end_time: row.end_time || '',
    location: row.location || '',
    description: row.description || '',
    notes: row.notes || '',
    requested_workers: row.requested_workers || '0',
    required_crew_chiefs: row.required_crew_chiefs || '0',
    required_stagehands: row.required_stagehands || '0',
    required_fork_operators: row.required_fork_operators || '0',
    required_reach_fork_operators: row.required_reach_fork_operators || '0',
    required_riggers: row.required_riggers || '0',
    required_general_laborers: row.required_general_laborers || '0',
    _rowNumber: rowNumber,
    _errors: errors
  }
}

function validateAssignmentRow(row: any, rowNumber: number): AssignmentCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.shift_id?.trim()) errors.push('Shift ID is required')
  if (!row.employee_name?.trim()) errors.push('Employee name is required')
  if (!row.employee_email?.trim()) errors.push('Employee email is required')
  else if (!validateEmail(row.employee_email)) errors.push('Invalid email format')

  // Role code validation
  const validRoleCodes = ['WR', 'CC', 'SH', 'FO', 'RG', 'GL']
  if (row.role_code && !validRoleCodes.includes(row.role_code)) {
    errors.push(`Invalid role_code. Must be one of: ${validRoleCodes.join(', ')}`)
  }

  // Status validation
  const validStatuses = ['Assigned', 'ClockedIn', 'OnBreak', 'ClockedOut', 'ShiftEnded', 'NoShow']
  if (row.status && !validStatuses.includes(row.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  return {
    shift_id: row.shift_id || '',
    employee_name: row.employee_name || '',
    employee_email: row.employee_email || '',
    role_code: row.role_code || 'WR',
    status: row.status || 'Assigned',
    _rowNumber: rowNumber,
    _errors: errors
  }
}

function validateComprehensiveRow(row: any, rowNumber: number): ComprehensiveCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.client_name?.trim()) errors.push('Client name is required')
  if (!row.job_name?.trim()) errors.push('Job name is required')
  if (!row.employee_name?.trim()) errors.push('Employee name is required')
  if (!row.employee_email?.trim()) errors.push('Employee email is required')
  else if (!validateEmail(row.employee_email)) errors.push('Invalid email format')

  // Date validation
  if (row.job_start_date && !validateDate(row.job_start_date)) errors.push('Invalid job start date')
  if (row.shift_date && !validateDate(row.shift_date)) errors.push('Invalid shift date')

  // Time validation
  if (row.shift_start_time && !validateTime(row.shift_start_time)) errors.push('Invalid shift start time')
  if (row.shift_end_time && !validateTime(row.shift_end_time)) errors.push('Invalid shift end time')
  if (row.clock_in_1 && !validateTime(row.clock_in_1)) errors.push('Invalid clock_in_1 time')
  if (row.clock_out_1 && !validateTime(row.clock_out_1)) errors.push('Invalid clock_out_1 time')
  if (row.clock_in_2 && !validateTime(row.clock_in_2)) errors.push('Invalid clock_in_2 time')
  if (row.clock_out_2 && !validateTime(row.clock_out_2)) errors.push('Invalid clock_out_2 time')
  if (row.clock_in_3 && !validateTime(row.clock_in_3)) errors.push('Invalid clock_in_3 time')
  if (row.clock_out_3 && !validateTime(row.clock_out_3)) errors.push('Invalid clock_out_3 time')

  // Worker type validation
  const validWorkerTypes = ['WR', 'CC', 'SH', 'FO', 'RG', 'GL']
  if (row.worker_type && !validWorkerTypes.includes(row.worker_type)) {
    errors.push(`Invalid worker type. Must be one of: ${validWorkerTypes.join(', ')}`)
  }

  return {
    client_name: row.client_name || '',
    contact_name: row.contact_name || '',
    contact_phone: row.contact_phone || '',
    job_name: row.job_name || '',
    job_start_date: row.job_start_date || '',
    shift_date: row.shift_date || '',
    shift_start_time: row.shift_start_time || '',
    shift_end_time: row.shift_end_time || '',
    employee_name: row.employee_name || '',
    employee_email: row.employee_email || '',
    employee_phone: row.employee_phone || '',
    worker_type: row.worker_type || 'WR',
    clock_in_1: row.clock_in_1 || '',
    clock_out_1: row.clock_out_1 || '',
    clock_in_2: row.clock_in_2 || '',
    clock_out_2: row.clock_out_2 || '',
    clock_in_3: row.clock_in_3 || '',
    clock_out_3: row.clock_out_3 || '',
    _rowNumber: rowNumber,
    _errors: errors
  }
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const importType = formData.get('importType') as ImportType

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!importType || !CSV_TEMPLATES[importType]) {
      return NextResponse.json(
        { error: 'Invalid import type' },
        { status: 400 }
      )
    }

    const csvText = await file.text()
    const rawRows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    const expectedHeaders = CSV_TEMPLATES[importType].headers
    const fileHeaders = Object.keys(rawRows[0] || {})
    
    // Check if headers match (case-insensitive)
    const normalizedExpected = expectedHeaders.map(h => h.toLowerCase())
    const normalizedFile = fileHeaders.map(h => h.toLowerCase())
    
    const missingHeaders = normalizedExpected.filter(h => !normalizedFile.includes(h))
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate and normalize each row based on import type
    let validatedRows: any[] = []
    
    switch (importType) {
      case 'timesheet':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateTimesheetRow(row, index + 1)
        )
        break
      case 'timesheet_template':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateTimesheetTemplateRow(row, index + 1)
        )
        break
      case 'employees':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateEmployeeRow(row, index + 1)
        )
        break
      case 'companies':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateCompanyRow(row, index + 1)
        )
        break
      case 'jobs':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateJobRow(row, index + 1)
        )
        break
      case 'shifts':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateShiftRow(row, index + 1)
        )
        break
      case 'assignments':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateAssignmentRow(row, index + 1)
        )
        break
      case 'comprehensive':
        validatedRows = rawRows.map((row: any, index: number) => 
          validateComprehensiveRow(row, index + 1)
        )
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported import type' },
          { status: 400 }
        )
    }

    const validRows = validatedRows.filter(row => row._errors.length === 0)
    const invalidRows = validatedRows.filter(row => row._errors.length > 0)

    const summary = {
      totalRows: validatedRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      headers: expectedHeaders,
      importType
    }

    const errors = invalidRows.map(row => ({
      rowNumber: row._rowNumber,
      errors: row._errors,
      data: row
    }))

    return NextResponse.json({
      summary,
      data: validatedRows,
      validData: validRows,
      errors
    })

  } catch (error) {
    console.error('Error parsing CSV:', error)
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    )
  }
}