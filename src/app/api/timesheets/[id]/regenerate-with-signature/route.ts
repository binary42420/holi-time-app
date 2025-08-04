import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import { generateSignedTimesheetPdf } from '@/lib/enhanced-pdf-generator';
import { prisma } from '@/lib/prisma';

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
      select: { id: true, company_signature: true }
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    if (!timesheet.company_signature) {
      return NextResponse.json({ error: 'No signature to add' }, { status: 400 });
    }

    // Use transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Generate Excel with signature
      const workbook = await generateTimesheetExcel(timesheetId);
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Store Excel as base64 in database (if needed)
      const excelDataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(excelBuffer).toString('base64')}`;

      // Generate signed PDF using enhanced generator
      const pdfUrl = await generateSignedTimesheetPdf(timesheetId, tx);

      // Update timesheet with signed files (only update if we have new data)
      const updateData: any = {
        signed_pdf_url: pdfUrl,
      };

      // Only update Excel URL if we want to store it
      // updateData.signed_excel_url = excelDataUrl;

      await tx.timesheet.update({
        where: { id: timesheetId },
        data: updateData,
      });
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