import { prisma } from '@/lib/prisma';
import { uploadToGCS } from '@/lib/gcs';
import { PrismaClient } from '@prisma/client';
import { Buffer } from 'buffer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PDFElement {
  id: string;
  type: 'text' | 'table' | 'signature' | 'image';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataKey?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  required: boolean;
}

interface PDFConfiguration {
  id: string;
  name: string;
  pageSize: 'letter' | 'a4';
  pageOrientation: 'portrait' | 'landscape';
  elements: PDFElement[];
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetPDFOptions {
  includeSignature?: boolean;
  signatureType?: 'company' | 'manager' | 'both';
  uploadToCloud?: boolean;
  templateId?: string; // New option to specify template
}

/**
 * Template-based PDF generation for timesheets
 */
export class TemplatePDFGenerator {
  private timesheetId: string;
  private tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
  private template: PDFConfiguration | null = null;

  constructor(
    timesheetId: string, 
    tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
  ) {
    this.timesheetId = timesheetId;
    this.tx = tx;
  }

  /**
   * Load PDF template configuration
   */
  private async loadTemplate(templateId?: string): Promise<PDFConfiguration> {
    if (this.template) return this.template;

    // For now, return the default template
    // In a real implementation, you'd load from database based on templateId
    this.template = await this.getDefaultTemplate();
    return this.template;
  }

  /**
   * Get default template configuration
   */
  private async getDefaultTemplate(): Promise<PDFConfiguration> {
    return {
      id: 'timesheet-default',
      name: 'Timesheet Default Configuration',
      pageSize: 'letter',
      pageOrientation: 'portrait',
      elements: [
        {
          id: 'header-title',
          type: 'text',
          label: 'HOLI TIMESHEET',
          x: 306,
          y: 60,
          width: 200,
          height: 30,
          fontSize: 24,
          fontWeight: 'bold',
          required: true,
          dataKey: 'headerTitle'
        },
        {
          id: 'job-number',
          type: 'text',
          label: 'Job#:',
          x: 50,
          y: 100,
          width: 50,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'jobNumberLabel'
        },
        {
          id: 'job-value',
          type: 'text',
          label: 'Job Value',
          x: 100,
          y: 100,
          width: 200,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'jobName'
        },
        {
          id: 'customer-label',
          type: 'text',
          label: 'Customer:',
          x: 50,
          y: 120,
          width: 60,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerLabel'
        },
        {
          id: 'customer-value',
          type: 'text',
          label: 'Customer Value',
          x: 110,
          y: 120,
          width: 200,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerName'
        },
        {
          id: 'date-label',
          type: 'text',
          label: 'Date:',
          x: 350,
          y: 100,
          width: 40,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'dateLabel'
        },
        {
          id: 'date-value',
          type: 'text',
          label: 'Date Value',
          x: 400,
          y: 100,
          width: 100,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'dateValue'
        },
        {
          id: 'employee-table',
          type: 'table',
          label: 'Employee Table',
          x: 50,
          y: 180,
          width: 500,
          height: 200,
          fontSize: 8,
          fontWeight: 'normal',
          required: true,
          dataKey: 'employeeTable'
        },
        {
          id: 'customer-sig-label',
          type: 'text',
          label: 'Customer Signature:',
          x: 50,
          y: 400,
          width: 120,
          height: 20,
          fontSize: 12,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerSignatureLabel'
        },
        {
          id: 'customer-sig-box',
          type: 'signature',
          label: 'Customer Signature Box',
          x: 50,
          y: 420,
          width: 200,
          height: 40,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerSignature'
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate PDF using template
   */
  async generatePDF(options: TimesheetPDFOptions = {}): Promise<Buffer> {
    const db = this.tx || prisma;
    const timesheet = await this.getTimesheetData(db);
    const template = await this.loadTemplate(options.templateId);
    
    return await this.createPDFFromTemplate(timesheet, template, options);
  }

  /**
   * Create PDF buffer from template configuration
   */
  private async createPDFFromTemplate(
    timesheet: any, 
    template: PDFConfiguration, 
    options: TimesheetPDFOptions
  ): Promise<Buffer> {
    // Create PDF with template settings
    const pdf = new jsPDF(
      template.pageOrientation as 'portrait' | 'landscape',
      'pt',
      template.pageSize.toUpperCase() as 'LETTER' | 'A4'
    );

    // Prepare data for template
    const templateData = this.prepareTemplateData(timesheet, options);

    // Render each element according to template
    for (const element of template.elements) {
      await this.renderElement(pdf, element, templateData, timesheet);
    }

    // Convert to buffer
    const pdfArrayBuffer = pdf.output('arraybuffer');
    return Buffer.from(pdfArrayBuffer);
  }

  /**
   * Prepare data for template rendering
   */
  private prepareTemplateData(timesheet: any, options: TimesheetPDFOptions): Record<string, any> {
    return {
      headerTitle: 'HOLI TIMESHEET',
      jobNumberLabel: 'Job#:',
      jobName: timesheet.shift?.job?.name || 'N/A',
      customerLabel: 'Customer:',
      customerName: timesheet.shift?.job?.company?.name || 'N/A',
      dateLabel: 'Date:',
      dateValue: this.formatDate(timesheet.shift?.date),
      locationLabel: 'Location:',
      locationValue: timesheet.shift?.location || 'N/A',
      startTimeLabel: 'Start Time:',
      startTimeValue: this.formatTime(timesheet.shift?.startTime),
      endTimeLabel: 'End Time:',
      endTimeValue: this.formatTime(timesheet.shift?.endTime),
      customerSignatureLabel: 'Customer Signature:',
      customerSignature: options.includeSignature ? '[Signed]' : '[Signature Required]',
      employeeTable: this.prepareEmployeeTableData(timesheet)
    };
  }

  /**
   * Render individual element based on type
   */
  private async renderElement(
    pdf: jsPDF, 
    element: PDFElement, 
    data: Record<string, any>,
    timesheet: any
  ): Promise<void> {
    const value = data[element.dataKey || ''];

    switch (element.type) {
      case 'text':
        this.renderTextElement(pdf, element, value);
        break;
      case 'table':
        this.renderTableElement(pdf, element, value, timesheet);
        break;
      case 'signature':
        this.renderSignatureElement(pdf, element, value);
        break;
      case 'image':
        // Placeholder for image rendering
        this.renderImagePlaceholder(pdf, element);
        break;
    }
  }

  /**
   * Render text element
   */
  private renderTextElement(pdf: jsPDF, element: PDFElement, value: string): void {
    pdf.setFontSize(element.fontSize || 12);
    pdf.setFont('helvetica', element.fontWeight || 'normal');
    
    // Handle text alignment based on element position
    const text = value || element.label;
    pdf.text(text, element.x, element.y, {
      maxWidth: element.width
    });
  }

  /**
   * Render table element
   */
  private renderTableElement(pdf: jsPDF, element: PDFElement, tableData: any[], timesheet: any): void {
    if (element.dataKey === 'employeeTable') {
      // Prepare table data
      const headers = ['Name', 'Role', 'Initials', 'In #1', 'Out #1', 'In #2', 'Out #2', 'In #3', 'Out #3', 'Reg Hrs', 'OT Hrs'];
      const rows: any[] = [];

      timesheet.shift.assignedPersonnel.forEach((employee: any) => {
        if (!employee.user) return;

        // Calculate hours and time entries
        let employeeTotalHours = 0;
        const timeEntries = employee.timeEntries.sort((a: any, b: any) => (a.entryNumber || 1) - (b.entryNumber || 1));
        
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

        const regularHours = Math.min(employeeTotalHours, 8);
        const otHours = Math.max(employeeTotalHours - 8, 0);

        const roleMap: Record<string, string> = {
          'CC': 'Crew Chief',
          'SH': 'Stage Hand', 
          'FO': 'Fork Operator',
          'RFO': 'Reach Fork Operator',
          'RG': 'Rigger',
          'GL': 'General Labor'
        };

        const initials = employee.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();

        rows.push([
          employee.user.name,
          roleMap[employee.roleCode] || employee.roleCode,
          initials,
          ...timeSlots,
          regularHours.toFixed(2),
          otHours.toFixed(2)
        ]);
      });

      // Render table using autoTable
      pdf.autoTable({
        head: [headers],
        body: rows,
        startY: element.y,
        margin: { left: element.x },
        styles: {
          fontSize: element.fontSize || 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 80 }, // Name
          1: { cellWidth: 60 }, // Role
          2: { cellWidth: 40 }, // Initials
          3: { cellWidth: 35 }, // In #1
          4: { cellWidth: 35 }, // Out #1
          5: { cellWidth: 35 }, // In #2
          6: { cellWidth: 35 }, // Out #2
          7: { cellWidth: 35 }, // In #3
          8: { cellWidth: 35 }, // Out #3
          9: { cellWidth: 40 }, // Reg Hrs
          10: { cellWidth: 40 }, // OT Hrs
        }
      });
    }
  }

  /**
   * Render signature element
   */
  private renderSignatureElement(pdf: jsPDF, element: PDFElement, value: string): void {
    // Draw signature box
    pdf.rect(element.x, element.y, element.width, element.height);
    
    // Add signature text or placeholder
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    if (value && value !== '[Signature Required]') {
      pdf.text(value, element.x + 5, element.y + element.height / 2);
    } else {
      pdf.text('Signature', element.x + 5, element.y + element.height + 10);
    }
  }

  /**
   * Render image placeholder
   */
  private renderImagePlaceholder(pdf: jsPDF, element: PDFElement): void {
    pdf.rect(element.x, element.y, element.width, element.height);
    pdf.setFontSize(8);
    pdf.text('[Image]', element.x + 5, element.y + element.height / 2);
  }

  /**
   * Prepare employee table data
   */
  private prepareEmployeeTableData(timesheet: any): any[] {
    const tableData: any[] = [];
    
    timesheet.shift.assignedPersonnel.forEach((employee: any) => {
      if (!employee.user) return;

      let employeeTotalHours = 0;
      const timeEntries = employee.timeEntries.sort((a: any, b: any) => (a.entryNumber || 1) - (b.entryNumber || 1));
      
      timeEntries.forEach((entry: any) => {
        if (entry.clockIn && entry.clockOut) {
          const clockIn = new Date(entry.clockIn);
          const clockOut = new Date(entry.clockOut);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          employeeTotalHours += hours;
        }
      });

      tableData.push({
        name: employee.user.name,
        role: employee.roleCode,
        hours: employeeTotalHours,
        timeEntries: timeEntries
      });
    });

    return tableData;
  }

  /**
   * Get timesheet data with all relations
   */
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

  /**
   * Format date for display
   */
  private formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Format time for display
   */
  private formatTime(timeString: string | null): string {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

// Convenience functions for backward compatibility
export async function generateTemplateBasedPDF(
  timesheetId: string,
  options: TimesheetPDFOptions = {},
  tx?: any
): Promise<string> {
  const generator = new TemplatePDFGenerator(timesheetId, tx);
  const pdfBuffer = await generator.generatePDF(options);
  
  // Store as base64 or upload to GCS
  if (process.env.GCS_AVATAR_BUCKET && options.uploadToCloud) {
    const destination = `timesheets/${timesheetId}/template-timesheet.pdf`;
    return await uploadToGCS(pdfBuffer, destination, 'application/pdf');
  } else {
    return `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
  }
}