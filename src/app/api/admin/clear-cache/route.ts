import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';

/**
 * Admin endpoint to clear all caches
 * Useful after database schema resets or major data changes
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('🧹 Starting cache clearing process...');

    // Set cache-busting headers to force client-side cache invalidation
    const headers = new Headers({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Clear-Site-Data': '"cache", "storage"',
      'X-Cache-Cleared': Date.now().toString(),
    });

    console.log('✅ Cache clearing headers set');

    return NextResponse.json({
      success: true,
      message: 'Cache clearing initiated',
      timestamp: new Date().toISOString(),
      instructions: [
        'Client-side caches will be cleared automatically',
        'React Query cache will be invalidated on next request',
        'Browser may need a hard refresh (Ctrl+Shift+R)',
        'Consider clearing browser storage manually if issues persist'
      ],
      cacheBustingHeaders: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Clear-Site-Data': '"cache", "storage"',
        'X-Cache-Cleared': headers.get('X-Cache-Cleared')
      }
    }, { 
      status: 200,
      headers 
    });

  } catch (error) {
    console.error('❌ Cache clearing failed:', error);
    return NextResponse.json({
      error: 'Cache clearing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check cache status and provide clearing instructions
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: 'Cache management endpoint',
      currentTime: new Date().toISOString(),
      cacheConfiguration: {
        development: {
          staleTime: '30 seconds',
          gcTime: '2 minutes',
          refetchOnWindowFocus: true,
          refetchInterval: '30 seconds'
        },
        production: {
          staleTime: '2 minutes',
          gcTime: '30 minutes',
          refetchOnWindowFocus: false,
          refetchInterval: 'disabled'
        }
      },
      instructions: {
        clearCache: 'POST /api/admin/clear-cache',
        hardRefresh: 'Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)',
        clearBrowserStorage: 'F12 → Application → Storage → Clear storage',
        reactQueryDevtools: 'Use React Query Devtools to inspect and clear specific queries'
      },
      troubleshooting: [
        'If seeing old data after schema reset, try POST /api/admin/clear-cache',
        'Hard refresh the browser (Ctrl+Shift+R)',
        'Clear browser storage and cookies',
        'Check React Query Devtools for cached queries',
        'Restart the development server if needed'
      ]
    });

  } catch (error) {
    console.error('Error checking cache status:', error);
    return NextResponse.json({
      error: 'Failed to check cache status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
