import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import type { ExtractedClient, ExtractedShift, SpreadsheetAnalysis } from '@/lib/services/gemini-ai';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can import data
    if (user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { extractedData }: { extractedData: SpreadsheetAnalysis } = body;

    if (!extractedData || !extractedData.sheets) {
      return NextResponse.json(
        { error: 'Invalid extracted data' },
        { status: 400 }
      );
    }

    const importResults = {
      clients: { created: 0, updated: 0, errors: 0 },
      jobs: { created: 0, updated: 0, errors: 0 },
      shifts: { created: 0, updated: 0, errors: 0 },
      assignments: { created: 0, errors: 0 },
    };

    // Process each sheet
    for (const sheet of extractedData.sheets) {
      // Import clients first
      const clientIdMap = new Map<string, string>();
      
      for (const clientData of sheet.clients) {
        try {
          // Check if client already exists
          const existingClient = await prisma.user.findFirst({
            where: {
              role: 'CompanyUser',
              OR: [
                { name: { equals: clientData.name, mode: 'insensitive' } },
                { company: { name: { equals: clientData.companyName || clientData.name, mode: 'insensitive' } } },
                { email: { equals: clientData.email || '', mode: 'insensitive' } },
              ],
            },
            select: { id: true },
          });

          let clientId: string;

          if (existingClient) {
            clientId = existingClient.id;
            await prisma.user.update({
              where: { id: clientId },
              data: {
                name: clientData.contactPerson || clientData.name,
                company: {
                  update: {
                    name: clientData.companyName || clientData.name,
                    address: clientData.address,
                    phone: clientData.phone,
                  },
                },
                email: clientData.email,
              },
            });
            importResults.clients.updated++;
          } else {
            const newClient = await prisma.user.create({
              data: {
                name: clientData.contactPerson || clientData.name,
                email: clientData.email || `${(clientData.companyName || clientData.name).toLowerCase().replace(/\s+/g, '')}@example.com`,
                role: 'CompanyUser',
                passwordHash: 'temp_password_change_required',
                company: {
                  create: {
                    name: clientData.companyName || clientData.name,
                    address: clientData.address,
                    phone: clientData.phone,
                  },
                },
              },
              select: { id: true },
            });
            clientId = newClient.id;
            importResults.clients.created++;
          }

          clientIdMap.set(clientData.name.toLowerCase(), clientId);
          if (clientData.companyName) {
            clientIdMap.set(clientData.companyName.toLowerCase(), clientId);
          }
        } catch (error) {
          console.error('Error importing client:', error);
          importResults.clients.errors++;
        }
      }

      // Import shifts and create jobs as needed
      const jobIdMap = new Map<string, string>();

      for (const shiftData of sheet.shifts) {
        try {
          // Find client ID
          const clientId = clientIdMap.get(shiftData.clientName.toLowerCase());
          if (!clientId) {
            console.warn(`Customer not found for shift: ${shiftData.clientName}`);
            importResults.shifts.errors++;
            continue;
          }

          // Check if job exists or create it
          let jobId: string;
          const jobKey = `${clientId}-${shiftData.jobName.toLowerCase()}`;
          
          if (jobIdMap.has(jobKey)) {
            jobId = jobIdMap.get(jobKey)!;
          } else {
            const existingJob = await prisma.job.findFirst({
              where: {
                companyId: clientId,
                name: { equals: shiftData.jobName, mode: 'insensitive' },
              },
              select: { id: true },
            });

            if (existingJob) {
              jobId = existingJob.id;
              importResults.jobs.updated++;
            } else {
              const newJob = await prisma.job.create({
                data: {
                  name: shiftData.jobName,
                  description: `Imported job: ${shiftData.jobName}`,
                  companyId: clientId,
                },
                select: { id: true },
              });
              jobId = newJob.id;
              importResults.jobs.created++;
            }
            
            jobIdMap.set(jobKey, jobId);
          }

          // Find crew chief if specified
          let crewChiefId: string | null = null;
          if (shiftData.crewChiefName) {
            const crewChief = await prisma.user.findFirst({
              where: {
                role: { in: ['CrewChief', 'Admin'] },
                name: { contains: shiftData.crewChiefName, mode: 'insensitive' },
              },
              select: { id: true },
            });
            if (crewChief) {
              crewChiefId = crewChief.id;
            }
          }

          // Create shift
          const newShift = await prisma.shift.create({
            data: {
              jobId,
              date: new Date(shiftData.date),
              startTime: new Date(`${shiftData.date}T${shiftData.startTime}`),
              endTime: shiftData.endTime ? new Date(`${shiftData.date}T${shiftData.endTime}`) : null,
              location: shiftData.location,
              // crewChiefId, // This needs to be handled differently as there is no direct relation
              requestedWorkers: shiftData.requestedWorkers || 1,
              notes: shiftData.notes,
              status: 'Pending',
            },
            select: { id: true },
          });

          const shiftId = newShift.id;
          importResults.shifts.created++;

          // Assign personnel if specified
          if (shiftData.assignedPersonnel && shiftData.assignedPersonnel.length > 0) {
            for (const personnel of shiftData.assignedPersonnel) {
              try {
                const employee = await prisma.user.findFirst({
                  where: {
                    role: { in: ['Staff', 'CrewChief'] },
                    name: { contains: personnel.name, mode: 'insensitive' },
                  },
                  select: { id: true },
                });

                if (employee) {
                  await prisma.assignedPersonnel.create({
                    data: {
                      shiftId,
                      userId: employee.id,
                      roleCode: personnel.roleCode || 'GL',
                    },
                  });
                  importResults.assignments.created++;
                }
              } catch (error) {
                console.error('Error assigning personnel:', error);
                importResults.assignments.errors++;
              }
            }
          }
        } catch (error) {
          console.error('Error importing shift:', error);
          importResults.shifts.errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data imported successfully',
      results: importResults,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
