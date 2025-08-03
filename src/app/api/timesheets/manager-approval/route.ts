import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface ManagerApprovalRequest {
  timesheetId: string
  notes?: string | null
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  if (user.role !== 'Admin') {
    return NextResponse.json(
      { error: 'Manager authorization required' },
      { status: 401 }
    )
  }

  const body: ManagerApprovalRequest = await request.json()
  
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: body.timesheetId },
    include: { shift: { include: { job: true } } }
  })

  if (!timesheet) {
    return NextResponse.json(
      { error: 'Timesheet not found' },
      { status: 404 }
    )
  }

  if (timesheet.status !== 'PENDING_MANAGER_APPROVAL') {
    return NextResponse.json(
      { error: 'Timesheet is not ready for final approval' },
      { status: 400 }
    )
  }

  try {
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: body.timesheetId },
      data: { 
        status: 'COMPLETED',
        manager_approved_at: new Date(),
        manager_notes: body.notes ?? null,
        managerApprovedBy: user.id
      }
    })

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet
    })

  } catch (error) {
    console.error('Error finalizing timesheet:', error)
    return NextResponse.json(
      { error: 'Failed to finalize timesheet' },
      { status: 500 }
    )
  }
}
