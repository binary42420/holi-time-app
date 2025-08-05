import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PDFElement {
  id: string;
  type: 'text' | 'table' | 'signature' | 'image';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataKey?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  required: boolean;
}

interface PDFConfiguration {
  id: string;
  name: string;
  pageSize: 'letter' | 'a4';
  pageOrientation: 'portrait' | 'landscape';
  elements: PDFElement[];
  createdAt: string;
  updatedAt: string;
}

// Sample data for demonstration
const sampleData = {
  headerTitle: 'HOLI TIMESHEET',
  jobNumber: 'JOB-2024-001',
  jobName: 'Red Rocks Amphitheater Show',
  customerLabel: 'Customer:',
  customerName: 'Live Nation Entertainment',
  dateLabel: 'Date:',
  date: '2024-01-15',
  employeeTable: [
    { name: 'John Smith', role: 'Crew Chief', hours: '8.0', rate: '$25.00', total: '$200.00' },
    { name: 'Jane Doe', role: 'Stagehand', hours: '8.0', rate: '$20.00', total: '$160.00' },
    { name: 'Mike Johnson', role: 'Fork Operator', hours: '6.0', rate: '$22.00', total: '$132.00' },
  ],
  customerSignatureLabel: 'Customer Signature:',
  customerSignatureBox: '[Signature Area]'
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configuration: PDFConfiguration = await request.json();

    // Create PDF document using jsPDF
    const pdf = new jsPDF(
      configuration.pageOrientation as 'portrait' | 'landscape',
      'pt',
      configuration.pageSize.toUpperCase() as 'LETTER' | 'A4'
    );

    // Render elements based on configuration
    configuration.elements.forEach((element) => {
      const data = sampleData[element.dataKey as keyof typeof sampleData];
      
      switch (element.type) {
        case 'text':
          if (typeof data === 'string') {
            pdf.setFontSize(element.fontSize || 12);
            pdf.setFont('helvetica', element.fontWeight || 'normal');
            pdf.text(data, element.x, element.y, {
              maxWidth: element.width
            });
          }
          break;

        case 'table':
          if (element.dataKey === 'employeeTable' && Array.isArray(data)) {
            // Use autoTable for better table rendering
            const headers = ['Name', 'Role', 'Hours', 'Rate', 'Total'];
            const rows = data.map((row: any) => [
              row.name, row.role, row.hours, row.rate, row.total
            ]);

            pdf.autoTable({
              head: [headers],
              body: rows,
              startY: element.y,
              margin: { left: element.x },
              styles: {
                fontSize: element.fontSize || 8,
                cellPadding: 2,
              },
              headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
              }
            });
          }
          break;

        case 'signature':
          // Draw signature box
          pdf.rect(element.x, element.y, element.width, element.height);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Signature', element.x + 5, element.y + element.height + 10);
          break;

        case 'image':
          // Placeholder for image
          pdf.rect(element.x, element.y, element.width, element.height);
          pdf.setFontSize(8);
          pdf.text('[Image Placeholder]', element.x + 5, element.y + element.height / 2);
          break;
      }
    });

    // Generate PDF buffer
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="timesheet-sample-${Date.now()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating sample PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate sample PDF' },
      { status: 500 }
    );
  }
}