import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import { prisma } from '@/lib/prisma';
import libre from 'libreoffice-convert';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

const convertAsync = util.promisify(libre.convert);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: timesheetId } = params;
    const { searchParams } = new URL(request.url);
    const signed = searchParams.get('signed') === 'true';

    // Check if we have the PDF stored in the database first
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      select: { 
        id: true,
        signed_pdf_url: true,
        unsigned_pdf_url: true,
        shift: {
          select: {
            job: {
              select: {
                company: { select: { name: true } },
                name: true
              }
            },
            date: true
          }
        }
      }
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    const pdfUrl = signed ? timesheet.signed_pdf_url : timesheet.unsigned_pdf_url;
    
    if (pdfUrl && pdfUrl.startsWith('data:application/pdf;base64,')) {
      // Extract PDF data from data URL
      const base64Data = pdfUrl.split('base64,')[1];
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      
      const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}${signed ? '-signed' : ''}.pdf`;
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // If no stored PDF, generate it on the fly
    const workbook = await generateTimesheetExcel(timesheetId);
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Write to a temporary file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `${timesheetId}.xlsx`);
    fs.writeFileSync(tempFilePath, excelBuffer as any);

    // Convert to PDF
    const pdfBuffer = await convertAsync(fs.readFileSync(tempFilePath), '.pdf', undefined);

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}${signed ? '-signed' : ''}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
