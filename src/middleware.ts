// Minimal Edge Runtime compatible middleware
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files, API routes, and public pages
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    [
      '/', 
      '/login', 
      '/signup', 
      '/forgot-password', 
      '/reset-password', 
      '/test-completed-shift',
      '/unauthorized'
    ].includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Basic session check using NextAuth cookies
  const sessionToken = req.cookies.get('next-auth.session-token')?.value || 
                      req.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // If no session token, redirect to login
  if (!sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Allow authenticated requests to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};