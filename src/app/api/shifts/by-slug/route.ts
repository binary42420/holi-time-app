import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companySlug = searchParams.get('company')
    const jobSlug = searchParams.get('job')
    const dateSlug = searchParams.get('date')
    const startTime = searchParams.get('startTime')
    const sequence = searchParams.get('sequence')

    if (!companySlug || !jobSlug || !dateSlug) {
      return NextResponse.json(
        { error: 'Company, job, and date parameters are required' },
        { status: 400 }
      )
    }

    // Convert URL-friendly slugs back to searchable terms
    const companyName = decodeURIComponent(companySlug).replace(/-/g, ' ')
    const jobName = decodeURIComponent(jobSlug).replace(/-/g, ' ')
    const shiftDate = decodeURIComponent(dateSlug)
    const decodedStartTime = startTime ? decodeURIComponent(startTime) : null
    const sequenceNumber = sequence ? parseInt(sequence) : 1

    console.log('Looking for shift with:', {
      companyName,
      jobName,
      shiftDate,
      startTime: decodedStartTime,
      sequence: sequenceNumber,
      originalParams: { companySlug, jobSlug, dateSlug, startTime, sequence }
    })

    // Build query with more flexible matching
    const where: any = {
      date: new Date(shiftDate),
      job: {
        name: { contains: jobName, mode: 'insensitive' },
        company: {
          name: { contains: companyName, mode: 'insensitive' },
        },
      },
    };
    if (decodedStartTime) {
      where.startTime = new Date(`${shiftDate}T${decodedStartTime}`);
    }

    const result = await prisma.shift.findMany({
      where,
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
      take: 1,
      skip: sequenceNumber > 1 ? sequenceNumber - 1 : 0,
      select: { id: true },
    });

    console.log('Query result:', result)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const shiftId = result[0].id;
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
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
        workerRequirements: true,
        timesheets: true,
      },
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this shift
    const hasAccess =
      user.role === 'Admin' ||
      (user.role === 'CrewChief' && shift.assignedPersonnel.some((person) => person.userId === user.id && person.roleCode === 'CC')) ||
      (user.role === 'Staff' && shift.assignedPersonnel.some((person) => person.userId === user.id));

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      shift,
    })

  } catch (error) {
    console.error('Error getting shift by slug:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
