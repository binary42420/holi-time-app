import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';

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

    // Generate Excel workbook
    const workbook = await generateTimesheetExcel(timesheetId);
    
    // Add company signature if available and timesheet is approved
    if (timesheet.status === 'COMPLETED' && timesheet.companySignature) {
      const worksheet = workbook.getWorksheet(1);
      if (worksheet) {
        try {
          const signatureImage = workbook.addImage({
            buffer: Buffer.from(timesheet.companySignature.split('base64,')[1], 'base64'),
            extension: 'png',
          });
          worksheet.addImage(signatureImage, {
            tl: { col: 10, row: 11 }, // K12 cell
            ext: { width: 150, height: 75 }
          });
        } catch (error) {
          console.warn('Failed to add company signature to Excel:', error);
        }
      }
    }

    // Create temporary files
    const tempDir = tmpdir();
    const excelPath = path.join(tempDir, `timesheet-${timesheetId}-${Date.now()}.xlsx`);
    const htmlPath = path.join(tempDir, `timesheet-${timesheetId}-${Date.now()}.html`);

    try {
      // Save Excel file
      await workbook.xlsx.writeFile(excelPath);

      // Convert Excel to HTML for PDF generation
      const htmlContent = await convertExcelToHTML(workbook);
      fs.writeFileSync(htmlPath, htmlContent);

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
      
      // Set page format for timesheet
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      await browser.close();

      // Store PDF in database for future use
      const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      await prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          signed_pdf_url: pdfDataUrl,
        },
      });

      // Clean up temporary files
      try {
        fs.unlinkSync(excelPath);
        fs.unlinkSync(htmlPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary files:', cleanupError);
      }

      const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}-signed.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });

    } catch (conversionError) {
      // Clean up files on error
      try {
        if (fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
        if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary files after error:', cleanupError);
      }
      throw conversionError;
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function convertExcelToHTML(workbook: ExcelJS.Workbook): Promise<string> {
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found');
  }

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Timesheet</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 4px 8px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .header {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .company-info {
          margin-bottom: 15px;
        }
        .signature-section {
          margin-top: 30px;
          border: none;
        }
        .signature-section td {
          border: none;
          padding: 10px 0;
        }
        .totals-row {
          background-color: #f0f0f0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">HOLI TIMESHEET</div>
  `;

  // Extract company and job information
  const companyName = worksheet.getCell('A12').value?.toString() || '';
  const jobName = worksheet.getCell('B7').value?.toString() || '';
  const shiftDate = worksheet.getCell('E6').value;
  const shiftLocation = worksheet.getCell('B8').value?.toString() || '';

  html += `
    <div class="company-info">
      <strong>Company:</strong> ${companyName}<br>
      <strong>Job:</strong> ${jobName}<br>
      <strong>Location:</strong> ${shiftLocation}<br>
      <strong>Date:</strong> ${shiftDate instanceof Date ? shiftDate.toLocaleDateString() : shiftDate || ''}
    </div>
  `;

  // Create employee table
  html += `
    <table>
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Worker Type</th>
          <th>Initials</th>
          <th>In #1</th>
          <th>Out #1</th>
          <th>In #2</th>
          <th>Out #2</th>
          <th>In #3</th>
          <th>Out #3</th>
          <th>Regular Hours</th>
          <th>OT Hours</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Find employee data rows (starting from row 15)
  let currentRow = 15;
  let hasData = true;

  while (hasData) {
    const nameCell = worksheet.getCell(currentRow, 3); // Column C
    const name = nameCell.value?.toString();
    
    if (!name || name.includes('TOTAL')) {
      if (name && name.includes('TOTAL')) {
        // Add totals row
        const regularTotal = worksheet.getCell(currentRow, 12).value?.toString() || '0';
        const otTotal = worksheet.getCell(currentRow, 13).value?.toString() || '0';
        
        html += `
          <tr class="totals-row">
            <td colspan="9"><strong>TOTAL HOURS:</strong></td>
            <td><strong>${regularTotal}</strong></td>
            <td><strong>${otTotal}</strong></td>
          </tr>
        `;
      }
      hasData = false;
      break;
    }

    const workerType = worksheet.getCell(currentRow, 4).value?.toString() || '';
    const initials = worksheet.getCell(currentRow, 5).value?.toString() || '';
    const in1 = formatTimeValue(worksheet.getCell(currentRow, 6).value);
    const out1 = formatTimeValue(worksheet.getCell(currentRow, 7).value);
    const in2 = formatTimeValue(worksheet.getCell(currentRow, 8).value);
    const out2 = formatTimeValue(worksheet.getCell(currentRow, 9).value);
    const in3 = formatTimeValue(worksheet.getCell(currentRow, 10).value);
    const out3 = formatTimeValue(worksheet.getCell(currentRow, 11).value);
    const regular = worksheet.getCell(currentRow, 12).value?.toString() || '';
    const ot = worksheet.getCell(currentRow, 13).value?.toString() || '';

    html += `
      <tr>
        <td>${name}</td>
        <td>${workerType}</td>
        <td>${initials}</td>
        <td>${in1}</td>
        <td>${out1}</td>
        <td>${in2}</td>
        <td>${out2}</td>
        <td>${in3}</td>
        <td>${out3}</td>
        <td>${regular}</td>
        <td>${ot}</td>
      </tr>
    `;

    currentRow++;
  }

  html += `
      </tbody>
    </table>

    <table class="signature-section">
      <tr>
        <td><strong>Customer Name:</strong> _________________________________</td>
      </tr>
      <tr>
        <td><strong>Customer Signature:</strong></td>
      </tr>
      <tr>
        <td style="height: 60px;"></td>
      </tr>
      <tr>
        <td><strong>Date:</strong> ________________</td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 40px; font-size: 10px;">
      <strong>HANDS ON LABOR INTERNATIONAL</strong><br>
      Phone: (555) 123-4567 • Fax: (555) 123-4568<br>
      123 Labor Street, Work City, ST 12345<br><br>
      White Copy - HANDS ON, Yellow Copy - Customer
    </div>

    </body>
    </html>
  `;

  return html;
}

function formatTimeValue(value: any): string {
  if (!value) return '';
  
  if (value instanceof Date) {
    return value.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  return value.toString();
}