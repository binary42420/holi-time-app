import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { ImportType, CSV_TEMPLATES } from '@/lib/types/csv-enhanced'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const importType = searchParams.get('type') as ImportType

    if (!importType || !CSV_TEMPLATES[importType]) {
      return NextResponse.json(
        { error: 'Invalid import type' },
        { status: 400 }
      )
    }

    const template = CSV_TEMPLATES[importType]
    
    // Create CSV content
    const headers = template.headers.join(',')
    const sampleRows = template.sampleData.map(row => row.join(','))
    
    const csvContent = [headers, ...sampleRows].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="holitime_${importType}_template.csv"`
      }
    })

  } catch (error) {
    console.error('Error generating CSV template:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSV template' },
      { status: 500 }
    )
  }
}