import { NextRequest, NextResponse } from 'next/server';
import { listSpreadsheetFiles } from '@/lib/services/google-drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Google Drive Files: Starting file listing request');

    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Google Drive Files: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Google Drive Files: User authenticated:', session.user.id);

    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Google Drive Files: Missing or invalid authorization header');
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Google Drive Files: Access token received, length:', accessToken.length);

    const files = await listSpreadsheetFiles(accessToken);
    console.log('Google Drive Files: Successfully retrieved', files.length, 'files');

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing Drive files:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to list Drive files';
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
        errorMessage = 'Google Drive access token has expired. Please reconnect.';
      } else if (error.message.includes('insufficient permissions')) {
        errorMessage = 'Insufficient permissions to access Google Drive files.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
