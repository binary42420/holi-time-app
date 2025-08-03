import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - Get notifications for current user
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
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { userId: user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const result = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get unread count
    const unreadCountResult = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications: result.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        relatedTimesheetId: n.relatedTimesheetId,
        relatedShiftId: n.relatedShiftId,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount: unreadCountResult,
      total: result.length,
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      userId, 
      type, 
      title, 
      message, 
      relatedTimesheetId, 
      relatedShiftId 
    } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      );
    }

    const result = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedTimesheetId,
        relatedShiftId,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      notification: result
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
