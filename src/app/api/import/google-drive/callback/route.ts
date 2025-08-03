import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/services/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Google Drive Callback: Processing OAuth callback');

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      console.log('Google Drive Callback: Missing authorization code');
      return NextResponse.redirect(new URL('/import?error=MissingAuthorizationCode', request.url));
    }

    if (!state) {
      console.log('Google Drive Callback: Missing state');
      return NextResponse.redirect(new URL('/import?error=MissingState', request.url));
    }

    console.log('Google Drive Callback: Exchanging code for tokens');
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      console.error('Google Drive Callback: No access token received');
      return NextResponse.redirect(new URL('/import?error=FailedToGetAccessToken', request.url));
    }

    console.log('Google Drive Callback: Successfully obtained tokens');
    
    const redirectUrl = new URL('/google-drive-callback', request.url);
    redirectUrl.searchParams.set('accessToken', tokens.access_token);
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('refreshToken', tokens.refresh_token);
    }
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to handle OAuth callback';
    return NextResponse.redirect(new URL(`/import?error=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
