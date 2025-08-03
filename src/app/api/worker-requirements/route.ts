import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const workerRequirementSchema = z.object({
  shiftId: z.string().min(1, 'Shift ID is required'),
  roleCode: z.string().min(1, 'Role code is required'),
  roleName: z.string().min(1, 'Role name is required'),
  requiredCount: z.number().min(0, 'Required count must be non-negative'),
  color: z.string().optional(),
});

// GET /api/worker-requirements - Get worker requirements (with optional shift filter)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (shiftId) {
      where.shiftId = shiftId;
    }

    const workerRequirements = await prisma.workerRequirement.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.workerRequirement.count({ where });

    return NextResponse.json({
      success: true,
      workerRequirements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error fetching worker requirements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/worker-requirements - Create a new worker requirement
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !['Admin', 'CrewChief'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or Crew Chief access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = workerRequirementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { shiftId, roleCode, roleName, requiredCount, color } = validation.data;

    // Check if shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const workerRequirement = await prisma.workerRequirement.create({
      data: {
        shiftId,
        roleCode,
        roleName,
        requiredCount,
        color,
      },
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
      message: 'Worker requirement created successfully',
      workerRequirement,
    });

  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Worker requirement for this role already exists for this shift' },
        { status: 409 }
      );
    }
    console.error('Error creating worker requirement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
