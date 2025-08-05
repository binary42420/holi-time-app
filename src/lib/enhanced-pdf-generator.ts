import { prisma } from '@/lib/prisma';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import { uploadToGCS } from '@/lib/gcs';
import { PrismaClient } from '@prisma/client';
import { Buffer } from 'buffer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { TemplatePDFGenerator } from '@/lib/template-pdf-generator';
import { PDFTemplateStorage } from '@/lib/pdf-template-storage';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface TimesheetPDFOptions {
  includeSignature?: boolean;
  signatureType?: 'company' | 'manager' | 'both';
  uploadToCloud?: boolean;
  useTemplate?: boolean; // New option to use template-based generation
  templateId?: string; // Specify which template to use
}

/**
 * Enhanced PDF generation for timesheets with proper workflow handling
 */
export class TimesheetPDFGenerator {
  private timesheetId: string;
  private tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

  constructor(
    timesheetId: string, 
    tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
  ) {
    this.timesheetId = timesheetId;
    this.tx = tx;
  }

  /**
   * Generate unsigned PDF (for initial timesheet creation)
   */
  async generateUnsignedPDF(options: TimesheetPDFOptions = {}): Promise<string> {
    const db = this.tx || prisma;
    
    let pdfBuffer: Buffer;
    
    if (options.useTemplate) {
      // Use template-based generation
      const templateGenerator = new TemplatePDFGenerator(this.timesheetId, this.tx);
      pdfBuffer = await templateGenerator.generatePDF({
        includeSignature: false,
        templateId: options.templateId
      });
    } else {
      // Use legacy generation
      const timesheet = await this.getTimesheetData(db);
      pdfBuffer = await this.createPDFBuffer(timesheet, { includeSignature: false });
    }
    
    // Store as base64 in database
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    
    await db.timesheet.update({
      where: { id: this.timesheetId },
      data: { unsigned_pdf_url: pdfDataUrl }
    });

    return pdfDataUrl;
  }

  /**
   * Generate signed PDF (after company approval)
   */
  async generateSignedPDF(options: TimesheetPDFOptions = {}): Promise<string> {
    const db = this.tx || prisma;
    
    const timesheet = await this.getTimesheetData(db);
    
    if (!timesheet.company_signature) {
      throw new Error('Cannot generate signed PDF without company signature');
    }

    let pdfBuffer: Buffer;
    
    if (options.useTemplate) {
      // Use template-based generation
      const templateGenerator = new TemplatePDFGenerator(this.timesheetId, this.tx);
      pdfBuffer = await templateGenerator.generatePDF({
        includeSignature: true,
        signatureType: 'company',
        templateId: options.templateId
      });
    } else {
      // Use legacy generation
      pdfBuffer = await this.createPDFBuffer(timesheet, { 
        includeSignature: true,
        signatureType: 'company'
      });
    }

    let finalUrl: string;

    // Upload to GCS if available, otherwise store as base64
    if (process.env.GCS_AVATAR_BUCKET) {
      const destination = `timesheets/${this.timesheetId}/signed-timesheet.pdf`;
      finalUrl = await uploadToGCS(pdfBuffer, destination, 'application/pdf');
    } else {
      finalUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    }
    
    await db.timesheet.update({
      where: { id: this.timesheetId },
      data: { signed_pdf_url: finalUrl }
    });

    return finalUrl;
  }

  /**
   * Generate final PDF (after manager approval)
   */
  async generateFinalPDF(): Promise<string> {
    const db = this.tx || prisma;
    
    const timesheet = await this.getTimesheetData(db);
    
    const pdfBuffer = await this.createPDFBuffer(timesheet, { 
      includeSignature: true,
      signatureType: 'both'
    });

    let finalUrl: string;

    // Upload to GCS if available, otherwise store as base64
    if (process.env.GCS_AVATAR_BUCKET) {
      const destination = `timesheets/${this.timesheetId}/final-timesheet.pdf`;
      finalUrl = await uploadToGCS(pdfBuffer, destination, 'application/pdf');
    } else {
      finalUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    }
    
    // Update the signed_pdf_url with the final version
    await db.timesheet.update({
      where: { id: this.timesheetId },
      data: { signed_pdf_url: finalUrl }
    });

    return finalUrl;
  }

  /**
   * Get PDF buffer for download
   */
  async getPDFBuffer(preferSigned: boolean = true): Promise<Buffer> {
    const db = this.tx || prisma;
    const timesheet = await this.getTimesheetData(db);
    
    // Check if we have cached PDFs
    if (preferSigned && timesheet.signed_pdf_url) {
      if (timesheet.signed_pdf_url.startsWith('data:application/pdf;base64,')) {
        const base64Data = timesheet.signed_pdf_url.split('base64,')[1];
        return Buffer.from(base64Data, 'base64');
      } else {
        // It's a GCS URL, we need to generate fresh PDF
        return await this.createPDFBuffer(timesheet, { 
          includeSignature: true,
          signatureType: timesheet.manager_signature ? 'both' : 'company'
        });
      }
    }
    
    if (timesheet.unsigned_pdf_url && timesheet.unsigned_pdf_url.startsWith('data:application/pdf;base64,')) {
      const base64Data = timesheet.unsigned_pdf_url.split('base64,')[1];
      return Buffer.from(base64Data, 'base64');
    }
    
    // Generate fresh PDF
    return await this.createPDFBuffer(timesheet, { 
      includeSignature: !!timesheet.company_signature,
      signatureType: timesheet.manager_signature ? 'both' : 'company'
    });
  }

  private async getTimesheetData(db: any) {
    const timesheet = await db.timesheet.findUnique({
      where: { id: this.timesheetId },
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

    return timesheet;
  }

  private async createPDFBuffer(timesheet: any, options: TimesheetPDFOptions): Promise<Buffer> {
    const pdf = new jsPDF('portrait', 'pt', 'letter');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Set up fonts and colors
    pdf.setFont('helvetica');

    // Header - HOLI TIMESHEET
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HOLI TIMESHEET', pageWidth / 2, 60, { align: 'center' });

    // Company info section
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Left side - Customer info
    let yPos = 100;
    pdf.text('Job#:', 50, yPos);
    pdf.text(timesheet.shift?.job?.name || 'N/A', 100, yPos);

    yPos += 20;
    pdf.text('Customer:', 50, yPos);
    pdf.text(timesheet.shift?.job?.company?.name || 'N/A', 100, yPos);

    yPos += 20;
    pdf.text('Location:', 50, yPos);
    pdf.text(timesheet.shift?.location || 'N/A', 100, yPos);

    // Right side - Date/Time info
    yPos = 100;
    pdf.text('Date:', 350, yPos);
    pdf.text(this.formatDate(timesheet.shift?.date), 400, yPos);

    yPos += 20;
    pdf.text('Start Time:', 350, yPos);
    pdf.text(this.formatTime(timesheet.shift?.startTime), 420, yPos);

    yPos += 20;
    pdf.text('End Time:', 350, yPos);
    pdf.text(this.formatTime(timesheet.shift?.endTime), 420, yPos);

    // Prepare employee data for table
    const tableData: any[] = [];
    let totalRegularHours = 0;
    let totalOTHours = 0;

    timesheet.shift.assignedPersonnel.forEach((employee: any) => {
      if (!employee.user) return;

      // Calculate total hours for this employee
      let employeeTotalHours = 0;
      const timeEntries = employee.timeEntries.sort((a: any, b: any) => (a.entryNumber || 1) - (b.entryNumber || 1));
      
      // Format time entries (up to 3 pairs)
      const timeSlots = ['', '', '', '', '', ''];
      timeEntries.forEach((entry: any, index: number) => {
        if (index < 3 && entry.clockIn && entry.clockOut) {
          const clockIn = new Date(entry.clockIn);
          const clockOut = new Date(entry.clockOut);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          employeeTotalHours += hours;

          timeSlots[index * 2] = this.formatTime(entry.clockIn);
          timeSlots[index * 2 + 1] = this.formatTime(entry.clockOut);
        }
      });

      // Calculate regular vs overtime (8 hours regular, rest OT)
      const regularHours = Math.min(employeeTotalHours, 8);
      const otHours = Math.max(employeeTotalHours - 8, 0);

      totalRegularHours += regularHours;
      totalOTHours += otHours;

      // Role mapping
      const roleMap: Record<string, string> = {
        'CC': 'Crew Chief',
        'SH': 'Stage Hand', 
        'FO': 'Fork Operator',
        'RFO': 'Reach Fork Operator',
        'RG': 'Rigger',
        'GL': 'General Labor'
      };

      const initials = employee.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();

      tableData.push([
        employee.user.name,
        roleMap[employee.roleCode] || employee.roleCode,
        initials,
        timeSlots[0], // In #1
        timeSlots[1], // Out #1
        timeSlots[2], // In #2
        timeSlots[3], // Out #2
        timeSlots[4], // In #3
        timeSlots[5], // Out #3
        regularHours.toFixed(2),
        otHours.toFixed(2)
      ]);
    });

    // Add totals row
    tableData.push([
      '', '', '', '', '', '', '', '', 'TOTAL HOURS:',
      totalRegularHours.toFixed(2),
      totalOTHours.toFixed(2)
    ]);

    // Create table using autoTable
    pdf.autoTable({
      startY: 180,
      head: [['Employee Name', 'Worker Type', 'Initials', 'In #1', 'Out #1', 'In #2', 'Out #2', 'In #3', 'Out #3', 'Regular', 'OT']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      didParseCell: function(data: any) {
        // Style the totals row
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Get final Y position after table
    const finalY = (pdf as any).lastAutoTable.finalY || 400;

    // Customer signature section
    let signatureY = finalY + 40;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    pdf.text('Customer Name: ________________________________', 50, signatureY);

    signatureY += 40;
    pdf.text('Customer Signature:', 50, signatureY);

    // Add company signature if available and requested
    if (options.includeSignature && timesheet.company_signature && 
        (options.signatureType === 'company' || options.signatureType === 'both')) {
      try {
        pdf.addImage(timesheet.company_signature, 'PNG', 150, signatureY - 20, 200, 40);
      } catch (error) {
        console.warn('Failed to add company signature to PDF:', error);
      }
    }

    signatureY += 60;
    pdf.text('Date: ________________', 50, signatureY);

    // Manager signature section (if available and requested)
    if (options.includeSignature && timesheet.manager_signature && 
        (options.signatureType === 'manager' || options.signatureType === 'both')) {
      signatureY += 40;
      pdf.text('Manager Signature:', 50, signatureY);

      try {
        pdf.addImage(timesheet.manager_signature, 'PNG', 150, signatureY - 20, 200, 40);
      } catch (error) {
        console.warn('Failed to add manager signature to PDF:', error);
      }
    }

    // Footer
    const footerY = pageHeight - 80;
    pdf.setFontSize(8);
    pdf.text('HANDS ON LABOR INTERNATIONAL', pageWidth / 2, footerY, { align: 'center' });
    pdf.text('Phone: (555) 123-4567 • Fax: (555) 123-4568', pageWidth / 2, footerY + 15, { align: 'center' });
    pdf.text('123 Labor Street, Work City, ST 12345', pageWidth / 2, footerY + 30, { align: 'center' });

    pdf.text('White Copy - HANDS ON, Yellow Copy - Customer', pageWidth / 2, footerY + 45, { align: 'center' });

    // Generate PDF buffer
    return Buffer.from(pdf.output('arraybuffer'));
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US');
  }

  private formatTime(time: Date | string | null | undefined): string {
    if (!time) return '';
    const t = new Date(time);
    return t.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
}

/**
 * Convenience function for generating unsigned PDF
 */
export async function generateUnsignedTimesheetPdf(
  timesheetId: string,
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  options: TimesheetPDFOptions = {}
): Promise<string> {
  const generator = new TimesheetPDFGenerator(timesheetId, tx);
  
  // Default to using templates for new PDFs
  const pdfOptions = { useTemplate: true, ...options };
  
  return await generator.generateUnsignedPDF(pdfOptions);
}

/**
 * Convenience function for generating signed PDF
 */
export async function generateSignedTimesheetPdf(
  timesheetId: string,
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  options: TimesheetPDFOptions = {}
): Promise<string> {
  const generator = new TimesheetPDFGenerator(timesheetId, tx);
  
  // Default to using templates for new PDFs
  const pdfOptions = { useTemplate: true, ...options };
  
  return await generator.generateSignedPDF(pdfOptions);
}

/**
 * Convenience function for generating final PDF
 */
export async function generateFinalTimesheetPdf(
  timesheetId: string,
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  options: TimesheetPDFOptions = {}
): Promise<string> {
  const generator = new TimesheetPDFGenerator(timesheetId, tx);
  
  // Default to using templates for new PDFs
  const pdfOptions = { useTemplate: true, ...options };
  
  return await generator.generateFinalPDF(pdfOptions);
}