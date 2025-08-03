import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { announcementValidation, queryValidation } from '@/lib/validation';
import { withValidationAndAuth } from '@/lib/middleware/validation';

const getAnnouncementsHandler = async (
  _request: NextRequest,
  context: { user: any; query?: any }
) => {
  try {
    const { limit = 20, offset = 0 } = context.query || {};

    const announcements = await prisma.announcement.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.announcement.count();

    return NextResponse.json({
      success: true,
      announcements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const GET = withValidationAndAuth(getAnnouncementsHandler, {
  querySchema: queryValidation.pagination,
  resource: 'ANNOUNCEMENT',
  action: 'READ',
});

const createAnnouncementHandler = async (
  _request: NextRequest,
  context: { user: any; body?: any }
) => {
  try {
    const { title, content, date } = context.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        date: date ? new Date(date) : new Date(),
        createdById: context.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
      announcement,
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const POST = withValidationAndAuth(createAnnouncementHandler, {
  bodySchema: announcementValidation.create,
  resource: 'ANNOUNCEMENT',
  action: 'CREATE',
});
