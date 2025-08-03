import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user is updating their own password or if they're an admin
    const isOwnPassword = user.id === id;
    const isAdmin = user.role === UserRole.Admin;

    if (!isOwnPassword && !isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If user is updating their own password, verify current password
    if (isOwnPassword && currentPassword) {
      const bcrypt = await import('bcryptjs');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, targetUser.passwordHash);
      
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update only the password field
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    // Log the password update
    console.log(`Password updated for user ${targetUser.email} (${targetUser.name}) by ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
