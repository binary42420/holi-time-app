import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { dbQueryService } from '@/lib/services/database-query-service';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.nativeEnum(UserRole),
  companyId: z.string().optional(),
});


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
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const excludeCompanyUsers = searchParams.get('excludeCompanyUsers') === 'true';
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Use optimized database query service
    const result = await dbQueryService.getUsersOptimized({
      role: role && Object.values(UserRole).includes(role as UserRole) ? role as UserRole : undefined,
      companyId: user.role === UserRole.CompanyUser ? user.companyId || undefined : undefined,
      isActive: status === 'active' ? true : status === 'inactive' ? false : true,
      excludeCompanyUsers,
      search,
      page,
      pageSize,
      fetchAll,
    });

    return NextResponse.json({
      success: true,
      users: result.users,
      pagination: {
        page: result.currentPage,
        pageSize: fetchAll ? result.total : pageSize,
        totalPages: result.pages,
        totalUsers: result.total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can create users
    if (user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = userSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { name, email, password, role, companyId } = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email address already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate avatar data URL for new users
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&size=128`;

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        avatarData: avatarUrl, // Store in avatarData instead of avatarUrl
        companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
