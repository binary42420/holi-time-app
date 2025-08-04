import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: timesheetId } = params;
    
    // Redirect to the working jsPDF-based PDF generation route
    const baseUrl = request.nextUrl.origin;
    const redirectUrl = `${baseUrl}/api/timesheets/${timesheetId}/download-pdf-simple`;
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in PDF route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
