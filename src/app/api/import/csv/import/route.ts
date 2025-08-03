import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { CSVRow } from '@/lib/types/csv'

interface ImportSummary {
  customers: { created: number; updated: number }
  jobs: { created: number; updated: number }
  shifts: { created: number; updated: number }
  users: { created: number; updated: number }
  assignments: { created: number; updated: number }
  timeEntries: { created: number; updated: number }
  errors: Array<{ rowNumber: number; error: string }>
}

async function createOrUpdateCustomer(customerName: string, contactName?: string, contactPhone?: string) {
  // Check if customer exists (customers are stored as users with role 'Customer')
  const existingClient = await prisma.user.findFirst({
    where: {
      role: 'CompanyUser',
      OR: [
        { company: { name: { equals: customerName, mode: 'insensitive' } } },
        { name: { equals: customerName, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });

  if (existingClient) {
    const clientId = existingClient.id;

    // Update contact info if provided
    if (contactName || contactPhone) {
      await prisma.user.update({
        where: { id: clientId },
        data: {
          name: contactName || undefined,
          // Assuming phone is on the user model
        },
      });
      return { id: clientId, created: false };
    }

    return { id: clientId, created: false };
  }

  // Create new client user
  const email = `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.temp`
  const result = await prisma.user.create({
    data: {
      name: contactName || customerName,
      email,
      passwordHash: 'temp_password_change_required',
      role: 'CompanyUser',
      company: {
        create: {
          name: customerName,
        },
      },
    },
    select: { id: true },
  });

  return { id: result.id, created: true };
}

async function createOrUpdateJob(companyId: string, jobName: string, jobStartDate?: string) {
  const existingJob = await prisma.job.findFirst({
    where: {
      companyId,
      name: { equals: jobName, mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (existingJob) {
    return { id: existingJob.id, created: false };
  }

  const result = await prisma.job.create({
    data: {
      companyId,
      name: jobName,
      description: jobStartDate ? `Start Date: ${jobStartDate}` : null,
    },
    select: { id: true },
  });

  return { id: result.id, created: true };
}

async function createOrUpdateShift(jobId: string, shiftDate: string, startTime: string, endTime: string) {
  const shiftDateTime = new Date(`${shiftDate}T${startTime}`);
  const existingShift = await prisma.shift.findFirst({
    where: {
      jobId,
      date: shiftDateTime,
      startTime: shiftDateTime,
    },
    select: { id: true },
  });

  if (existingShift) {
    return { id: existingShift.id, created: false };
  }

  const result = await prisma.shift.create({
    data: {
      jobId,
      date: shiftDateTime,
      startTime: shiftDateTime,
      endTime: endTime ? new Date(`${shiftDate}T${endTime}`) : null,
      status: 'Pending',
      requestedWorkers: 1,
    },
    select: { id: true },
  });

  return { id: result.id, created: true };
}

async function createOrUpdateUser(employeeName: string, employeeEmail?: string, employeePhone?: string) {
  let existingUser;

  if (employeeEmail) {
    existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: employeeEmail, mode: 'insensitive' },
        role: { in: ['Staff', 'CrewChief', 'Admin'] },
      },
      select: { id: true },
    });
  }

  if (!existingUser) {
    existingUser = await prisma.user.findFirst({
      where: {
        name: { equals: employeeName, mode: 'insensitive' },
        role: { in: ['Staff', 'CrewChief', 'Admin'] },
      },
      select: { id: true },
    });
  }

  if (existingUser) {
    const userId = existingUser.id;

    if (employeeEmail || employeePhone) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: employeeEmail || undefined,
        },
      });
      return { id: userId, created: false };
    }

    return { id: userId, created: false };
  }

  // Create new user
  const email = employeeEmail || `${employeeName.toLowerCase().replace(/\s+/g, '.')}@temp.local`
  const result = await prisma.user.create({
    data: {
      name: employeeName,
      email,
      passwordHash: 'temp_password_change_required',
      role: 'Staff',
      isActive: true,
    },
    select: { id: true },
  });

  return { id: result.id, created: true };
}

async function createAssignment(shiftId: string, userId: string, workerType: string) {
  const existingAssignment = await prisma.assignedPersonnel.findFirst({
    where: {
      shiftId,
      userId,
    },
    select: { id: true },
  });

  if (existingAssignment) {
    return { id: existingAssignment.id, created: false };
  }

  const result = await prisma.assignedPersonnel.create({
    data: {
      shiftId,
      userId,
      roleCode: workerType,
    },
    select: { id: true },
  });

  return { id: result.id, created: true };
}

async function createTimeEntries(assignedPersonnelId: string, clockTimes: Array<{clockIn: string, clockOut: string}>) {
  let created = 0;

  for (let i = 0; i < clockTimes.length; i++) {
    const { clockIn, clockOut } = clockTimes[i];
    if (!clockIn) continue;

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        assignedPersonnelId,
        entryNumber: i + 1,
      },
    });

    if (existingEntry) continue;

    const clockInTimestamp = clockIn ? new Date(`1970-01-01T${clockIn}:00`) : null;
    const clockOutTimestamp = clockOut ? new Date(`1970-01-01T${clockOut}:00`) : null;

    await prisma.timeEntry.create({
      data: {
        assignedPersonnelId,
        entryNumber: i + 1,
        clockIn: clockInTimestamp,
        clockOut: clockOutTimestamp,
        isActive: !clockOut,
      },
    });

    created++;
  }

  return created;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { data }: { data: CSVRow[] } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data provided' },
        { status: 400 }
      )
    }

    console.log('CSV Import: Starting import process with', data.length, 'rows')

    const summary: ImportSummary = {
      customers: { created: 0, updated: 0 },
      jobs: { created: 0, updated: 0 },
      shifts: { created: 0, updated: 0 },
      users: { created: 0, updated: 0 },
      assignments: { created: 0, updated: 0 },
      timeEntries: { created: 0, updated: 0 },
      errors: []
    }

    // Process each row
    for (const row of data) {
      try {
        console.log(`CSV Import: Processing row ${row._rowNumber}:`, {
          client: row.client_name,
          job: row.job_name,
          employee: row.employee_name,
          shift_date: row.shift_date
        })

        // Skip rows with validation errors
        if (row._errors && row._errors.length > 0) {
          console.log(`CSV Import: Skipping row ${row._rowNumber} due to validation errors:`, row._errors)
          summary.errors.push({
            rowNumber: row._rowNumber,
            error: `Validation errors: ${row._errors.join(', ')}`
          })
          continue
        }

        // Create/update client
        console.log(`CSV Import: Creating/updating client: ${row.client_name}`)
        const clientResult = await createOrUpdateCustomer(
          row.client_name,
          row.contact_name,
          row.contact_phone
        )
        console.log(`CSV Import: Customer result:`, clientResult)
        if (clientResult.created) summary.customers.created++
        else summary.customers.updated++

        // Create/update job
        const jobResult = await createOrUpdateJob(
          clientResult.id,
          row.job_name,
          row.job_start_date
        )
        if (jobResult.created) summary.jobs.created++
        else summary.jobs.updated++

        // Create/update shift
        const shiftResult = await createOrUpdateShift(
          jobResult.id,
          row.shift_date,
          row.shift_start_time,
          row.shift_end_time
        )
        if (shiftResult.created) summary.shifts.created++
        else summary.shifts.updated++

        // Create/update user
        const userResult = await createOrUpdateUser(
          row.employee_name,
          row.employee_email,
          row.employee_phone
        )
        if (userResult.created) summary.users.created++
        else summary.users.updated++

        // Create assignment
        const assignmentResult = await createAssignment(
          shiftResult.id,
          userResult.id,
          row.worker_type
        )
        if (assignmentResult.created) summary.assignments.created++
        else summary.assignments.updated++

        // Create time entries
        const clockTimes = [
          { clockIn: row.clock_in_1, clockOut: row.clock_out_1 },
          { clockIn: row.clock_in_2, clockOut: row.clock_out_2 },
          { clockIn: row.clock_in_3, clockOut: row.clock_out_3 }
        ].filter(entry => entry.clockIn)

        const timeEntriesCreated = await createTimeEntries(assignmentResult.id, clockTimes)
        summary.timeEntries.created += timeEntriesCreated

      } catch (error) {
        console.error(`Error processing row ${row._rowNumber}:`, error)
        summary.errors.push({
          rowNumber: row._rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('CSV Import: Final summary:', summary)

    return NextResponse.json({
      success: true,
      summary
    })

  } catch (error) {
    console.error('Error importing CSV data:', error)
    return NextResponse.json(
      { error: 'Failed to import CSV data' },
      { status: 500 }
    )
  }
}
