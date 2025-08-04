import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { hasAnyRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { userValidation } from '@/lib/validation';

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

    // Only managers can view other users, or users can view themselves
    if (user.role !== UserRole.Admin && user.id !== id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const userData = await prisma.user.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            shift: {
              include: {
                job: true,
                timesheets: true,
              },
            },
            timeEntries: true,
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare user data with avatar information
    const userResponse = {
      ...userData,
      // If user has base64 data in avatarData, provide a URL to access it
      avatarUrl: userData.avatarData 
        ? `/api/users/${id}/avatar/image` 
        : null,
    };

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    
    // Users can update their own profile, admins can update any user
    if (user.role !== UserRole.Admin && user.id !== id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    const body = await request.json();
    console.log('Received body:', body);

    // Transform camelCase to snake_case for Prisma
    const { crewChiefEligible, forkOperatorEligible, avatarUrl, ...rest } = body;
    
    // If user is updating their own profile, only allow basic fields
    let data;
    if (user.id === id && user.role !== UserRole.Admin) {
      // Non-admin users can only update basic profile info
      data = {
        name: rest.name,
        email: rest.email,
        avatarData: avatarUrl,
      };
    } else {
      // Admins can update all fields
      data = {
        ...rest,
        ...(avatarUrl !== undefined && { avatarData: avatarUrl }),
        ...(crewChiefEligible !== undefined && { crew_chief_eligible: crewChiefEligible }),
        ...(forkOperatorEligible !== undefined && { fork_operator_eligible: forkOperatorEligible }),
      };
    }

    // Remove undefined values
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    // Skip validation for basic profile updates
    let validation;
    if (user.id === id && user.role !== UserRole.Admin) {
      validation = { success: true, data };
    } else {
      validation = userValidation.update.safeParse(data);
    }

    if (!validation.success) {
      console.error('Validation failed:', {
        data,
        errors: validation.error.flatten().fieldErrors,
        issues: validation.error.issues
      });
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);

    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid company reference. The specified company does not exist.' },
          { status: 400 }
        );
      }
      if (error.message.includes('companyId')) {
        return NextResponse.json(
          { error: 'Invalid company ID provided.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Only admins can delete users
    if (user.role !== UserRole.Admin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists and get all related data
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            timeEntries: true,
            permissions: true,
          }
        },
        notifications: true,
        announcements: true,
        passwordResetTokens: true,
      }
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Use a transaction to handle cascading deletes properly
    await prisma.$transaction(async (tx) => {
      console.log(`Starting delete transaction for user ${id}`);
      
      // Get all assigned personnel IDs for this user
      const assignedPersonnelIds = userToDelete.assignments.map(ap => ap.id);
      console.log(`Found ${assignedPersonnelIds.length} assigned personnel records`);

      if (assignedPersonnelIds.length > 0) {
        // Delete crew chief permissions first (they reference assignedPersonnel)
        console.log('Deleting crew chief permissions...');
        const deletedPermissions = await tx.crewChiefPermission.deleteMany({
          where: {
            assignedPersonnelId: {
              in: assignedPersonnelIds
            }
          }
        });
        console.log(`Deleted ${deletedPermissions.count} crew chief permissions`);

        // Delete time entries (they reference assignedPersonnel)
        console.log('Deleting time entries...');
        const deletedTimeEntries = await tx.timeEntry.deleteMany({
          where: {
            assignedPersonnelId: {
              in: assignedPersonnelIds
            }
          }
        });
        console.log(`Deleted ${deletedTimeEntries.count} time entries`);

        // Delete assigned personnel records
        console.log('Deleting assigned personnel...');
        const deletedAssignedPersonnel = await tx.assignedPersonnel.deleteMany({
          where: { userId: id }
        });
        console.log(`Deleted ${deletedAssignedPersonnel.count} assigned personnel records`);
      }

      // Delete notifications
      console.log('Deleting notifications...');
      const deletedNotifications = await tx.notification.deleteMany({
        where: { userId: id }
      });
      console.log(`Deleted ${deletedNotifications.count} notifications`);

      // Delete announcements created by this user
      console.log('Deleting announcements...');
      const deletedAnnouncements = await tx.announcement.deleteMany({
        where: { createdById: id }
      });
      console.log(`Deleted ${deletedAnnouncements.count} announcements`);

      // Password reset tokens will be deleted automatically due to onDelete: Cascade
      console.log('Password reset tokens will be auto-deleted due to cascade');

      // Finally, delete the user
      console.log('Deleting user...');
      await tx.user.delete({
        where: { id }
      });
      console.log('User deleted successfully');
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });

    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { 
            error: 'Cannot delete user due to existing references. Please remove all associated data first.',
            details: error.message 
          },
          { status: 400 }
        );
      }
      if (error.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Return the actual error message for debugging
      return NextResponse.json(
        { 
          error: 'Database error occurred',
          details: error.message,
          type: error.name
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
