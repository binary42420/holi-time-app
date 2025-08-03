import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import jsPDF from 'jspdf';
import { formatTimeTo12Hour, formatDate, getTimeEntryDisplay } from '@/lib/time-utils';

// POST /api/timesheets/[id]/generate-pdf - Generate and store PDF in database
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: timesheetId } = params;

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift: {
          include: {
            job: { include: { company: true } },
            assignedPersonnel: {
              include: {
                user: true,
                timeEntries: { orderBy: { entryNumber: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Group time entries by employee
    const employeeEntries = timesheet.shift.assignedPersonnel.reduce((acc: Record<string, any>, p: any) => {
      if (!acc[p.user.name]) {
        acc[p.user.name] = {
          name: p.user.name,
          role: p.roleOnShift,
          timeEntries: p.timeEntries,
        };
      }
      return acc;
    }, {});

    // Create PDF using jsPDF with Hands On Labor template
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
    pdf.text(formatTimeTo12Hour(timesheet.shift?.startTime?.toISOString()), 420, yPos);

    yPos += 20;
    pdf.text('End Time:', 350, yPos);
    pdf.text(formatTimeTo12Hour(timesheet.shift?.endTime?.toISOString()), 420, yPos);

    // Employee table header
    yPos = 220;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');

    // Draw table header
    pdf.rect(50, yPos - 15, pageWidth - 100, 25);
    pdf.text('Employee Name', 60, yPos);
    pdf.text('Job Title', 200, yPos);
    pdf.text('Initials', 300, yPos);
    pdf.text('IN', 350, yPos);
    pdf.text('OUT', 420, yPos);
    pdf.text('Regular', 470, yPos);
    pdf.text('OT', 520, yPos);

    // Employee rows
    yPos += 30;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    let totalRegularHours = 0;
    let totalOTHours = 0;

    Object.values(employeeEntries).forEach((employee: any) => {
      // Calculate total hours for this employee
      let employeeTotalHours = 0;
      employee.timeEntries.forEach((entry: any) => {
        const display = getTimeEntryDisplay(entry.clockIn, entry.clockOut);
        employeeTotalHours += display.totalHours;
      });

      // Determine regular vs overtime (assuming 8 hours regular, rest overtime)
      const regularHours = Math.min(employeeTotalHours, 8);
      const otHours = Math.max(employeeTotalHours - 8, 0);

      totalRegularHours += regularHours;
      totalOTHours += otHours;

      // Draw employee row
      pdf.rect(50, yPos - 15, pageWidth - 100, 25);

      pdf.text(employee.name, 60, yPos);
      pdf.text(employee.role, 200, yPos);
      pdf.text(employee.name.split(' ').map((n: string) => n[0]).join(''), 300, yPos); // Initials

      // Time entries (show first entry, or combine if multiple)
      if (employee.timeEntries.length > 0) {
        const firstEntry = employee.timeEntries[0];
        const display = getTimeEntryDisplay(firstEntry.clockIn, firstEntry.clockOut);
        pdf.text(display.displayClockIn, 350, yPos);
        pdf.text(display.displayClockOut, 420, yPos);
      }

      pdf.text(regularHours.toFixed(2), 470, yPos);
      pdf.text(otHours.toFixed(2), 520, yPos);

      yPos += 25;
    });

    // Total row
    pdf.setFont('helvetica', 'bold');
    pdf.rect(50, yPos - 15, pageWidth - 100, 25);
    pdf.text('TOTAL HOURS:', 300, yPos);
    pdf.text(totalRegularHours.toFixed(2), 470, yPos);
    pdf.text(totalOTHours.toFixed(2), 520, yPos);

    // Customer signature section
    yPos += 60;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);

    pdf.text('Customer Name: ________________________________', 50, yPos);

    yPos += 40;
    pdf.text('Customer Signature:', 50, yPos);

    // Add client signature if available
    if (timesheet.companySignature) {
      try {
        pdf.addImage(timesheet.companySignature, 'PNG', 150, yPos - 20, 200, 40);
      } catch (error) {
        console.warn('Failed to add client signature to PDF:', error);
      }
    }

    yPos += 60;
    pdf.text('Date: ________________', 50, yPos);

    // Manager signature section (if available)
    if (timesheet.managerSignature) {
      yPos += 40;
      pdf.text('Manager Signature:', 50, yPos);

      try {
        pdf.addImage(timesheet.managerSignature, 'PNG', 150, yPos - 20, 200, 40);
      } catch (error) {
        console.warn('Failed to add manager signature to PDF:', error);
      }
    }

    // Footer
    yPos = pageHeight - 80;
    pdf.setFontSize(8);
    pdf.text('HANDS ON LABOR INTERNATIONAL', pageWidth / 2, yPos, { align: 'center' });
    pdf.text('Phone: (555) 123-4567 • Fax: (555) 123-4568', pageWidth / 2, yPos + 15, { align: 'center' });
    pdf.text('123 Labor Street, Work City, ST 12345', pageWidth / 2, yPos + 30, { align: 'center' });

    yPos += 45;
    pdf.text('White Copy - HANDS ON, Yellow Copy - Customer', pageWidth / 2, yPos, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Store PDF as base64 data URL in database
    const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${formatDate(timesheet.shift.date).replace(/\//g, '-')}.pdf`;
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        unsigned_pdf_url: pdfDataUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'PDF generated and stored successfully',
      filename: filename,
      pdfUrl: pdfDataUrl
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
