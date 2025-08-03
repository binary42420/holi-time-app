import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { TimesheetStatus, UserRole } from '@prisma/client';
import { canCrewChiefManageShift, isCrewChiefAssignedToShift } from '@/lib/auth';
import { generateTimesheetPdf } from '@/lib/pdf';

// Define schema for input validation
const clientApprovalBodySchema = z.object({
  signature: z.string().min(1, { message: 'Signature is required' }),
  approvalType: z.union([z.literal('client'), z.literal('company')]), // Accept both 'client' and 'company'
  notes: z.string().optional(),
});

const managerApprovalBodySchema = z.object({
  approvalType: z.literal('manager'),
  notes: z.string().optional(),
});

const adminApprovalBodySchema = z.object({
  approvalType: z.literal('admin'),
  notes: z.string().optional(),
  signature: z.string().optional(), // Optional signature for admin
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

    const { id: timesheetId } = params;
    
    const requestBody = await request.json();
    const approvalType = requestBody.approvalType;
    
    let parsedData;
    if (approvalType === 'client' || approvalType === 'company') {
      const parseResult = await clientApprovalBodySchema.safeParseAsync(requestBody);
      if (!parseResult.success) {
        return NextResponse.json({ error: 'Invalid request body for client approval', details: parseResult.error.flatten() }, { status: 400 });
      }
      parsedData = parseResult.data;
    } else if (approvalType === 'manager') {
      const parseResult = await managerApprovalBodySchema.safeParseAsync(requestBody);
      if (!parseResult.success) {
        return NextResponse.json({ error: 'Invalid request body for manager approval', details: parseResult.error.flatten() }, { status: 400 });
      }
      parsedData = parseResult.data;
    } else if (approvalType === 'admin') {
      const parseResult = await adminApprovalBodySchema.safeParseAsync(requestBody);
      if (!parseResult.success) {
        return NextResponse.json({ error: 'Invalid request body for admin approval', details: parseResult.error.flatten() }, { status: 400 });
      }
      parsedData = parseResult.data;
    } else {
      return NextResponse.json({ error: 'Invalid approval type. Must be "client", "company", "manager", or "admin"' }, { status: 400 });
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift: {
          include: {
            job: { select: { companyId: true } },
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    if (approvalType === 'client' || approvalType === 'company') {
      // Authorization for client approval
      const isCompanyUser = user.role === UserRole.CompanyUser && user.companyId === timesheet.shift?.job?.companyId;
      const isShiftCrewChief = await canCrewChiefManageShift(user, timesheet.shiftId);
      const isAssignedCrewChief = await isCrewChiefAssignedToShift(user, timesheet.shiftId);
      const isAdmin = user.role === UserRole.Admin;

      if (!isCompanyUser && !isShiftCrewChief && !isAssignedCrewChief && !isAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions for company approval' }, { status: 403 });
      }
      
      if (timesheet.status !== TimesheetStatus.PENDING_COMPANY_APPROVAL) {
        return NextResponse.json({ error: 'Timesheet is not pending company approval' }, { status: 400 });
      }

      const updatedTimesheet = await prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          status: TimesheetStatus.PENDING_MANAGER_APPROVAL,
          company_signature: parsedData.signature,
          company_approved_at: new Date(),
          companyApprovedBy: user.id,
          company_notes: parsedData.notes,
        },
      });

      // Update Excel and PDF files with signature
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/timesheets/${timesheetId}/regenerate-with-signature`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.warn('Failed to regenerate files with signature:', error);
      }

      // TODO: Implement a robust notification service for managers
      console.log(`TODO: Notify managers for final approval of timesheet ${updatedTimesheet.id}`);

      return NextResponse.json({
        success: true,
        message: 'Timesheet approved by company, pending manager approval.',
        timesheet: updatedTimesheet,
      });
    }
    
    if (approvalType === 'manager') {
      // Authorization for manager approval
      if (user.role !== UserRole.Admin) {
        return NextResponse.json({ error: 'Only Admins can provide final approval' }, { status: 403 });
      }
      
      if (timesheet.status !== TimesheetStatus.PENDING_MANAGER_APPROVAL) {
        return NextResponse.json({ error: 'Timesheet is not pending final approval' }, { status: 400 });
      }

      // Manager approval doesn't require signature - just simple approval
      const updatedTimesheet = await prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          status: TimesheetStatus.COMPLETED,
          manager_approved_at: new Date(),
          managerApprovedBy: user.id,
          manager_notes: parsedData.notes,
        },
      });

      await prisma.shift.update({
        where: { id: updatedTimesheet.shiftId },
        data: { status: 'Completed' },
      });

      return NextResponse.json({
        success: true,
        message: 'Timesheet has been fully approved by manager.',
        timesheet: updatedTimesheet,
      });
    }
    
    if (approvalType === 'admin') {
      // Admin can approve at any stage
      if (user.role !== UserRole.Admin) {
        return NextResponse.json({ error: 'Only Admins can use admin approval' }, { status: 403 });
      }
      
      let updatedTimesheet;
      
      if (timesheet.status === TimesheetStatus.PENDING_COMPANY_APPROVAL) {
        // Admin acting as company approval
        updatedTimesheet = await prisma.timesheet.update({
          where: { id: timesheetId },
          data: {
            status: TimesheetStatus.PENDING_MANAGER_APPROVAL,
            company_signature: parsedData.signature || 'Admin Override',
            company_approved_at: new Date(),
            companyApprovedBy: user.id,
            company_notes: parsedData.notes,
          },
        });
        
        // Update Excel and PDF files with signature if provided
        if (parsedData.signature) {
          try {
            await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/timesheets/${timesheetId}/regenerate-with-signature`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.warn('Failed to regenerate files with signature:', error);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Timesheet approved by admin (company stage), pending manager approval.',
          timesheet: updatedTimesheet,
        });
      } else if (timesheet.status === TimesheetStatus.PENDING_MANAGER_APPROVAL) {
        // Admin acting as manager approval
        updatedTimesheet = await prisma.timesheet.update({
          where: { id: timesheetId },
          data: {
            status: TimesheetStatus.COMPLETED,
            manager_approved_at: new Date(),
            managerApprovedBy: user.id,
            manager_notes: parsedData.notes,
          },
        });

        await prisma.shift.update({
          where: { id: updatedTimesheet.shiftId },
          data: { status: 'Completed' },
        });
        
        return NextResponse.json({
          success: true,
          message: 'Timesheet has been fully approved by admin.',
          timesheet: updatedTimesheet,
        });
      } else {
        return NextResponse.json({ error: 'Timesheet is not in a state that can be approved' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid approval type' }, { status: 400 });

  } catch (error) {
    console.error('Error approving timesheet:', error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid data provided', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}