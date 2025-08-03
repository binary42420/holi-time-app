import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkNotificationSchema = z.object({
  action: z.enum(['delete', 'mark_read', 'mark_unread']),
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID is required'),
});

// POST /api/notifications/bulk - Perform bulk operations on notifications
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = bulkNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { action, notificationIds } = validation.data;

    // Verify all notifications belong to the user (unless admin)
    const notifications = await prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
      },
      select: { id: true, userId: true },
    });

    if (notifications.length !== notificationIds.length) {
      return NextResponse.json(
        { error: 'Some notifications were not found' },
        { status: 404 }
      );
    }

    // Check permissions - users can only modify their own notifications, admins can modify all
    if (user.role !== 'Admin') {
      const unauthorizedNotifications = notifications.filter(n => n.userId !== user.id);
      if (unauthorizedNotifications.length > 0) {
        return NextResponse.json(
          { error: 'Access denied to some notifications' },
          { status: 403 }
        );
      }
    }

    let result;
    let message;

    switch (action) {
      case 'delete':
        result = await prisma.notification.deleteMany({
          where: {
            id: { in: notificationIds },
            ...(user.role !== 'Admin' ? { userId: user.id } : {}),
          },
        });
        message = `Deleted ${result.count} notifications`;
        break;

      case 'mark_read':
        result = await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            ...(user.role !== 'Admin' ? { userId: user.id } : {}),
          },
          data: { isRead: true },
        });
        message = `Marked ${result.count} notifications as read`;
        break;

      case 'mark_unread':
        result = await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            ...(user.role !== 'Admin' ? { userId: user.id } : {}),
          },
          data: { isRead: false },
        });
        message = `Marked ${result.count} notifications as unread`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message,
      affectedCount: result.count,
    });

  } catch (error) {
    console.error('Error performing bulk notification operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
