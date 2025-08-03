import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { updateWorkerRequirements } from '@/lib/services/worker-requirements';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !['Admin', 'CrewChief'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin or Crew Chief access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { workerRequirements } = body;

    console.log('PUT worker-requirements received:', { shiftId: id, body, workerRequirements });

    if (!workerRequirements || !Array.isArray(workerRequirements)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    await updateWorkerRequirements(id, workerRequirements);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating worker requirements:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/shifts/[id]/worker-requirements - Get current worker requirements
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Get shift with current worker requirements
    const shift = await prisma.shift.findUnique({
      where: { id },
      select: {
        id: true,
        requiredCrewChiefs: true,
        requiredStagehands: true,
        requiredForkOperators: true,
        requiredReachForkOperators: true,
        requiredRiggers: true,
        requiredGeneralLaborers: true
      }
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Convert to WorkerRequirement format
    // Handle both NULL and undefined values, ensuring crew chief is always at least 1
    const workerRequirements = [
      { roleCode: 'CC', requiredCount: Math.max(shift.requiredCrewChiefs ?? 1, 1) },
      { roleCode: 'SH', requiredCount: shift.requiredStagehands ?? 0 },
      { roleCode: 'FO', requiredCount: shift.requiredForkOperators ?? 0 },
      { roleCode: 'RFO', requiredCount: shift.requiredReachForkOperators ?? 0 },
      { roleCode: 'RG', requiredCount: shift.requiredRiggers ?? 0 },
      { roleCode: 'GL', requiredCount: shift.requiredGeneralLaborers ?? 0 }
    ];

    console.log('Retrieved worker requirements for shift', id, ':', workerRequirements);

    return NextResponse.json({
      success: true,
      data: {
        shiftId: id,
        workerRequirements
      }
    });

  } catch (error) {
    console.error('Error fetching worker requirements:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
