import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const companyId = params.id;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error fetching company:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== UserRole.Admin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const companyId = params.id;
    const body = await request.json();
    const { name, address, phone, email, company_logo_url, isActive, description, website } = body;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        address,
        phone,
        email,
        company_logo_url,
        isActive,
        description,
        website,
      },
    });

    return NextResponse.json({ success: true, company: updatedCompany });
  } catch (error) {
    console.error('Error updating company:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== UserRole.Admin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const companyId = params.id;

    // First, update all users associated with this company to have a null companyId
    await prisma.user.updateMany({
      where: { companyId: companyId },
      data: { companyId: null },
    });
    
    // Then, delete the company
    await prisma.company.delete({
      where: { id: companyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
