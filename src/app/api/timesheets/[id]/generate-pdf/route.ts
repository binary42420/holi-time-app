import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { generateUnsignedTimesheetPdf } from '@/lib/enhanced-pdf-generator';

// POST /api/timesheets/[id]/generate-pdf - Generate and store unsigned PDF in database
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

    // Check if timesheet exists
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift: {
          include: {
            job: { include: { company: true } }
          }
        }
      }
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Generate unsigned PDF
    const pdfUrl = await generateUnsignedTimesheetPdf(timesheetId);
    
    const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}.pdf`;

    return NextResponse.json({
      success: true,
      message: 'Unsigned PDF generated and stored successfully',
      filename: filename,
      pdfUrl: pdfUrl
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
