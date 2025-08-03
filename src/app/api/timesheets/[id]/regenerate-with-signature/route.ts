import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import { prisma } from '@/lib/prisma';
import libre from 'libreoffice-convert';
import util from 'util';
import fs from 'fs';
import path from 'path';

const convertAsync = util.promisify(libre.convert);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: timesheetId } = params;

    // Get timesheet to check if it has a signature
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      select: { id: true, clientSignature: true }
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    if (!timesheet.clientSignature) {
      return NextResponse.json({ error: 'No signature to add' }, { status: 400 });
    }

    // Generate Excel with signature
    const workbook = await generateTimesheetExcel(timesheetId);
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Store Excel as base64 in database
    const excelDataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(excelBuffer).toString('base64')}`;

    // Convert Excel to PDF
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `${timesheetId}-signed.xlsx`);
    fs.writeFileSync(tempFilePath, excelBuffer as any);

    const pdfBuffer = await convertAsync(fs.readFileSync(tempFilePath), '.pdf', undefined);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    // Store PDF as base64 in database
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    // Update timesheet with signed files
    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        signed_excel_url: excelDataUrl,
        signed_pdf_url: pdfDataUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Files regenerated with signature successfully',
    });

  } catch (error) {
    console.error('Error regenerating files with signature:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}