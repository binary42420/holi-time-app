import { prisma } from '../src/lib/prisma';
import { parse } from 'csv-parse/sync';

interface ShiftRecord {
  clientName: string;
  jobName: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
}

async function main() {
  try {
    const csvData = `
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Maktive,Maktive Warehouse,2025-06-02,09:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-20,08:00,17:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,UCSD Commencemnt,2023-10-22,06:00,16:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
Show Imaging,SDFC brand reveal,2023-10-18,08:00,20:00
`;

    const records: ShiftRecord[] = parse(csvData, {
      columns: ['clientName', 'jobName', 'shiftDate', 'shiftStart', 'shiftEnd'],
      skip_empty_lines: true,
    });

    console.log(`Found ${records.length} records to process.`);
    for (const record of records) {
      try {
        console.log(`Processing record: ${JSON.stringify(record)}`);
        // Find or create company
        const company = await prisma.company.upsert({
          where: { name: record.clientName },
          create: {
            name: record.clientName,
          },
          update: {},
        });
        console.log(`Upserted company: ${company.name}`);

        // Find or create job
        const job = await prisma.job.upsert({
          where: { 
            name_companyId: {
              name: record.jobName,
              companyId: company.id,
            }
          },
          create: {
            name: record.jobName,
            companyId: company.id,
            status: 'Pending',
          },
          update: {},
        });
        console.log(`Upserted job: ${job.name}`);

        // Create shift
        const shift = await prisma.shift.create({
          data: {
            date: new Date(record.shiftDate),
            startTime: new Date(`${record.shiftDate}T${record.shiftStart}`),
            endTime: new Date(`${record.shiftDate}T${record.shiftEnd}`),
            jobId: job.id,
            status: 'Pending',
          },
        });
        console.log(`Created shift with ID: ${shift.id}`);

      } catch (error) {
        console.error(`Failed to process record: ${JSON.stringify(record)}`, error);
      }
    }
  } catch (error) {
    console.error('An error occurred during the import process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();