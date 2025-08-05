// Edge Runtime polyfills - must be defined before any imports
(function() {
  'use strict';
  
  if (typeof global === 'undefined') {
    let globalObject: any;
    
    if (typeof globalThis !== 'undefined') {
      globalObject = globalThis;
    } else if (typeof self !== 'undefined') {
      globalObject = self;
    } else {
      globalObject = {};
    }
    
    try {
      Object.defineProperty(globalObject, 'global', {
        value: globalObject,
        writable: true,
        enumerable: false,
        configurable: true
      });
    } catch (e) {
      (globalObject as any).global = globalObject;
    }
    
    // Also ensure globalThis is available
    if (typeof globalThis === 'undefined') {
      try {
        Object.defineProperty(globalObject, 'globalThis', {
          value: globalObject,
          writable: true,
          enumerable: false,
          configurable: true
        });
      } catch (e) {
        (globalObject as any).globalThis = globalObject;
      }
    }
  }
})();

import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = req.nextUrl;

  // Skip CSP entirely in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let cspHeader = '';
  
  if (!isDevelopment) {
    // Generate nonce for CSP
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    
    // Create CSP header with nonce - more permissive for development
    const cspDirectives = [
      "default-src 'self'",
      `connect-src 'self' https://accounts.google.com https://*.google.com https://*.gstatic.com`,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.google.com https://*.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://*.google.com",
      "img-src 'self' data: blob: * https://*.google.com https://*.gstatic.com",
      "font-src 'self' https://fonts.gstatic.com https://*.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com https://*.google.com",
      "frame-src 'self' https://accounts.google.com https://*.google.com",
      "frame-ancestors 'none'",
    ];
    cspHeader = cspDirectives.join('; ');
  }

  // Allow requests for API routes, static files, and auth pages
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/api/') || // Allow all API routes
    pathname.includes('.') ||
    ['/login', '/signup', '/forgot-password', '/reset-password', '/test-completed-shift'].includes(pathname)
  ) {
    const response = NextResponse.next();
    if (!isDevelopment && cspHeader) {
      response.headers.set('Content-Security-Policy', cspHeader);
    }
    return response;
  }

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
      url.pathname = '/unauthorized'; // Or redirect to a generic dashboard
      return NextResponse.redirect(url);
    }
  }

  // Apply CSP header to all other requests (disabled for development OAuth testing)
  const response = NextResponse.next();
  if (!isDevelopment && cspHeader) {
    response.headers.set('Content-Security-Policy', cspHeader);
  }
  return response;
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