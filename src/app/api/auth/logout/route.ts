import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the cookie with same attributes as when it was set
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    };

    // Clear using both methods to ensure consistency
    cookieStore.set('auth-token', '', cookieOptions);
    response.cookies.set('auth-token', '', cookieOptions);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
