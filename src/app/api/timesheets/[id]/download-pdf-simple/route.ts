import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { TimesheetPDFGenerator } from '@/lib/enhanced-pdf-generator';



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

    // Use enhanced PDF generator
    const generator = new TimesheetPDFGenerator(timesheetId);
    const pdfBuffer = await generator.getPDFBuffer(true); // Prefer signed version

    const filename = `timesheet-${timesheet.shift.job.company.name.replace(/\s+/g, '-')}-${new Date(timesheet.shift.date).toISOString().split('T')[0]}.pdf`;

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