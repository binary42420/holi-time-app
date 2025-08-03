import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/middleware'
import { UserRole } from '@prisma/client'
import type { CrewChiefPermissionType } from '@/lib/types'

export async function POST(request: NextRequest) {
  const sessionUser = await getCurrentUser(request)
  if (sessionUser?.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, permissionType, targetId } = await request.json()

  if (!userId || !permissionType || !targetId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  if (permissionType !== 'shift') {
    return NextResponse.json(
      { error: 'Only shift-level permissions are currently supported.' },
      { status: 400 }
    )
  }

  try {
    let assignment = await prisma.assignedPersonnel.findFirst({
      where: { userId, shiftId: targetId },
    })

    if (!assignment) {
      assignment = await prisma.assignedPersonnel.create({
        data: {
          userId,
          shiftId: targetId,
          roleCode: 'CC_PERM',
          isPlaceholder: true,
        },
      })
    }

    const newPermission = await prisma.crewChiefPermission.create({
      data: {
        permissionType,
        targetId,
        assignedPersonnelId: assignment.id,
      },
    })

    return NextResponse.json(newPermission, { status: 201 })
  } catch (error) {
    console.error('Error granting permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request)
    if (sessionUser?.role !== UserRole.Admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const permissionType = searchParams.get('permissionType')
    const targetId = searchParams.get('targetId')

    if (!userId || !permissionType || !targetId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const assignments = await prisma.assignedPersonnel.findMany({
      where: { userId, shiftId: targetId },
      select: { id: true },
    })

    if (assignments.length === 0) {
      return NextResponse.json(
        { message: 'Permission not found.' },
        { status: 404 }
      )
    }

    const assignmentIds = assignments.map(a => a.id)

    await prisma.crewChiefPermission.deleteMany({
      where: {
        permissionType: permissionType as CrewChiefPermissionType,
        targetId: targetId,
        assignedPersonnelId: { in: assignmentIds },
      },
    })

    return NextResponse.json({ message: 'Permission revoked' }, { status: 200 })
  } catch (error) {
    console.error('Error revoking permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}