"use client"

interface SheetData {
  headers: string[]
  rows: any[][]
  sheetName: string
  sheetId: string
}

interface ProcessingResult {
  csvData: string
  summaryReport: string
  originalResponse: string
  mappedFields: Record<string, string>
  confidence: number
  warnings: string[]
}

const SYSTEM_PROMPT = `You are a specialized data extraction and transformation assistant for Holitime, a shift management system. Your task is to analyze Google Sheets data and convert it into a standardized CSV format.

Required CSV Format:
client_name,job_name,shift_date,shift_start_time,shift_end_time,employee_name,worker_type,notes

Field Specifications:
- client_name: Company name (required)
- job_name: Project or event name (required)
- shift_date: YYYY-MM-DD format (required)
- shift_start_time: HH:mm format, 24-hour (required)
- shift_end_time: HH:mm format, 24-hour (required)
- employee_name: Full name (required)
- worker_type: One of [CC, SH, FO, RFO, RG, GL] (required)
  CC = Crew Chief
  SH = Stage Hand
  FO = Fork Operator
  RFO = Rough Fork Operator
  RG = Rigger
  GL = General Labor
- notes: Additional information (optional)

Processing Instructions:
1. Analyze the sheet structure and identify relevant columns
2. Map source columns to target fields using semantic understanding
3. Clean and standardize data:
   - Convert dates to YYYY-MM-DD
   - Convert times to 24-hour HH:mm
   - Standardize worker types to valid codes
   - Remove any special characters from names
4. Validate data completeness and format
5. Generate detailed processing report
6. Include confidence scores for field mappings

Output Format:
{
  "csvData": "CSV content with headers...",
  "summaryReport": "Detailed analysis of processing...",
  "mappedFields": {
    "sourceColumn": "targetField",
    ...
  },
  "confidence": 0.95,
  "warnings": [
    "Warning messages...",
    ...
  ]
}`

export class GeminiProcessor {
  private static cleanDateTime(value: string): { date: string, time: string } {
    // Remove any special characters and extra whitespace
    const cleaned = value.replace(/[^\w\s-:]/g, '').trim()
    
    // Try different date formats
    const formats = [
      // MM/DD/YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      // YYYY-MM-DD
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      // MM-DD-YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/
    ]

    let date = ''
    let time = ''

    // Extract date
    for (const format of formats) {
      const match = cleaned.match(format)
      if (match) {
        const [_, part1, part2, part3] = match
        if (format === formats[0] || format === formats[2]) {
          // Convert MM/DD/YYYY to YYYY-MM-DD
          date = `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`
        } else {
          date = `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`
        }
        break
      }
    }

    // Extract time
    const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
    if (timeMatch) {
      let [_, hours, minutes, meridian] = timeMatch
      if (meridian) {
        // Convert 12-hour to 24-hour
        let hour = parseInt(hours)
        if (meridian.toUpperCase() === 'PM' && hour < 12) hour += 12
        if (meridian.toUpperCase() === 'AM' && hour === 12) hour = 0
        time = `${hour.toString().padStart(2, '0')}:${minutes}`
      } else {
        time = `${hours.padStart(2, '0')}:${minutes}`
      }
    }

    return { date, time }
  }

  private static standardizeWorkerType(type: string): string {
    const typeMap: Record<string, string> = {
      'crew chief': 'CC',
      'crewchief': 'CC',
      'stage hand': 'SH',
      'stagehand': 'SH',
      'fork operator': 'FO',
      'forklift': 'FO',
      'fork lift': 'FO',
      'rough fork': 'RFO',
      'roughfork': 'RFO',
      'rigger': 'RG',
      'general labor': 'GL',
      'general': 'GL',
      'labor': 'GL'
    }

    const normalized = type.toLowerCase().trim()
    return typeMap[normalized] || type.toUpperCase()
  }

  private static validateRow(row: Record<string, string>): string[] {
    const warnings: string[] = []
    const required = ['client_name', 'job_name', 'shift_date', 'shift_start_time', 'shift_end_time', 'employee_name', 'worker_type']

    required.forEach(field => {
      if (!row[field]) {
        warnings.push(`Missing required field: ${field}`)
      }
    })

    if (row.worker_type && !['CC', 'SH', 'FO', 'RFO', 'RG', 'GL'].includes(row.worker_type)) {
      warnings.push(`Invalid worker type: ${row.worker_type}. Must be one of: CC, SH, FO, RFO, RG, GL`)
    }

    // Validate date format
    if (row.shift_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.shift_date)) {
      warnings.push(`Invalid date format: ${row.shift_date}. Must be YYYY-MM-DD`)
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (row.shift_start_time && !timeRegex.test(row.shift_start_time)) {
      warnings.push(`Invalid start time format: ${row.shift_start_time}. Must be HH:mm in 24-hour format`)
    }
    if (row.shift_end_time && !timeRegex.test(row.shift_end_time)) {
      warnings.push(`Invalid end time format: ${row.shift_end_time}. Must be HH:mm in 24-hour format`)
    }

    return warnings
  }

  static async processSheetData(sheetsData: SheetData[]): Promise<ProcessingResult> {
    try {
      // First, analyze the sheets to find the most relevant one
      const relevantSheet = this.findMostRelevantSheet(sheetsData)
      
      // Generate field mappings using Gemini
      const mappings = await this.generateFieldMappings(relevantSheet)
      
      // Process the data using the mappings
      const processedData = this.processDataWithMappings(relevantSheet, mappings)
      
      // Generate CSV
      const csvData = this.generateCSV(processedData.rows)
      
      // Generate summary report
      const summaryReport = this.generateSummaryReport(processedData)

      return {
        csvData,
        summaryReport,
        originalResponse: JSON.stringify(processedData, null, 2),
        mappedFields: mappings,
        confidence: processedData.confidence,
        warnings: processedData.warnings
      }
    } catch (error) {
      console.error('Error processing sheet data:', error)
      throw new Error('Failed to process sheet data: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  private static findMostRelevantSheet(sheets: SheetData[]): SheetData {
    // Score each sheet based on relevant column headers
    const relevantTerms = ['client', 'job', 'shift', 'date', 'time', 'employee', 'worker', 'name']
    
    const sheetScores = sheets.map(sheet => {
      const headerText = sheet.headers.join(' ').toLowerCase()
      const score = relevantTerms.reduce((sum, term) => 
        sum + (headerText.includes(term) ? 1 : 0), 0
      )
      return { sheet, score }
    })

    // Return the sheet with the highest score
    const bestSheet = sheetScores.reduce((best, current) => 
      current.score > best.score ? current : best
    )

    return bestSheet.sheet
  }

  private static async generateFieldMappings(sheet: SheetData): Promise<Record<string, string>> {
    // This would call Gemini API to analyze headers and suggest mappings
    // For now, using simple heuristic matching
    const mappings: Record<string, string> = {}
    
    sheet.headers.forEach(header => {
      const normalized = header.toLowerCase()
      if (normalized.includes('client')) mappings[header] = 'client_name'
      else if (normalized.includes('job')) mappings[header] = 'job_name'
      else if (normalized.includes('date')) mappings[header] = 'shift_date'
      else if (normalized.includes('start')) mappings[header] = 'shift_start_time'
      else if (normalized.includes('end')) mappings[header] = 'shift_end_time'
      else if (normalized.includes('employee')) mappings[header] = 'employee_name'
      else if (normalized.includes('type') || normalized.includes('role')) mappings[header] = 'worker_type'
      else if (normalized.includes('note')) mappings[header] = 'notes'
    })

    return mappings
  }

  private static processDataWithMappings(
    sheet: SheetData, 
    mappings: Record<string, string>
  ): {
    rows: Record<string, string>[]
    confidence: number
    warnings: string[]
  } {
    const processedRows: Record<string, string>[] = []
    const warnings: string[] = []
    let totalConfidence = 0

    sheet.rows.forEach((row, rowIndex) => {
      const processedRow: Record<string, string> = {}
      let rowConfidence = 1.0
      let hasRequiredFields = true

      // Process each cell according to its mapped field
      sheet.headers.forEach((header, colIndex) => {
        const targetField = mappings[header]
        if (!targetField) return

        const value = row[colIndex]?.toString() || ''

        switch (targetField) {
          case 'shift_date':
          case 'shift_start_time':
          case 'shift_end_time': {
            const { date, time } = this.cleanDateTime(value)
            if (targetField === 'shift_date') {
              processedRow[targetField] = date
              if (!date) {
                warnings.push(`Row ${rowIndex + 1}: Invalid date format in column ${header}`)
                rowConfidence *= 0.8
                hasRequiredFields = false
              }
            } else {
              processedRow[targetField] = time
              if (!time) {
                warnings.push(`Row ${rowIndex + 1}: Invalid time format in column ${header}`)
                rowConfidence *= 0.8
                hasRequiredFields = false
              }
            }
            break
          }
          case 'worker_type': {
            const standardized = this.standardizeWorkerType(value)
            processedRow[targetField] = standardized
            if (!['CC', 'SH', 'FO', 'RFO', 'RG', 'GL'].includes(standardized)) {
              warnings.push(`Row ${rowIndex + 1}: Invalid worker type "${value}" in column ${header}`)
              rowConfidence *= 0.8
              hasRequiredFields = false
            }
            break
          }
          default:
            processedRow[targetField] = value.trim()
            if (!value.trim() && targetField !== 'notes') {
              warnings.push(`Row ${rowIndex + 1}: Missing required value in column ${header}`)
              rowConfidence *= 0.8
              hasRequiredFields = false
            }
        }
      })

      if (hasRequiredFields) {
        processedRows.push(processedRow)
        totalConfidence += rowConfidence
      }
    })

    return {
      rows: processedRows,
      confidence: processedRows.length > 0 ? totalConfidence / processedRows.length : 0,
      warnings
    }
  }

  private static generateCSV(rows: Record<string, string>[]): string {
    const headers = ['client_name', 'job_name', 'shift_date', 'shift_start_time', 'shift_end_time', 'employee_name', 'worker_type', 'notes']
    
    const csvRows = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ]

    return csvRows.join('\n')
  }

  private static generateSummaryReport(data: { rows: Record<string, string>[]; confidence: number; warnings: string[] }): string {
    const totalRows = data.rows.length
    const warningCount = data.warnings.length
    const confidence = (data.confidence * 100).toFixed(1)

    return `Processing Summary:
===============================
Total Rows Processed: ${totalRows}
Overall Confidence: ${confidence}%
Warnings: ${warningCount}

Data Quality:
------------
✓ Valid Rows: ${totalRows}
⚠ Warnings: ${warningCount}

Field Statistics:
----------------
${this.generateFieldStats(data.rows)}

${warningCount > 0 ? `\nWarnings:\n---------\n${data.warnings.join('\n')}` : ''}

Processing completed successfully.`
  }

  private static generateFieldStats(rows: Record<string, string>[]): string {
    const fields = ['client_name', 'job_name', 'shift_date', 'shift_start_time', 'shift_end_time', 'employee_name', 'worker_type', 'notes']
    
    return fields.map(field => {
      const filledCount = rows.filter(row => row[field]).length
      const percentage = ((filledCount / rows.length) * 100).toFixed(1)
      return `${field}: ${filledCount}/${rows.length} (${percentage}% filled)`
    }).join('\n')
  }
}
