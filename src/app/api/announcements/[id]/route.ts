import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { announcementValidation } from '@/lib/validation';
import { withValidationAndAuth, pathParamSchemas } from '@/lib/middleware/validation';
import { getCurrentUser } from '@/lib/auth-config';

const getAnnouncementHandler = async (
  _request: NextRequest,
  context: { user: any; params?: { id: string } }
) => {
  try {
    const { id } = context.params!;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
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

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement,
    });

  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const GET = withValidationAndAuth(getAnnouncementHandler, {
  paramsSchema: pathParamSchemas.id,
  resource: 'ANNOUNCEMENT',
  action: 'READ',
});

const updateAnnouncementHandler = async (
  _request: NextRequest,
  context: {
    user: any;
    params: { id: string };
    body: { title?: string; content?: string; date?: string };
  }
) => {
  try {
    const { id } = context.params;
    const { title, content, date } = context.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (date) updateData.date = new Date(date);

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
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
      message: 'Announcement updated successfully',
      announcement,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const PUT = withValidationAndAuth(updateAnnouncementHandler, {
  paramsSchema: pathParamSchemas.id,
  bodySchema: announcementValidation.update,
  resource: 'ANNOUNCEMENT',
  action: 'UPDATE',
});

const deleteAnnouncementHandler = async (
  _request: NextRequest,
  context: { user: any; params: { id: string } }
) => {
  try {
    const { id } = context.params;
    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const DELETE = withValidationAndAuth(deleteAnnouncementHandler, {
  paramsSchema: pathParamSchemas.id,
  resource: 'ANNOUNCEMENT',
  action: 'DELETE',
});
