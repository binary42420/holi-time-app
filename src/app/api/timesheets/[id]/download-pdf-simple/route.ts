import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: timesheetId } = await params;

    // Get timesheet data
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

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check if user has permission to download this timesheet
    const canAccess = user.role === 'Admin' || user.role === 'Staff' || 
                     (user.role === 'CompanyUser' && timesheet.shift.job.companyId === user.companyId) ||
                     (user.role === 'CrewChief' && timesheet.shift.assignedPersonnel.some(p => p.userId === user.id));

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if we have a cached PDF
    if (timesheet.signed_pdf_url && timesheet.signed_pdf_url.startsWith('data:application/pdf;base64,')) {
      const base64Data = timesheet.signed_pdf_url.split('base64,')[1];
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      
      const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}-signed.pdf`;
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Generate PDF using jsPDF
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
    pdf.text(formatDate(timesheet.shift?.date), 400, yPos);

    yPos += 20;
    pdf.text('Start Time:', 350, yPos);
    pdf.text(formatTime(timesheet.shift?.startTime), 420, yPos);

    yPos += 20;
    pdf.text('End Time:', 350, yPos);
    pdf.text(formatTime(timesheet.shift?.endTime), 420, yPos);

    // Prepare employee data for table
    const tableData: any[] = [];
    let totalRegularHours = 0;
    let totalOTHours = 0;

    timesheet.shift.assignedPersonnel.forEach((employee) => {
      if (!employee.user) return;

      // Calculate total hours for this employee
      let employeeTotalHours = 0;
      const timeEntries = employee.timeEntries.sort((a, b) => (a.entryNumber || 1) - (b.entryNumber || 1));
      
      // Format time entries (up to 3 pairs)
      const timeSlots = ['', '', '', '', '', ''];
      timeEntries.forEach((entry, index) => {
        if (index < 3 && entry.clockIn && entry.clockOut) {
          const clockIn = new Date(entry.clockIn);
          const clockOut = new Date(entry.clockOut);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          employeeTotalHours += hours;

          timeSlots[index * 2] = formatTime(entry.clockIn);
          timeSlots[index * 2 + 1] = formatTime(entry.clockOut);
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

      const initials = employee.user.name.split(' ').map(n => n[0]).join('').toUpperCase();

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

    // Add company signature if available and timesheet is approved
    if (timesheet.status === 'COMPLETED' && timesheet.companySignature) {
      try {
        pdf.addImage(timesheet.companySignature, 'PNG', 150, signatureY - 20, 200, 40);
      } catch (error) {
        console.warn('Failed to add company signature to PDF:', error);
      }
    }

    signatureY += 60;
    pdf.text('Date: ________________', 50, signatureY);

    // Manager signature section (if available)
    if (timesheet.managerSignature) {
      signatureY += 40;
      pdf.text('Manager Signature:', 50, signatureY);

      try {
        pdf.addImage(timesheet.managerSignature, 'PNG', 150, signatureY - 20, 200, 40);
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
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Store PDF in database for future use
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        signed_pdf_url: pdfDataUrl,
      },
    });

    const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}-signed.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US');
}

function formatTime(time: Date | string | null | undefined): string {
  if (!time) return '';
  const t = new Date(time);
  return t.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}