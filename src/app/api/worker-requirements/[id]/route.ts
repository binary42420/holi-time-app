import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateWorkerRequirementSchema = z.object({
  roleCode: z.string().min(1, 'Role code is required').optional(),
  roleName: z.string().min(1, 'Role name is required').optional(),
  requiredCount: z.number().min(0, 'Required count must be non-negative').optional(),
  color: z.string().optional(),
});

// GET /api/worker-requirements/[id] - Get a specific worker requirement
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

    const { id } = await params;

    const workerRequirement = await prisma.workerRequirement.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });

    if (!workerRequirement) {
      return NextResponse.json(
        { error: 'Worker requirement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workerRequirement,
    });

  } catch (error) {
    console.error('Error fetching worker requirement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/worker-requirements/[id] - Update a worker requirement
export async function PUT(
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

    const { id } = await params;
    const body = await request.json();
    const validation = updateWorkerRequirementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (validation.data.roleCode !== undefined) updateData.roleCode = validation.data.roleCode;
    if (validation.data.roleName !== undefined) updateData.roleName = validation.data.roleName;
    if (validation.data.requiredCount !== undefined) updateData.requiredCount = validation.data.requiredCount;
    if (validation.data.color !== undefined) updateData.color = validation.data.color;

    const workerRequirement = await prisma.workerRequirement.update({
      where: { id },
      data: updateData,
      include: {
        shift: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Worker requirement updated successfully',
      workerRequirement,
    });

  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Worker requirement not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Worker requirement for this role already exists for this shift' },
        { status: 409 }
      );
    }
    console.error('Error updating worker requirement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/worker-requirements/[id] - Delete a worker requirement
export async function DELETE(
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

    const { id } = await params;

    await prisma.workerRequirement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Worker requirement deleted successfully',
    });

  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Worker requirement not found' },
        { status: 404 }
      );
    }
    console.error('Error deleting worker requirement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
