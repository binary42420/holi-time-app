import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/services/google-drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
    }

    // Download the file
    const fileBuffer = await downloadFile(fileId, accessToken);

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Validate the template format
    const headers = data[0] as string[];
    const expectedHeaders = [
      'Date',
      'Start Time',
      'End Time',
      'Hours',
      'Employee',
      'Role',
      'Customer',
      'Project',
      'Notes'
    ];

    // Check if all expected headers are present
    const missingHeaders = expectedHeaders.filter(
      header => !headers.includes(header)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json({
        error: 'Invalid template format',
        missingHeaders,
        template: {
          headers: expectedHeaders,
          example: expectedHeaders.map(header => {
            switch (header) {
              case 'Date': return '2024-01-01';
              case 'Start Time': return '09:00';
              case 'End Time': return '17:00';
              case 'Hours': return '8';
              case 'Employee': return 'John Doe';
              case 'Role': return 'Employee';
              case 'Customer': return 'ABC Corp';
              case 'Project': return 'Project X';
              case 'Notes': return 'Regular shift';
              default: return '';
            }
          })
        }
      }, { status: 400 });
    }

    // Return the parsed data
    return NextResponse.json({
      headers,
      rows: data.slice(1), // Exclude headers
      preview: data.slice(1, 6) // First 5 rows for preview
    });
  } catch (error) {
    console.error('Error extracting file data:', error);
    return NextResponse.json(
      { error: 'Failed to extract file data' },
      { status: 500 }
    );
  }
}
