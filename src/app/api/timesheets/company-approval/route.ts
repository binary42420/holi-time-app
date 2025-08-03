import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { verifySignatureRequest } from '@/lib/auth'

interface CompanyApprovalRequest {
  timesheetId: string
  signatureData: string
  notes?: string | null
}

interface PdfGenerationResponse {
  pdfUrl: string
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const body: CompanyApprovalRequest = await request.json()
  
  // Verify request is from authorized company user
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: body.timesheetId },
    include: { shift: { include: { job: { include: { company: true } } } } }
  })

  if (!timesheet) {
    return NextResponse.json(
      { error: 'Timesheet not found' },
      { status: 404 }
    )
  }

  const isAllowed = verifySignatureRequest(timesheet.shift.job.company.id, user.id)
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Unauthorized to approve this timesheet' },
      { status: 403 }
    )
  }

  if (timesheet.status !== 'PENDING_COMPANY_APPROVAL') {
    return NextResponse.json(
      { error: 'Timesheet is not in pending company approval state' },
      { status: 400 }
    )
  }

  try {
    // Update timesheet status and store signature + notes
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: body.timesheetId },
      data: {
        status: 'PENDING_MANAGER_APPROVAL',
        company_signature: body.signatureData,
        company_approved_at: new Date(),
        company_notes: body.notes ?? null,
        companyApprovedBy: user.id
      }
    })

    if (!process.env.GOOGLE_APPS_SCRIPT_URL || !process.env.GOOGLE_APPS_SCRIPT_API_KEY) {
      throw new Error('PDF generation service is not configured')
    }

    // Initiate Google Sheets PDF generation
    const res = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timesheetId: updatedTimesheet.id,
        apiKey: process.env.GOOGLE_APPS_SCRIPT_API_KEY,
        companySignatureBase64: body.signatureData
      })
    })

    if (!res.ok) {
      throw new Error('Failed to generate PDF')
    }

    const responseData = await res.json() as PdfGenerationResponse

    // Store PDF URL in database
    await prisma.timesheet.update({
      where: { id: updatedTimesheet.id },
      data: { signed_pdf_url: responseData.pdfUrl }
    })

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet,
      pdfUrl: responseData.pdfUrl
    })

  } catch (error) {
    console.error('Error approving timesheet:', error)
    return NextResponse.json(
      { error: 'Failed to approve timesheet' },
      { status: 500 }
    )
  }
}
