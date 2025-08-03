import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { getAllCompanies } from '@/lib/services/companies';
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !['Admin', 'Manager', 'CrewChief'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const companies = await getAllCompanies(user);

    return NextResponse.json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error('Error getting companies:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !['Admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = companySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, address, phone, email } = validation.data;

    const newCompany = await prisma.company.create({
      data: {
        name,
        address,
        phone,
        email,
      },
    });

    return NextResponse.json({
      success: true,
      company: newCompany,
    });
  } catch (error) {
    console.error('Error creating company:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
