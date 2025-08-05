// Middleware runs in Edge Runtime - no polyfills needed

import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/test-completed-shift'].includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Get token for authentication check
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // Redirect unauthenticated users to the login page
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Role-based access control for admin routes
    if (pathname.startsWith('/admin')) {
      if (token.role !== 'Admin') {
        const url = req.nextUrl.clone();
        url.pathname = '/unauthorized';
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to proceed
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes, except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*', // Explicitly include all API routes
  ],
};