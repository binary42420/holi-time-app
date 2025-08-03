import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { syncShiftFromImportData, validateImportedWorkerData, ensureCrewChiefRequirement } from '@/lib/services/shift-import-sync';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const syncImportSchema = z.object({
  workers: z.array(z.object({
    userId: z.string().min(1, 'User ID is required'),
    roleCode: z.enum(['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']),
    clockInTime: z.string().optional(),
    clockOutTime: z.string().optional(),
    entryNumber: z.number().int().min(1).optional()
  })),
  overwriteExisting: z.boolean().default(true)
});

// POST /api/shifts/[id]/sync-import - Sync shift with imported worker data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !['Admin', 'CrewChief'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or Crew Chief access required' },
        { status: 403 }
      );
    }

    const { id: shiftId } = await params;
    const body = await request.json();

    // Validate request body
    const validation = syncImportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { workers, overwriteExisting } = validation.data;

    // Check if shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        job: {
          include: {
            company: true
          }
        },
        assignedPersonnel: {
          include: {
            timeEntries: true
          }
        }
      }
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Check if shift has existing data and overwrite is not allowed
    if (!overwriteExisting && shift.assignedPersonnel.length > 0) {
      return NextResponse.json(
        {
          error: 'Shift already has assigned personnel. Set overwriteExisting to true to replace existing data.',
          existingPersonnelCount: shift.assignedPersonnel.length
        },
        { status: 409 }
      );
    }

    // Validate imported worker data
    let validatedWorkers;
    try {
      validatedWorkers = validateImportedWorkerData(workers);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid worker data',
          details: error instanceof Error ? error.message : 'Validation failed'
        },
        { status: 400 }
      );
    }

    // Ensure crew chief requirement
    validatedWorkers = ensureCrewChiefRequirement(validatedWorkers);

    // Verify all users exist
    const userIds = validatedWorkers.map(w => w.userId);
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });

    const missingUserIds = userIds.filter(id => !existingUsers.find(u => u.id === id));
    if (missingUserIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Some users not found',
          missingUserIds
        },
        { status: 400 }
      );
    }

    // Sync the shift data
    const syncResult = await syncShiftFromImportData({
      shiftId,
      workers: validatedWorkers
    });

    // Update shift status if it was pending
    if (shift.status === 'Pending') {
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'Active' }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Shift synchronized successfully with imported data',
      data: {
        shiftId,
        workersProcessed: validatedWorkers.length,
        workerRequirements: syncResult.workerRequirements,
        assignedPersonnelCreated: syncResult.assignedPersonnel.length,
        timeEntriesCreated: syncResult.timeEntriesCreated,
        shiftStatus: shift.status === 'Pending' ? 'Active' : shift.status
      }
    });

  } catch (error) {
    console.error('Error syncing shift import:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/shifts/[id]/sync-import - Get import sync status and preview
export async function GET(
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

    // Get shift with current assignments
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        job: {
          include: {
            company: true
          }
        },
        assignedPersonnel: {
          include: {
            user: {
              select: { id: true, name: true }
            },
            timeEntries: {
              orderBy: { entryNumber: 'asc' }
            }
          }
        },
        workerRequirements: true
      }
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Calculate current worker counts
    const currentWorkerCounts: Record<string, number> = {};
    shift.assignedPersonnel.forEach(ap => {
      currentWorkerCounts[ap.roleCode] = (currentWorkerCounts[ap.roleCode] || 0) + 1;
    });

    // Get worker requirements
    const workerRequirements: Record<string, number> = {};
    shift.workerRequirements.forEach(wr => {
      workerRequirements[wr.roleCode] = wr.requiredCount;
    });

    return NextResponse.json({
      success: true,
      data: {
        shift: {
          id: shift.id,
          date: shift.date,
          status: shift.status,
          job: {
            name: shift.job.name,
            company: shift.job.company.name
          }
        },
        currentAssignments: {
          totalWorkers: shift.assignedPersonnel.length,
          workerCounts: currentWorkerCounts,
          hasTimeEntries: shift.assignedPersonnel.some(ap => ap.timeEntries.length > 0)
        },
        workerRequirements,
        canOverwrite: true,
        importReady: true
      }
    });

  } catch (error) {
    console.error('Error getting sync import status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
