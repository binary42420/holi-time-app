import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET - Generate job report data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;

    // Get job details with company information
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get all shifts for this job with assignments
    const shifts = await prisma.shift.findMany({
      where: { jobId },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // Calculate summary statistics
    const summary = {
      totalShifts: shifts.length,
      totalWorkerSlotsRequired: 0,
      totalWorkerSlotsAssigned: 0,
      workerTypeBreakdown: {
        crew_chief: { required: 0, assigned: 0 },
        fork_operator: { required: 0, assigned: 0 },
        stage_hand: { required: 0, assigned: 0 },
        general_labor: { required: 0, assigned: 0 }
      },
      shiftStatusBreakdown: {
        pending: 0,
        active: 0,
        completed: 0,
        cancelled: 0
      },
      fillRate: 0
    };

    shifts.forEach(shift => {
      // Count required workers
      summary.totalWorkerSlotsRequired += 
        (shift.crew_chief_required || 0) +
        (shift.fork_operators_required || 0) +
        (shift.stage_hands_required || 0) +
        (shift.general_labor_required || 0);

      // Count assigned workers
      const assignedWorkers = shift.assignments?.filter(a => a.user) || [];
      summary.totalWorkerSlotsAssigned += assignedWorkers.length;

      // Worker type breakdown
      summary.workerTypeBreakdown.crew_chief.required += shift.crew_chief_required || 0;
      summary.workerTypeBreakdown.fork_operator.required += shift.fork_operators_required || 0;
      summary.workerTypeBreakdown.stage_hand.required += shift.stage_hands_required || 0;
      summary.workerTypeBreakdown.general_labor.required += shift.general_labor_required || 0;

      assignedWorkers.forEach(assignment => {
        const workerType = assignment.workerType as keyof typeof summary.workerTypeBreakdown;
        if (summary.workerTypeBreakdown[workerType]) {
          summary.workerTypeBreakdown[workerType].assigned++;
        }
      });

      // Shift status breakdown
      const status = shift.status.toLowerCase() as keyof typeof summary.shiftStatusBreakdown;
      if (summary.shiftStatusBreakdown[status] !== undefined) {
        summary.shiftStatusBreakdown[status]++;
      }
    });

    // Calculate fill rate
    summary.fillRate = summary.totalWorkerSlotsRequired > 0 
      ? Math.round((summary.totalWorkerSlotsAssigned / summary.totalWorkerSlotsRequired) * 100)
      : 0;

    // Format response data
    const reportData = {
      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        description: job.description,
        location: job.location,
        startDate: job.startDate.toISOString(),
        endDate: job.endDate.toISOString(),
        status: job.status,
        company: job.company
      },
      shifts: shifts.map(shift => ({
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        description: shift.description,
        status: shift.status,
        crew_chief_required: shift.crew_chief_required || 0,
        fork_operators_required: shift.fork_operators_required || 0,
        stage_hands_required: shift.stage_hands_required || 0,
        general_labor_required: shift.general_labor_required || 0,
        assignments: shift.assignments?.map(assignment => ({
          id: assignment.id,
          workerType: assignment.workerType,
          user: assignment.user
        })) || []
      })),
      summary,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      }
    };

    return NextResponse.json(reportData);

  } catch (error) {
    console.error('Error generating job report:', error);
    return NextResponse.json(
      { error: 'Failed to generate job report' },
      { status: 500 }
    );
  }
}

// POST - Generate and optionally save job report
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saveReport, reportName, format } = await request.json();
    const jobId = params.id;

    // Get the report data (reuse GET logic)
    const getResponse = await GET(request, { params });
    const reportData = await getResponse.json();

    if (!getResponse.ok) {
      return getResponse;
    }

    // If saving report, store it in database
    if (saveReport && reportName) {
      const savedReport = await prisma.jobReport.create({
        data: {
          jobId,
          name: reportName,
          format: format || 'json',
          data: JSON.stringify(reportData),
          generatedBy: session.user.id,
          generatedAt: new Date()
        }
      });

      return NextResponse.json({
        ...reportData,
        savedReport: {
          id: savedReport.id,
          name: savedReport.name,
          createdAt: savedReport.createdAt
        }
      });
    }

    return NextResponse.json(reportData);

  } catch (error) {
    console.error('Error generating/saving job report:', error);
    return NextResponse.json(
      { error: 'Failed to generate job report' },
      { status: 500 }
    );
  }
}