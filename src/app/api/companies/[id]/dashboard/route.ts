import { NextResponse } from 'next/server';
import { dbQueryService } from '@/lib/services/database-query-service';
import { withAuthApi } from '@/lib/auth-api';
import { UserRole } from '@prisma/client';

type RequestContext = {
  params: {
    id: string;
  };
};

async function handler(req: Request, { params }: RequestContext) {
  const { id } = params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
  }

  try {
    // Use optimized database query service
    const dashboardData = await dbQueryService.getCompanyDashboardOptimized(id);

    return NextResponse.json({
      success: true,
      ...dashboardData,
    });
  } catch (error) {
    console.error(`Error fetching company dashboard data for ${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuthApi(
  handler,
  (role: UserRole) => role === 'Admin' || role === 'CompanyUser'
);
