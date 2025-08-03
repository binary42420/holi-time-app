import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companySlug = searchParams.get('company')

    if (!companySlug) {
      return NextResponse.json(
        { error: 'Company parameter is required' },
        { status: 400 }
      )
    }

    // Convert URL-friendly slug back to searchable term
    const companyName = decodeURIComponent(companySlug).replace(/-/g, ' ')

    console.log('Looking for company with name:', companyName)

    const company = await prisma.company.findFirst({
      where: {
        name: {
          contains: companyName,
          mode: 'insensitive',
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error fetching company by slug:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
