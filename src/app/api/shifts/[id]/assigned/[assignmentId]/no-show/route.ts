import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const { assignmentId } = params

    await prisma.assignedPersonnel.update({
      where: { id: assignmentId },
      data: { status: 'No Show' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking as no-show:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}