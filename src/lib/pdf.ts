import { prisma } from '@/lib/prisma';
import { generateTimesheetExcel } from '@/lib/excel-generator';
import { uploadToGCS } from '@/lib/gcs';
import libre from 'libreoffice-convert';
import util from 'util';
import { PrismaClient } from '@prisma/client';
import { Buffer } from 'buffer';

const convertAsync = util.promisify(libre.convert);

/**
 * Generates a PDF for a given timesheet, uploads it to GCS, and returns the public URL.
 * This function can be used within a Prisma transaction.
 * @param timesheetId The ID of the timesheet to generate the PDF for.
 * @param tx A Prisma transaction client, if operating within a transaction.
 * @returns The public URL of the generated PDF.
 */
export async function generateTimesheetPdf(
  timesheetId: string,
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
): Promise<string> {
  const db = tx || prisma;

  // The excel generator already fetches all the data it needs.
  // We can call it directly.
  const workbook = await generateTimesheetExcel(timesheetId);
  const excelBuffer = await workbook.xlsx.writeBuffer();

  // Convert Excel buffer to PDF buffer
  const pdfBuffer = await convertAsync(Buffer.from(excelBuffer), '.pdf', undefined);

  // Define a unique path for the PDF in GCS
  const destination = `timesheets/${timesheetId}/signed-timesheet.pdf`;

  // Upload the PDF to GCS
  const publicUrl = await uploadToGCS(pdfBuffer, destination, 'application/pdf');

  return publicUrl;
}