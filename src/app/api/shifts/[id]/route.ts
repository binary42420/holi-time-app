import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { ShiftWithDetails } from '@/lib/types';
import { Prisma } from '@prisma/client';

const shiftWithDetailsInclude = {
  job: {
    include: {
      company: true,
    },
  },
  assignedPersonnel: {
    include: {
      user: true,
      timeEntries: true,
    },
  },
  timesheets: true,
};

function transformShiftToShiftWithDetails(shift: any): ShiftWithDetails {
  return shift as ShiftWithDetails;
}

async function getShiftById(
  user: any, // Replace with actual user type if available
  id: string,
  tx?: Prisma.TransactionClient
): Promise<ShiftWithDetails | null> {
  const db = tx || prisma;

  // Base query to find the shift by ID
  const shift = await db.shift.findUnique({
    where: { id },
    include: shiftWithDetailsInclude,
  });

  if (!shift) {
    return null;
  }

  // Role-based access control
  if (user.role === 'Admin' || user.role === 'Staff') {
    return transformShiftToShiftWithDetails(shift); // Admins/Staff can see any shift
  }

  if (user.role === 'CompanyUser') {
    if (user.companyId && shift.job.companyId === user.companyId) {
      return transformShiftToShiftWithDetails(shift);
    }
  }

  if (user.role === 'Employee' || user.role === 'CrewChief') {
    const isAssigned = shift.assignedPersonnel.some(p => p.userId === user.id);
    if (isAssigned) {
      return transformShiftToShiftWithDetails(shift);
    }
  }

  // If no conditions are met, the user is not authorized to see this shift.
  // The special permissions for a CrewChief (viewing all time entries)
  // are handled on the client-side based on the returned shift data,
  // which includes all assigned personnel. This function only gates access to the shift itself.
  return null;
}

export async function GET(
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

    const { id } = params;
    const shift = await getShiftById(user, id);

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      shift,
    });
  } catch (error) {
    console.error('Error getting shift:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    
    // First, verify the shift exists and the user has permission to view it.
    const existingShift = await getShiftById(user, id);
    if (!existingShift) {
      return NextResponse.json({ error: 'Shift not found or you do not have permission to view it.' }, { status: 404 });
    }

    // Now, check if the user has permission to EDIT it.
    const canEdit = user.role === 'Admin' || user.role === 'Staff' || (user.role === 'CompanyUser' && existingShift.job.companyId === user.companyId);

    if (!canEdit) {
        return NextResponse.json({ error: 'You do not have permission to edit this shift.' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Received shift update data:', body);
    
    const { ...shiftData } = body;

    const updatedShift = await prisma.$transaction(async (tx) => {
      // We already checked for existence, but let's get it again inside the transaction for safety
      const shiftInTx = await tx.shift.findUnique({ where: { id } });
      if (!shiftInTx) {
        throw new Error("Shift not found");
      }
      
      // If the user is a CompanyUser, they cannot decrease worker counts.
      if (user.role === 'CompanyUser') {
        const requiredFields: (keyof typeof shiftInTx)[] = [
          'requiredStagehands',
          'requiredForkOperators',
          'requiredReachForkOperators',
          'requiredRiggers',
          'requiredGeneralLaborers',
        ];

        for (const field of requiredFields) {
          if (shiftData[field] !== undefined) {
            const newValue = parseInt(shiftData[field], 10) || 0;
            const oldValue = parseInt(String(shiftInTx[field] || 0), 10) || 0;
            if (newValue < oldValue) {
              throw new Error(`Company users cannot decrease the number of required workers for ${field}.`);
            }
          }
        }
      }

      const shiftDate = new Date(shiftData.date || shiftInTx.date);

      if (shiftData.startTime) {
        const [hours, minutes] = shiftData.startTime.split(':');
        const startDate = new Date(shiftDate.getTime());
        startDate.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        shiftData.startTime = startDate.toISOString();
      }

      if (shiftData.endTime) {
        const [hours, minutes] = shiftData.endTime.split(':');
        const endDate = new Date(shiftDate.getTime());
        endDate.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        shiftData.endTime = endDate.toISOString();
      }
      
      if (shiftData.date) {
        shiftData.date = new Date(shiftData.date).toISOString();
      }

      // Ensure numeric fields are properly converted
      // Crew chief is always fixed at 1
      if (shiftData.requiredCrewChiefs !== undefined) {
        shiftData.requiredCrewChiefs = 1; // Always force to 1
      }
      if (shiftData.requiredStagehands !== undefined) {
        shiftData.requiredStagehands = parseInt(shiftData.requiredStagehands) || 0;
      }
      if (shiftData.requiredForkOperators !== undefined) {
        shiftData.requiredForkOperators = parseInt(shiftData.requiredForkOperators) || 0;
      }
      if (shiftData.requiredReachForkOperators !== undefined) {
        shiftData.requiredReachForkOperators = parseInt(shiftData.requiredReachForkOperators) || 0;
      }
      if (shiftData.requiredRiggers !== undefined) {
        shiftData.requiredRiggers = parseInt(shiftData.requiredRiggers) || 0;
      }
      if (shiftData.requiredGeneralLaborers !== undefined) {
        shiftData.requiredGeneralLaborers = parseInt(shiftData.requiredGeneralLaborers) || 0;
      }

      console.log('Updating shift with data:', shiftData);

      const shift = await tx.shift.update({
        where: { id },
        data: shiftData,
      });
      
      console.log('Updated shift:', shift);
      
      return getShiftById(user, id, tx as any);
    });

    return NextResponse.json({
      success: true,
      shift: updatedShift,
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;

    // First, verify the shift exists and the user has permission to view it.
    const shift = await getShiftById(user, id);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found or you do not have permission to view it.' }, { status: 404 });
    }

    // Now, check if the user has permission to DELETE it.
    const canDelete = user.role === 'Admin' || user.role === 'Staff';

    if (!canDelete) {
        return NextResponse.json({ error: 'You do not have permission to delete this shift.' }, { status: 403 });
    }

    await prisma.shift.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

