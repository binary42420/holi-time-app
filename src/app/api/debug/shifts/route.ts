import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Skip database operations during build time
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      error: 'Database not available during build',
      shifts: [],
      count: 0
    })
  }

  try {
    // Get all shifts with their company and job names for debugging
    const result = await prisma.$queryRaw`
      SELECT
        s.id,
        s.date,
        c.name as company_name,
        j.name as job_name,
        s.location,
        s.status
      FROM shifts s
      JOIN jobs j ON s."jobId" = j.id
      JOIN companies c ON j."companyId" = c.id
      ORDER BY s.date DESC
    `

    return NextResponse.json({
      success: true,
      shifts: result,
      count: Array.isArray(result) ? result.length : 0
    })

  } catch (error) {
    console.error('Error getting debug shifts:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        shifts: [],
        count: 0
      },
      { status: 500 }
    )
  }
}
