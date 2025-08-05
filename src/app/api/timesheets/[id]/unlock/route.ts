import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { TimesheetStatus, UserRole } from '@prisma/client';
import { format } from 'date-fns';

// Define schema for input validation
const unlockBodySchema = z.object({
  reason: z.string().min(1, { message: 'Reason for unlocking is required' }),
  notes: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can unlock timesheets
    if (user.role !== UserRole.Admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: timesheetId } = params;
    
    const requestBody = await request.json();
    const parseResult = await unlockBodySchema.safeParseAsync(requestBody);
    
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: parseResult.error.flatten() 
      }, { status: 400 });
    }

    const { reason, notes } = parseResult.data;

    // Fetch the timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: true
              }
            }
          }
        }
      }
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Only allow unlocking of completed timesheets
    if (timesheet.status !== TimesheetStatus.COMPLETED) {
      return NextResponse.json({ 
        error: 'Only completed timesheets can be unlocked' 
      }, { status: 400 });
    }

    // Update timesheet status back to draft and add unlock audit trail
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: TimesheetStatus.DRAFT,
        // Clear approval data
        company_approved_at: null,
        company_approved_by: null,
        company_signature: null,
        company_notes: null,
        manager_approved_at: null,
        manager_approved_by: null,
        manager_notes: null,
        // Add unlock audit trail
        manager_notes: `UNLOCKED BY ADMIN: ${user.name} (${user.email}) on ${new Date().toISOString()}\nReason: ${reason}${notes ? `\nNotes: ${notes}` : ''}`,
        // Clear PDF URLs since they're no longer valid
        signed_pdf_url: null,
        unsigned_pdf_url: null,
      },
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: true
              }
            }
          }
        }
      }
    });

    // Create a notification/audit log entry
    await prisma.notification.create({
      data: {
        userId: timesheet.shift.job.company?.id ? 
          // Try to find a company user to notify
          (await prisma.user.findFirst({
            where: { 
              companyId: timesheet.shift.job.company.id,
              role: UserRole.CompanyUser,
              isActive: true
            }
          }))?.id || user.id : user.id,
        title: 'Timesheet Unlocked',
        message: `Timesheet for ${timesheet.shift.job.name} on ${format(new Date(timesheet.shift.date), 'MMM dd, yyyy')} has been unlocked by admin ${user.name}. Reason: ${reason}`,
        type: 'TIMESHEET_UNLOCKED',
        isRead: false,
      }
    });

    return NextResponse.json({
      message: 'Timesheet unlocked successfully',
      timesheet: updatedTimesheet,
    });

  } catch (error) {
    console.error('Error unlocking timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}