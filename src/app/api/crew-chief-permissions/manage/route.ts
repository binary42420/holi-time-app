import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { UserRole } from '@prisma/client';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (user?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const permissionType = searchParams.get('permissionType');
  const targetId = searchParams.get('targetId');

  if (!permissionType || !targetId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  try {
    const permissionsData = await prisma.crewChiefPermission.findMany({
      where: {
        permissionType: permissionType,
        targetId: targetId,
      },
      include: {
        assignedPersonnel: {
          include: {
            user: true,
          },
        },
      },
    });

    const permissions = permissionsData.map(p => {
      const { assignedPersonnel, ...rest } = p;
      return {
        ...rest,
        userName: assignedPersonnel?.user?.name,
        userRole: assignedPersonnel?.user?.role,
      };
    });

    const eligibleUsers = await prisma.user.findMany({
      where: {
        crew_chief_eligible: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({
      permissions,
      eligibleUsers,
    });
  } catch (error) {
    console.error('Error fetching permission data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
