import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { parse } from 'csv-parse/sync'
import { TimesheetTemplateCSVRow } from '@/lib/types/csv-enhanced'

export const dynamic = 'force-dynamic'

interface ParsedTimesheetData {
  clientName: string
  clientPO: string
  handsOnJobNumber: string
  location: string
  dateTime: string
  employees: Array<{
    name: string
    initials: string
    workerType: string
    inTime: string
    outTime: string
    inTime2?: string
    outTime2?: string
    inTime3?: string
    outTime3?: string
    inTime4?: string
    outTime4?: string
    totalHours?: string
    regHours?: string
    otHours?: string
    dtHours?: string
    ta?: string
  }>
}

function parseTimesheetTemplate(csvText: string): ParsedTimesheetData {
  const records: string[][] = parse(csvText, {
    trim: true,
    skip_empty_lines: true,
  });

  const result: ParsedTimesheetData = {
    clientName: '',
    clientPO: '',
    handsOnJobNumber: '',
    location: '',
    dateTime: '',
    employees: [],
  };

  let employeeHeaderIndex = -1;
  const headerMap: { [key: string]: number } = {};

  // First pass: find metadata and header row
  records.forEach((cells, i) => {
    const line = cells.join(',');

    if (line.includes('CLIENT PO#')) {
      result.clientPO = cells.find(c => c.match(/^\d+$/)) || '';
    }
    if (line.includes('CLIENT NAME')) {
       result.clientName = cells[1] || '';
    }
     if (line.includes('HANDS ON JOB #')) {
      result.handsOnJobNumber = cells[cells.length -1] || '';
    }
    if (line.includes('DATE/TIME')) {
      result.dateTime = cells[1] || '';
    }
    if (line.includes('LOCATION')) {
      result.location = cells[cells.length -1] || '';
    }

    if (line.includes('EMPLOYEE NAME') && line.includes('IN') && line.includes('OUT')) {
      employeeHeaderIndex = i;
      cells.forEach((header, index) => {
        headerMap[header.toUpperCase().trim()] = index;
      });
    }
  });

  if (employeeHeaderIndex === -1) {
    // Fallback or error if no employee header is found
    console.warn("Could not find employee header row in CSV.");
    return result;
  }

  // Second pass: parse employee data
  for (let i = employeeHeaderIndex + 1; i < records.length; i++) {
    const cells = records[i];
    const name = cells[headerMap['EMPLOYEE NAME']] || '';
    
    // Stop if we hit a line that's clearly not an employee
    if (!name || name.includes('PHONE:') || name.includes('White Copy') || name.includes('SIGNATURE')) {
      continue;
    }

    const employee = {
      name: name,
      initials: cells[headerMap['INITIALS']] || '',
      // Adding worker type parsing
      workerType: cells[headerMap['JT']] || 'N/A',
      inTime: cells[headerMap['IN']] || '',
      outTime: cells[headerMap['OUT']] || '',
      inTime2: cells[headerMap['IN_2']] || '',
      outTime2: cells[headerMap['OUT_2']] || '',
      inTime3: cells[headerMap['IN_3']] || '',
      outTime3: cells[headerMap['OUT_3']] || '',
      inTime4: cells[headerMap['IN_4']] || '',
      outTime4: cells[headerMap['OUT_4']] || '',
      totalHours: cells[headerMap['TOTAL']] || '',
      regHours: cells[headerMap['REG']] || '',
      otHours: cells[headerMap['O.T.']] || '',
      dtHours: cells[headerMap['D.T.']] || '',
      ta: cells[headerMap['T.A.']] || ''
    };

    if (employee.name && (employee.inTime || employee.outTime)) {
      // @ts-ignore
      result.employees.push(employee);
    }
  }

  return result;
}

function validateTimesheetTemplateRow(row: any, rowNumber: number): TimesheetTemplateCSVRow {
  const errors: string[] = []

  // Required fields validation
  if (!row.client_name?.trim()) errors.push('Client name is required')
  if (!row.employee_name?.trim()) errors.push('Employee name is required')
  if (!row.date_time?.trim()) errors.push('Date/time is required')

  // Time validation (basic format check)
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

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const csvText = await file.text()
    
    // Parse the timesheet template format
    const parsedData = parseTimesheetTemplate(csvText)
    
    // Convert to normalized CSV rows
    const validatedRows: TimesheetTemplateCSVRow[] = []
    
    parsedData.employees.forEach((employee, index) => {
      const row = {
        client_name: parsedData.clientName,
        client_po: parsedData.clientPO,
        hands_on_job_number: parsedData.handsOnJobNumber,
        location: parsedData.location,
        date_time: parsedData.dateTime,
        employee_name: employee.name,
        employee_initials: employee.initials,
        in_time: employee.inTime,
        out_time: employee.outTime,
        in_time_2: employee.inTime2 || '',
        out_time_2: employee.outTime2 || '',
        in_time_3: employee.inTime3 || '',
        out_time_3: employee.outTime3 || '',
        in_time_4: employee.inTime4 || '',
        out_time_4: employee.outTime4 || '',
        total_hours: employee.totalHours || '',
        reg_hours: employee.regHours || '',
        ot_hours: employee.otHours || '',
        dt_hours: employee.dtHours || '',
        ta: employee.ta || ''
      }
      
      const validatedRow = validateTimesheetTemplateRow(row, index + 1)
      validatedRows.push(validatedRow)
    })

    const validRows = validatedRows.filter(row => row._errors.length === 0)
    const invalidRows = validatedRows.filter(row => row._errors.length > 0)

    const summary = {
      totalRows: validatedRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      headers: ['client_name', 'client_po', 'hands_on_job_number', 'location', 'date_time', 'employee_name', 'employee_initials', 'in_time', 'out_time', 'in_time_2', 'out_time_2', 'in_time_3', 'out_time_3', 'in_time_4', 'out_time_4', 'total_hours', 'reg_hours', 'ot_hours', 'dt_hours', 'ta'],
      importType: 'timesheet_template' as const
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
      errors,
      parsedMetadata: {
        clientName: parsedData.clientName,
        clientPO: parsedData.clientPO,
        handsOnJobNumber: parsedData.handsOnJobNumber,
        location: parsedData.location,
        dateTime: parsedData.dateTime,
        employeeCount: parsedData.employees.length
      }
    })

  } catch (error) {
    console.error('Error parsing timesheet template:', error)
    return NextResponse.json(
      { error: 'Failed to parse timesheet template' },
      { status: 500 }
    )
  }
}