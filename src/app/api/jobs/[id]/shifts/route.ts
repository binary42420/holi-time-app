import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { isBuildTime, buildTimeResponse } from '@/lib/build-time-check';

export const dynamic = 'force-dynamic';

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

    const result = await prisma.shift.findMany({
      where: { jobId: id },
      include: {
        job: {
          include: {
            company: true,
          },
        },
        assignedPersonnel: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
    const shifts = result.map((shift: any) => ({
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location || shift.job.company.name, // Use shift location or fallback to company name
      status: shift.status,
      notes: shift.notes,
      requestedWorkers: shift.requestedWorkers || 1,
      jobName: shift.job.name,
      companyName: shift.job.company.name, // Changed from clientName to companyName
      crewChief: shift.assignedPersonnel.find((p: any) => p.roleCode === 'CC')?.user.name,
      assignedCount: shift.assignedPersonnel.length,
      assignedPersonnel: shift.assignedPersonnel.map((p: any) => p.user),
    }));

    return NextResponse.json({
      success: true,
      shifts,
    });
  } catch (error) {
    console.error('Error getting shifts for job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
