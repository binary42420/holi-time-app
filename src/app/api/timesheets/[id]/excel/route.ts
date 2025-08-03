import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: timesheetId } = params;
    const { searchParams } = new URL(request.url);
    const signed = searchParams.get('signed') === 'true';

    // Check if we have the Excel stored in the database first
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      select: { 
        id: true,
        signed_excel_url: true,
        unsigned_excel_url: true,
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

    const excelUrl = signed ? timesheet.signed_excel_url : timesheet.unsigned_excel_url;
    
    if (excelUrl && excelUrl.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,')) {
      // Extract Excel data from data URL
      const base64Data = excelUrl.split('base64,')[1];
      const excelBuffer = Buffer.from(base64Data, 'base64');
      
      const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}${signed ? '-signed' : ''}.xlsx`;
      
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // If no stored Excel, generate it on the fly
    const workbook = await generateTimesheetExcel(timesheetId);
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}${signed ? '-signed' : ''}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}