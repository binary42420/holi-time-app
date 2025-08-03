import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== UserRole.Admin) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, primaryId, secondaryId, mergedData } = body;

    if (!type || !primaryId || !secondaryId || !mergedData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (primaryId === secondaryId) {
      return NextResponse.json(
        { error: 'Cannot merge a record with itself' },
        { status: 400 }
      );
    }

    let result;
    switch (type) {
      case 'employees':
        result = await mergeEmployees(primaryId, secondaryId, mergedData);
        break;
      case 'clients':
        result = await mergeClients(primaryId, secondaryId, mergedData);
        break;
      case 'jobs':
        result = await mergeJobs(primaryId, secondaryId, mergedData);
        break;
      default:
        throw new Error('Invalid merge type');
    }

    console.log(`Merged ${type}: ${secondaryId} into ${primaryId} by admin ${user.email}`);
    return NextResponse.json({
      success: true,
      message: `Successfully merged ${type}`,
      result,
    });
  } catch (error) {
    console.error('Error processing merge request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

async function mergeEmployees(primaryId: string, secondaryId: string, mergedData: any) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: primaryId },
      data: {
        name: mergedData.name,
        email: mergedData.email,
        role: mergedData.role,
      },
    });

    await tx.assignedPersonnel.updateMany({
      where: { userId: secondaryId },
      data: { userId: primaryId },
    });

    await tx.user.delete({ where: { id: secondaryId } });

    return { primaryId, mergedData };
  });
}

async function mergeClients(primaryId: string, secondaryId: string, mergedData: any) {
  return prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: primaryId },
      data: {
        name: mergedData.name,
        address: mergedData.address,
        phone: mergedData.phone,
        email: mergedData.email,
        notes: mergedData.notes,
      },
    });

    await tx.job.updateMany({
      where: { companyId: secondaryId },
      data: { companyId: primaryId },
    });

    await tx.company.delete({ where: { id: secondaryId } });

    return { primaryId, mergedData };
  });
}

async function mergeJobs(primaryId: string, secondaryId: string, mergedData: any) {
  return prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: primaryId },
      data: {
        name: mergedData.name,
        description: mergedData.description,
      },
    });

    await tx.shift.updateMany({
      where: { jobId: secondaryId },
      data: { jobId: primaryId },
    });

    await tx.job.delete({ where: { id: secondaryId } });

    return { primaryId, mergedData };
  });
}
