/**
 * Build-time check utility for API routes
 * 
 * This utility helps prevent database operations during the build process,
 * which can cause deployment failures when DATABASE_URL is not available.
 */

import { NextResponse } from 'next/server';

/**
 * Checks if we're in build time and should skip database operations
 */
export function isBuildTime(): boolean {
  // During build, NODE_ENV is production but DATABASE_URL might not be available
  return process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;
}

/**
 * Returns a standard build-time response for API routes
 */
export function buildTimeResponse(routeName: string = 'API route'): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Database not available during build',
    message: `${routeName} is skipped during build time`,
    timestamp: new Date().toISOString(),
    buildTime: true
  });
}

/**
 * Wrapper function for API routes that need database access
 * Returns build-time response if in build mode, otherwise executes the handler
 */
export async function withDatabaseCheck<T>(
  routeName: string,
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  if (isBuildTime()) {
    return buildTimeResponse(routeName);
  }
  
  return handler();
}

/**
 * Higher-order function for API route handlers
 * Automatically handles build-time checks
 */
export function withBuildTimeCheck(routeName: string) {
  return function<T extends any[], R>(
    handler: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R | NextResponse> => {
      if (isBuildTime()) {
        return buildTimeResponse(routeName) as R;
      }
      
      return handler(...args);
    };
  };
}

/**
 * Environment check for debugging
 */
export function getEnvironmentInfo() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    isBuildTime: isBuildTime(),
    timestamp: new Date().toISOString()
  };
}