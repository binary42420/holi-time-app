import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { dbQueryService } from '@/lib/services/database-query-service';
import { UserRole, JobStatus, User, Prisma } from '@prisma/client';
import { jobValidation } from '@/lib/validation';
import { handleDatabaseError, createErrorResponse } from '@/lib/api-error-handler';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return createErrorResponse({ message: 'Authentication required', statusCode: 401 });
    }

    if (![UserRole.Admin, UserRole.CompanyUser, UserRole.Employee].includes(user.role as any)) {
      return createErrorResponse({ message: 'Insufficient permissions', statusCode: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'recentShifts';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Use optimized database query service
    const jobs = await dbQueryService.getJobsOptimized({
      companyId: companyId || (user.role === UserRole.CompanyUser ? user.companyId : undefined) || undefined,
      status: status || undefined,
      search: search || undefined,
      sortBy,
      limit,
      userId: user.role === UserRole.Employee ? user.id : undefined, // Filter by assigned jobs for employees
    });

    return NextResponse.json({
      success: true,
      jobs,
      timestamp: new Date().toISOString(),
      count: jobs.length
    });
  } catch (error) {
    console.error('Error getting jobs:', error);
    const apiError = handleDatabaseError(error);
    return createErrorResponse(apiError);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return createErrorResponse({ message: 'Authentication required', statusCode: 401 });
    }

    if (![UserRole.Admin, UserRole.CompanyUser, UserRole.Employee].includes(user.role as any)) {
      return createErrorResponse({ message: 'Insufficient permissions', statusCode: 403 });
    }

    const body = await request.json();
    const validation = jobValidation.create.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    let { name, description, companyId } = validation.data;

    // If the user is a CompanyUser, they can only create jobs for their own company.
    if (user.role === UserRole.CompanyUser) {
      if (!user.companyId) {
        return createErrorResponse({ message: 'You are not associated with a company.', statusCode: 400 });
      }
      // Enforce the companyId to be the user's companyId
      companyId = user.companyId;
    }

    const job = await prisma.job.create({
      data: {
        name,
        description,
        companyId,
      },
    });

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    const apiError = handleDatabaseError(error);
    return createErrorResponse(apiError);
  }
}
