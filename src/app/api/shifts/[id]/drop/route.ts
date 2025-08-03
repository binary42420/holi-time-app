import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';
import { differenceInHours } from 'date-fns';
import { WorkerStatus } from '@prisma/client';
// import { pusherClient } from '@/lib/realtime';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const shiftId = params.id;

    const assignment = await prisma.assignedPersonnel.findFirst({
      where: {
        shiftId,
        userId: user.id,
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

    if (!assignment) {
      return NextResponse.json({ error: 'You are not assigned to this shift' }, { status: 403 });
    }

    const now = new Date();
    const shiftStartTime = new Date(assignment.shift.startTime);
    const hoursUntilStart = differenceInHours(shiftStartTime, now);

    // If more than 24 hours away, simply unassign
    if (hoursUntilStart > 24) {
      await prisma.assignedPersonnel.delete({
        where: { id: assignment.id },
      });
      return NextResponse.json({ message: 'You have been successfully removed from the shift.' });
    }

    // If within 24 hours, move to "Up for Grabs"
    await prisma.assignedPersonnel.update({
      where: { id: assignment.id },
      data: {
        status: WorkerStatus.UpForGrabs,
        userId: null, // Unassign the user
      },
    });

    // Create notifications for all eligible users
    const allUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: 'Employee' },
          { role: 'CrewChief' },
        ],
      },
    });

    const notificationPromises = allUsers.map(u =>
      prisma.notification.create({
        data: {
          userId: u.id,
          title: 'Shift Available!',
          message: `A spot for ${assignment.roleCode} at ${assignment.shift.job.company.name} is up for grabs! Location: ${assignment.shift.job.location}, Starts: ${shiftStartTime.toLocaleString()}`,
          relatedShiftId: shiftId,
          type: 'SHIFT_UP_FOR_GRABS',
        },
      })
    );

    await Promise.all(notificationPromises);

    // Trigger real-time notification via Pusher
    if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
      try {
        // Note: This would need server-side Pusher setup for triggering events
        // For now, commenting out to fix build - implement server-side pusher later
        console.log('Would trigger pusher notification for shift availability');
      } catch (error) {
        console.error('Failed to trigger pusher notification:', error);
      }
    }

    return NextResponse.json({ message: 'You have dropped the shift. It is now available for others to claim.' });

  } catch (error) {
    console.error('Error dropping shift:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}