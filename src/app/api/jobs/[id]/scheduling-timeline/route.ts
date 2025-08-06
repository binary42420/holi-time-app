// Enhanced Scheduling Timeline API Route
// Provides comprehensive shift and staffing data for the scheduling timeline dashboard
// Supports advanced filtering, meeting mode features, and real-time updates

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }
    
    // Fetch the job with company
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            company_logo_url: true
          }
        }
      }
    })
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    // Fetch all shifts for this job with assigned personnel
    const shifts = await prisma.shift.findMany({
      where: { jobId },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        assignedPersonnel: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarData: true,
                role: true
              }
            }
          }
        }
      }
    })
    
    // Transform the data for the timeline
    const transformedShifts = shifts.map(shift => {
      // Separate crew chiefs from regular workers
      const crewChiefs = shift.assignedPersonnel
        .filter(ap => ap.roleCode === 'CC')
        .map(ap => ({
          id: ap.id,
          name: ap.user.name,
          avatar: ap.user.avatarData || '',
          status: ap.status,
          roleCode: ap.roleCode
        }))
      
      // Group workers by role code
      const workersByType = shift.assignedPersonnel
        .filter(ap => ap.roleCode !== 'CC')
        .reduce((acc, ap) => {
          const roleCode = ap.roleCode
          if (!acc[roleCode]) {
            acc[roleCode] = []
          }
          
          acc[roleCode].push({
            id: ap.id,
            name: ap.user.name,
            avatar: ap.user.avatarData || '',
            status: ap.status,
            roleCode: ap.roleCode
          })
          
          return acc
        }, {} as Record<string, any>)
      
      return {
        id: shift.id,
        date: shift.date.toISOString(),
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        status: shift.status,
        location: shift.location || '',
        description: shift.description || '',
        department: shift.department || 'General', // Default department for filtering
        notes: shift.notes || '',
        requestedWorkers: shift.requestedWorkers || 0,
        requiredCrewChiefs: shift.requiredCrewChiefs || 0,
        requiredStagehands: shift.requiredStagehands || 0,
        requiredForkOperators: shift.requiredForkOperators || 0,
        requiredReachForkOperators: shift.requiredReachForkOperators || 0,
        requiredRiggers: shift.requiredRiggers || 0,
        requiredGeneralLaborers: shift.requiredGeneralLaborers || 0,
        crewChiefs,
        workers: workersByType,
        // Additional metadata for enhanced features (handle missing fields gracefully)
        createdAt: shift.createdAt ? shift.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: shift.updatedAt ? shift.updatedAt.toISOString() : new Date().toISOString(),
        // Calculate staffing metrics
        totalAssigned: crewChiefs.length + Object.values(workersByType).flat().length,
        staffingCompletion: Math.round(
          ((crewChiefs.length + Object.values(workersByType).flat().length) / 
           Math.max(shift.requestedWorkers || 1, 1)) * 100
        )
      }
    })
    
    return NextResponse.json({
      job: {
        id: job.id,
        name: job.name,
        description: job.description || '',
        status: job.status,
        startDate: job.startDate?.toISOString() || new Date().toISOString(),
        endDate: job.endDate?.toISOString() || new Date().toISOString(),
        location: job.location || '',
        company: {
          id: job.company.id,
          name: job.company.name,
          logo: job.company.company_logo_url || ''
        }
      },
      shifts: transformedShifts
    })
  } catch (error) {
    console.error('Error fetching scheduling timeline data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduling timeline data' },
      { status: 500 }
    )
  }
}
