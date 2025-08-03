import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { CSV_HEADERS, CSVRow } from '@/lib/types/csv'

// Validation functions
function validateDate(dateStr: string): boolean {
  if (!dateStr) return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

function validateTime(timeStr: string): boolean {
  if (!timeStr) return false
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(timeStr)
}

function validateEmail(email: string): boolean {
  if (!email) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

function validateWorkerType(workerType: string): boolean {
  const validTypes = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']
  return validTypes.includes(workerType)
}

function validateTimeOrder(clockIn: string, clockOut: string): boolean {
  if (!clockIn || !clockOut) return true // Optional pairs
  if (!validateTime(clockIn) || !validateTime(clockOut)) return false
  
  const [inHour, inMin] = clockIn.split(':').map(Number)
  const [outHour, outMin] = clockOut.split(':').map(Number)
  const inMinutes = inHour * 60 + inMin
  const outMinutes = outHour * 60 + outMin
  
  return outMinutes > inMinutes
}

function validateRow(row: any, rowNumber: number): CSVRow {
  const errors: string[] = []
  const validatedRow: CSVRow = {
    ...row,
    _rowNumber: rowNumber,
    _errors: errors
  }

  // Required field validation
  if (!row.client_name?.trim()) errors.push('Customer name is required')
  if (!row.job_name?.trim()) errors.push('Job name is required')
  if (!row.shift_date?.trim()) errors.push('Shift date is required')
  if (!row.shift_start_time?.trim()) errors.push('Shift start time is required')
  if (!row.shift_end_time?.trim()) errors.push('Shift end time is required')
  if (!row.employee_name?.trim()) errors.push('Employee name is required')
  if (!row.worker_type?.trim()) errors.push('Worker type is required')

  // Date validation
  if (row.job_start_date && !validateDate(row.job_start_date)) {
    errors.push('Job start date must be in YYYY-MM-DD format')
  }
  if (row.shift_date && !validateDate(row.shift_date)) {
    errors.push('Shift date must be in YYYY-MM-DD format')
  }

  // Time validation
  if (row.shift_start_time && !validateTime(row.shift_start_time)) {
    errors.push('Shift start time must be in HH:MM format (24-hour)')
  }
  if (row.shift_end_time && !validateTime(row.shift_end_time)) {
    errors.push('Shift end time must be in HH:MM format (24-hour)')
  }

  // Validate shift time order
  if (row.shift_start_time && row.shift_end_time) {
    if (!validateTimeOrder(row.shift_start_time, row.shift_end_time)) {
      errors.push('Shift end time must be after start time')
    }
  }

  // Email validation (if provided)
  if (row.employee_email && !validateEmail(row.employee_email)) {
    errors.push('Employee email format is invalid')
  }

  // Worker type validation
  if (row.worker_type && !validateWorkerType(row.worker_type)) {
    errors.push('Worker type must be one of: CC, SH, FO, RFO, RG, GL')
  }

  // Clock in/out validation
  for (let i = 1; i <= 3; i++) {
    const clockIn = row[`clock_in_${i}`]
    const clockOut = row[`clock_out_${i}`]
    
    if (clockIn && !validateTime(clockIn)) {
      errors.push(`Clock in ${i} must be in HH:MM format (24-hour)`)
    }
    if (clockOut && !validateTime(clockOut)) {
      errors.push(`Clock out ${i} must be in HH:MM format (24-hour)`)
    }
    if (!validateTimeOrder(clockIn, clockOut)) {
      errors.push(`Clock out ${i} must be after clock in ${i}`)
    }
  }

  return validatedRow
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

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').map(line => line.trim()).filter(line => line)
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must contain headers and at least one data row' },
        { status: 400 }
      )
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    // Validate headers
    const missingHeaders = CSV_HEADERS.filter(required => !headers.includes(required))
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required headers',
          missingHeaders,
          expectedHeaders: CSV_HEADERS
        },
        { status: 400 }
      )
    }

    // Parse data rows
    const rows: CSVRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      const validatedRow = validateRow(row, i)
      rows.push(validatedRow)
    }

    // Calculate summary statistics
    const validRows = rows.filter(row => row._errors.length === 0)
    const invalidRows = rows.filter(row => row._errors.length > 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        headers: CSV_HEADERS
      },
      data: rows,
      validData: validRows,
      errors: invalidRows.map(row => ({
        rowNumber: row._rowNumber,
        errors: row._errors,
        data: row
      }))
    })

  } catch (error) {
    console.error('Error parsing CSV:', error)
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    )
  }
}
