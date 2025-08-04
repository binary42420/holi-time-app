import ExcelJS from 'exceljs'
import { Buffer } from 'buffer'

export async function generateTimesheetExcel(timesheet: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Timesheet')

  // Configure worksheet
  worksheet.pageSetup.paperSize = 9 // A4
  worksheet.pageSetup.orientation = 'portrait'

  // Header information
  worksheet.getCell('A1').value = 'TIMESHEET'
  worksheet.getCell('A1').font = { size: 16, bold: true }
  worksheet.mergeCells('A1:F1')

  // Company information
  worksheet.getCell('A3').value = 'Company:'
  worksheet.getCell('B3').value = timesheet.shift.job.company.name
  worksheet.getCell('A4').value = 'Job:'
  worksheet.getCell('B4').value = timesheet.shift.job.name
  worksheet.getCell('A5').value = 'Date:'
  worksheet.getCell('B5').value = new Date(timesheet.shift.date).toLocaleDateString()
  worksheet.getCell('A6').value = 'Location:'
  worksheet.getCell('B6').value = timesheet.shift.location

  // Time entries header
  worksheet.getCell('A8').value = 'Employee Name'
  worksheet.getCell('B8').value = 'Clock In'
  worksheet.getCell('C8').value = 'Clock Out'
  worksheet.getCell('D8').value = 'Break Time'
  worksheet.getCell('E8').value = 'Total Hours'
  worksheet.getCell('F8').value = 'Rate'

  // Style headers
  const headerRow = worksheet.getRow(8)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // Add employee time entries
  let currentRow = 9
  let totalHours = 0

  for (const personnel of timesheet.shift.assignedPersonnel) {
    const timeEntries = personnel.timeEntries || []
    
    if (timeEntries.length > 0) {
      const entry = timeEntries[0] // Assuming one entry per employee per shift
      const clockIn = entry.clockInTime ? new Date(entry.clockInTime).toLocaleTimeString() : ''
      const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString() : ''
      const breakTime = entry.breakDuration || 0
      const hoursWorked = entry.hoursWorked || 0
      
      worksheet.getCell(`A${currentRow}`).value = personnel.user.name
      worksheet.getCell(`B${currentRow}`).value = clockIn
      worksheet.getCell(`C${currentRow}`).value = clockOut
      worksheet.getCell(`D${currentRow}`).value = `${breakTime} min`
      worksheet.getCell(`E${currentRow}`).value = hoursWorked
      worksheet.getCell(`F${currentRow}`).value = personnel.hourlyRate || 0
      
      totalHours += hoursWorked
      currentRow++
    }
  }

  // Total row
  currentRow += 1
  worksheet.getCell(`D${currentRow}`).value = 'TOTAL HOURS:'
  worksheet.getCell(`E${currentRow}`).value = totalHours
  worksheet.getCell(`D${currentRow}`).font = { bold: true }
  worksheet.getCell(`E${currentRow}`).font = { bold: true }

  // Signature areas
  currentRow += 3
  worksheet.getCell(`A${currentRow}`).value = 'Client Signature:'
  worksheet.getCell(`A${currentRow + 1}`).value = '_'.repeat(30)
  worksheet.getCell(`A${currentRow + 3}`).value = 'Manager Signature:'
  worksheet.getCell(`A${currentRow + 4}`).value = '_'.repeat(30)

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function insertSignatureIntoExcel(excelBuffer: Buffer, signatureDataUrl: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(excelBuffer)
  
  const worksheet = workbook.getWorksheet(1)
  
  // Convert base64 signature to buffer
  const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '')
  const signatureBuffer = Buffer.from(base64Data, 'base64')
  
  // Add signature image
  const imageId = workbook.addImage({
    buffer: signatureBuffer,
    extension: 'png',
  })
  
  // Insert signature at client signature location
  worksheet.addImage(imageId, {
    tl: { col: 1, row: 20 }, // Adjust based on your template
    ext: { width: 200, height: 100 }
  })
  
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function convertExcelToPdf(excelBuffer: Buffer): Promise<Buffer> {
  // This function is deprecated - use jsPDF-based PDF generation instead
  // See /api/timesheets/[id]/download-pdf-simple for the working implementation
  
  console.log('Converting Excel to PDF using jsPDF...')
  
  // For now, return the Excel buffer as placeholder
  // Use the jsPDF implementation in download-pdf-simple route instead
  return excelBuffer
}