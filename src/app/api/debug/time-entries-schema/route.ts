import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Skip database operations during build time
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      error: 'Database not available during build',
      schema: []
    })
  }

  try {
    // Get the table schema
    const schemaResult = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'time_entries'
      ORDER BY ordinal_position
    `

    return NextResponse.json({
      success: true,
      schema: schemaResult
    })

  } catch (error) {
    console.error('Error getting time_entries schema:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        schema: []
      },
      { status: 500 }
    )
  }
}
