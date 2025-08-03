/**
 * API endpoint for shift management by date ranges.
 * 
 * Provides filtered, paginated access to shift records with:
 * - Date range filtering (today, week, custom)
 * - Status filtering
 * - Customer/job filtering
 * - Role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Retrieves shifts with optional date range and status filters 
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('filter') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const today = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (dateFilter === 'today') {
      startDate = endDate = today.toISOString().split('T')[0];
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = addDays(today, 1);
      startDate = endDate = tomorrow.toISOString().split('T')[0];
    } else if (dateFilter === 'yesterday') {
      const yesterday = subDays(today, 1);
      startDate = endDate = yesterday.toISOString().split('T')[0];
    } else if (dateFilter === 'this_week') {
      startDate = startOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
      endDate = endOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
    }

    // Build dynamic WHERE clauses based on filters
    const where: any = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (statusFilter !== 'all') {
      where.status = statusFilter;
    }
    const companyFilter = searchParams.get('company') || 'all';
    if (companyFilter !== 'all') {
      where.job = { company: { name: companyFilter } };
    }
    const searchTerm = searchParams.get('search') || '';
    if (searchTerm) {
      where.OR = [
        { job: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { job: { company: { name: { contains: searchTerm, mode: 'insensitive' } } } },
        // { location: { contains: searchTerm, mode: 'insensitive' } },
        { assignedPersonnel: { some: { user: { name: { contains: searchTerm, mode: 'insensitive' } } } } },
      ];
    }

    const result = await prisma.shift.findMany({
      where,
      include: {
        job: { include: { company: true } },
        timesheets: true,
        assignedPersonnel: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const shifts = result.map((shift: any) => ({
      ...shift,
      jobId: shift.job.id,
      jobName: shift.job.name,
      companyId: shift.job.company.id,
      companyName: shift.job.company.name,
      timesheetId: shift.timesheet?.id,
      timesheetStatus: shift.timesheet?.status,
      assignedCount: shift.assignedPersonnel.length,
      crewChiefId: shift.assignedPersonnel.find(p => p.roleCode === 'CC')?.userId,
      crewChiefName: shift.assignedPersonnel.find(p => p.roleCode === 'CC')?.user.name,
      crewChiefAvatar: shift.assignedPersonnel.find(p => p.roleCode === 'CC')?.user.avatarUrl,
      assignedPersonnel: shift.assignedPersonnel.map(p => ({
        id: p.id,
        employee: {
          id: p.userId,
          name: p.user.name,
          avatar: p.user.avatarUrl || '',
        },
        roleCode: p.roleCode,
        isPlaceholder: p.isPlaceholder,
      })),
    }));

    // Apply role-based access control filters
    let filteredShifts = shifts;
    if (user.role === UserRole.CrewChief) {
      filteredShifts = shifts.filter(shift => shift.assignedPersonnel.some(p => p.userId === user.id && p.roleCode === 'CC'));
    } else if (user.role === UserRole.Staff || user.role === UserRole.Employee) {
      filteredShifts = shifts.filter(shift =>
        shift.assignedPersonnel.some((p: any) => p.employee.id === user.id)
      );
    }
    // Admin and Customer users see all shifts (customers will be filtered by their jobs in future)

    // Filter by companyId if provided and user is Customer or Admin
    const companyIdParam = searchParams.get('companyId');
    if (companyIdParam && (user.role === UserRole.CompanyUser || user.role === UserRole.Admin)) {
      filteredShifts = filteredShifts.filter(shift => shift.companyId === companyIdParam);
    }

    if (user.role === UserRole.CompanyUser && user.companyId) {
      filteredShifts = filteredShifts.filter(shift => shift.companyId === user.companyId);
    }

    // Return paginated, filtered shifts with date range info
    return NextResponse.json({
      success: true,
      shifts: filteredShifts,
      dateRange: { startDate, endDate, filter: dateFilter }
    });


  } catch (error) {
    console.error('Error getting shifts by date:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
