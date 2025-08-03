import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/services/google-drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    console.log('Google Drive Auth: Starting authentication process');

    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Google Drive Auth: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Google Drive Auth: User authenticated:', session.user.id);

    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Google Drive Auth: Missing Google OAuth credentials');
      return NextResponse.json(
        { error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    // Generate OAuth URL with user ID from session
    const { authUrl, state } = generateAuthUrl(session.user.id);

    console.log('Google Drive Auth: Generated auth URL successfully');

    return NextResponse.json({ authUrl, state });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
