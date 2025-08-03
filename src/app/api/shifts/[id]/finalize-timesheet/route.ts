import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/middleware'
import { UserRole } from '@prisma/client'
import { TIMESHEET_STATUS, SHIFT_STATUS } from '@/lib/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: shiftId } = await params;

    if (user.role === UserRole.CrewChief) {
      const assignment = await prisma.assignedPersonnel.findFirst({
        where: {
          shiftId,
          userId: user.id,
          roleCode: 'CC',
        },
      });
      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not the Crew Chief for this shift.' },
          { status: 403 }
        );
      }
    } else if (user.role !== UserRole.Admin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log(`Finalize timesheet request:`, { shiftId, userId: user.id })

    const activeWorkers = await prisma.timeEntry.count({
      where: {
        assignedPersonnel: {
          shiftId: shiftId,
        },
        clockOut: null,
      },
    });

    if (activeWorkers > 0) {
      return NextResponse.json(
        { error: `Cannot finalize timesheet. ${activeWorkers} workers have not clocked out yet.` },
        { status: 400 }
      );
    }


    // Get all time entries for this shift to save as timesheet entries
    const shiftData = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignedPersonnel: {
          include: {
            user: true,
            timeEntries: {
              orderBy: { entryNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!shiftData) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Check if timesheet already exists
    const existingTimesheetResult = await prisma.timesheet.findUnique({
      where: { shiftId },
      select: { id: true },
    });

    let timesheetId;

    if (existingTimesheetResult) {
      timesheetId = existingTimesheetResult.id;
      
      // Clear existing timesheet entries and recreate them with current data
      await prisma.timesheetEntry.deleteMany({
        where: { timesheetId }
      });
      
      await prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          status: TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL,
          submittedBy: user.id,
          submittedAt: new Date(),
        },
      });
    } else {
      const newTimesheetResult = await prisma.timesheet.create({
        data: {
          shiftId,
          status: TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL,
          submittedBy: user.id,
          submittedAt: new Date(),
        },
        select: { id: true },
      });
      timesheetId = newTimesheetResult.id;
    }

    // Create timesheet entries from current time entries (snapshot at finalization)
    const timesheetEntries = [];
    for (const personnel of shiftData.assignedPersonnel) {
      // Sort time entries by entry number to maintain order
      const sortedTimeEntries = personnel.timeEntries.sort((a, b) => (a.entryNumber || 1) - (b.entryNumber || 1));
      
      for (const timeEntry of sortedTimeEntries) {
        timesheetEntries.push({
          timesheetId,
          userId: personnel.userId,
          userName: personnel.user.name,
          userAvatar: personnel.user.avatarUrl,
          roleOnShift: personnel.roleCode === 'CC' ? 'Crew Chief' : 'Worker',
          roleCode: personnel.roleCode,
          entryNumber: timeEntry.entryNumber || 1,
          clockIn: timeEntry.clockIn,
          clockOut: timeEntry.clockOut,
          breakStart: timeEntry.breakStart,
          breakEnd: timeEntry.breakEnd,
          notes: timeEntry.notes,
        });
      }
    }

    if (timesheetEntries.length > 0) {
      await prisma.timesheetEntry.createMany({
        data: timesheetEntries
      });
    }

    // Generate both Excel and PDF files immediately after finalization
    try {
      const { generateTimesheetExcel } = await import('@/lib/excel-generator');
      const libre = await import('libreoffice-convert');
      const util = await import('util');
      const fs = await import('fs');
      const path = await import('path');
      
      const convertAsync = util.promisify(libre.convert);
      
      // Generate Excel using template
      const workbook = await generateTimesheetExcel(timesheetId);
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Store Excel as base64 in database
      const excelDataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(excelBuffer).toString('base64')}`;

      // Convert Excel to PDF
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `${timesheetId}-unsigned.xlsx`);
      fs.writeFileSync(tempFilePath, excelBuffer as any);

      const pdfBuffer = await convertAsync(fs.readFileSync(tempFilePath), '.pdf', undefined);
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      // Store PDF as base64 in database
      const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

      // Update timesheet with unsigned files
      await prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          unsigned_excel_url: excelDataUrl,
          unsigned_pdf_url: pdfDataUrl,
        },
      });

      console.log(`✅ Both Excel and PDF generated for timesheet ${timesheetId}`);
    } catch (error) {
      console.warn('Error generating Excel/PDF during finalization:', error);
    }

    // Update shift status
    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: SHIFT_STATUS.COMPLETED },
    });

    return NextResponse.json({
      success: true,
        message: 'Timesheet finalized and submitted for client approval',
        timesheetId
      })

    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
}
