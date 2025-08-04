import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { Buffer } from 'buffer';

// Configuration for Excel cell locations
const config = {
  // Company Information
  companyName: 'A12',
  companyAddress: 'A13',
  companyPhone: 'A14',
  companyEmail: 'A15',
  companyWebsite: 'A16',
  
  // Job Information
  jobNumber: 'B6',
  jobName: 'B7',
  jobDescription: 'B9',
  jobBudget: 'B10',
  jobStartDate: 'B11',
  jobEndDate: 'B12',
  
  // Shift Information
  shiftLocation: 'B8',
  shiftDate: 'E6',
  shiftStartTime: 'E7',
  shiftEndTime: 'E8',
  shiftDescription: 'E9',
  shiftNotes: 'E10',
  
  // Client Information
  clientContact: 'F12',
  clientSignature: 'K12',
  
  // Employee Data Grid
  employeeData: {
    startRow: 15,        // Start employees at row 15 to give more space for header info
    nameColumn: 3,       // C column - Employee Name
    workerTypeColumn: 4, // D column - Worker Type
    initialsColumn: 5,   // E column - Employee Initials  
    in1Column: 6,        // F column - Clock In #1
    out1Column: 7,       // G column - Clock Out #1
    in2Column: 8,        // H column - Clock In #2
    out2Column: 9,       // I column - Clock Out #2
    in3Column: 10,       // J column - Clock In #3
    out3Column: 11,      // K column - Clock Out #3
    regularColumn: 12,   // L column - Regular Hours
    otColumn: 13,        // M column - Overtime Hours
  }
};

export async function generateTimesheetExcel(timesheetId: string): Promise<ExcelJS.Workbook> {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    include: {
      shift: {
        include: {
          job: { include: { company: true } },
          assignedPersonnel: {
            include: {
              user: true,
              timeEntries: { orderBy: { createdAt: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!timesheet || !timesheet.shift || !timesheet.shift.job) {
    throw new Error('Timesheet not found or data is incomplete');
  }

  const workbook = new ExcelJS.Workbook();
  const templatePath = path.resolve(process.cwd(), 'public/templates/timesheet-template.xlsx');

  if (fs.existsSync(templatePath)) {
    await workbook.xlsx.readFile(templatePath);
  }
  
  const worksheet = workbook.getWorksheet(1) || workbook.addWorksheet('Timesheet');

  // Populate Company Information
  const company = timesheet.shift.job.company;
  worksheet.getCell(config.companyName).value = company.name;
  worksheet.getCell(config.companyAddress).value = company.address || '';
  worksheet.getCell(config.companyPhone).value = company.phone || '';
  worksheet.getCell(config.companyEmail).value = company.email || '';
  worksheet.getCell(config.companyWebsite).value = company.website || '';

  // Populate Job Information
  const job = timesheet.shift.job;
  worksheet.getCell(config.jobNumber).value = job.id || job.name; // Job ID or name as job number
  worksheet.getCell(config.jobName).value = job.name;
  worksheet.getCell(config.jobDescription).value = job.description || '';
  worksheet.getCell(config.jobBudget).value = job.budget || '';
  
  // Format job dates
  if (job.startDate) {
    const startDateCell = worksheet.getCell(config.jobStartDate);
    startDateCell.value = new Date(job.startDate);
    startDateCell.numFmt = 'mm/dd/yyyy';
  }
  if (job.endDate) {
    const endDateCell = worksheet.getCell(config.jobEndDate);
    endDateCell.value = new Date(job.endDate);
    endDateCell.numFmt = 'mm/dd/yyyy';
  }

  // Populate Shift Information
  const shift = timesheet.shift;
  worksheet.getCell(config.shiftLocation).value = shift.location || job.location || '';
  
  // Format shift date and times
  const dateCell = worksheet.getCell(config.shiftDate);
  dateCell.value = new Date(shift.date);
  dateCell.numFmt = 'mm/dd/yyyy';
  
  if (shift.startTime) {
    const startTimeCell = worksheet.getCell(config.shiftStartTime);
    startTimeCell.value = new Date(shift.startTime);
    startTimeCell.numFmt = 'h:mm AM/PM';
  }
  if (shift.endTime) {
    const endTimeCell = worksheet.getCell(config.shiftEndTime);
    endTimeCell.value = new Date(shift.endTime);
    endTimeCell.numFmt = 'h:mm AM/PM';
  }
  
  worksheet.getCell(config.shiftDescription).value = shift.description || '';
  worksheet.getCell(config.shiftNotes).value = shift.notes || '';

  // Populate Client Information (if available)
  worksheet.getCell(config.clientContact).value = company.name || 'N/A';

  // Add client signature if available
  if (timesheet.company_signature) {
    try {
      const signatureImage = workbook.addImage({
        buffer: Buffer.from(timesheet.company_signature.split('base64,')[1], 'base64'),
        extension: 'png',
      });
      worksheet.addImage(signatureImage, {
        tl: { col: 10, row: 11 }, // Corresponds to K12
        ext: { width: 150, height: 75 }
      });
    } catch (error) {
      console.warn('Failed to add signature to Excel:', error);
    }
  }

  // Calculate total hours for tracking
  let totalRegularHours = 0;
  let totalOTHours = 0;

  // Populate employee data
  timesheet.shift.assignedPersonnel.forEach((employee, index) => {
    const row = config.employeeData.startRow + index;
    
    // Employee info
    worksheet.getCell(row, config.employeeData.nameColumn).value = employee.user.name;
    
    // Role mapping
    const roleMap: Record<string, string> = {
      'CC': 'Crew Chief',
      'SH': 'Stage Hand', 
      'FO': 'Fork Operator',
      'RFO': 'Reach Fork Operator',
      'RG': 'Rigger',
      'GL': 'General Labor'
    };
    worksheet.getCell(row, config.employeeData.workerTypeColumn).value = roleMap[employee.roleCode] || employee.roleCode;
    
    // Initials
    const initials = employee.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    worksheet.getCell(row, config.employeeData.initialsColumn).value = initials;

    // Sort time entries by entry number
    const sortedEntries = employee.timeEntries.sort((a, b) => (a.entryNumber || 1) - (b.entryNumber || 1));
    
    // Calculate total hours for this employee
    let employeeTotalHours = 0;

    // Populate up to 3 time entry pairs
    sortedEntries.forEach((entry, entryIndex) => {
      if (entryIndex < 3 && entry.clockIn && entry.clockOut) { // Max 3 entries
        const clockIn = new Date(entry.clockIn);
        const clockOut = new Date(entry.clockOut);
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        employeeTotalHours += hours;

        // Set the appropriate in/out columns based on entry number with time formatting
        if (entryIndex === 0) { // First entry
          const in1Cell = worksheet.getCell(row, config.employeeData.in1Column);
          const out1Cell = worksheet.getCell(row, config.employeeData.out1Column);
          in1Cell.value = clockIn;
          in1Cell.numFmt = 'h:mm AM/PM';
          out1Cell.value = clockOut;
          out1Cell.numFmt = 'h:mm AM/PM';
        } else if (entryIndex === 1) { // Second entry
          const in2Cell = worksheet.getCell(row, config.employeeData.in2Column);
          const out2Cell = worksheet.getCell(row, config.employeeData.out2Column);
          in2Cell.value = clockIn;
          in2Cell.numFmt = 'h:mm AM/PM';
          out2Cell.value = clockOut;
          out2Cell.numFmt = 'h:mm AM/PM';
        } else if (entryIndex === 2) { // Third entry
          const in3Cell = worksheet.getCell(row, config.employeeData.in3Column);
          const out3Cell = worksheet.getCell(row, config.employeeData.out3Column);
          in3Cell.value = clockIn;
          in3Cell.numFmt = 'h:mm AM/PM';
          out3Cell.value = clockOut;
          out3Cell.numFmt = 'h:mm AM/PM';
        }
      }
    });

    // Calculate regular vs overtime (8 hours regular, rest OT)
    const regularHours = Math.min(employeeTotalHours, 8);
    const otHours = Math.max(employeeTotalHours - 8, 0);

    // Format hours columns
    const regularCell = worksheet.getCell(row, config.employeeData.regularColumn);
    const otCell = worksheet.getCell(row, config.employeeData.otColumn);
    
    regularCell.value = Math.round(regularHours * 100) / 100;
    regularCell.numFmt = '0.00';
    otCell.value = Math.round(otHours * 100) / 100;
    otCell.numFmt = '0.00';

    totalRegularHours += regularHours;
    totalOTHours += otHours;
  });

  // Add totals row if there are employees
  if (timesheet.shift.assignedPersonnel.length > 0) {
    const totalsRow = config.employeeData.startRow + timesheet.shift.assignedPersonnel.length;
    worksheet.getCell(totalsRow, config.employeeData.workerTypeColumn).value = 'TOTAL HOURS:';
    
    // Format totals with proper number formatting
    const totalRegularCell = worksheet.getCell(totalsRow, config.employeeData.regularColumn);
    const totalOtCell = worksheet.getCell(totalsRow, config.employeeData.otColumn);
    
    totalRegularCell.value = Math.round(totalRegularHours * 100) / 100;
    totalRegularCell.numFmt = '0.00';
    totalOtCell.value = Math.round(totalOTHours * 100) / 100;
    totalOtCell.numFmt = '0.00';
    
    // Style the totals row
    const totalRowRange = worksheet.getRow(totalsRow);
    totalRowRange.font = { bold: true };
    totalRowRange.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
  }

  return workbook;
}