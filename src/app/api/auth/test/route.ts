import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { isBuildTime } from '@/lib/build-time-check';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in build time
    if (isBuildTime()) {
      return NextResponse.json({
        success: false,
        message: 'Build time - skipping database operations',
        buildTime: true
      });
    }

    // Test database connection
    let dbStatus = 'unknown';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      dbStatus = 'error';
    }

    // Test session
    const session = await getServerSession(authOptions);

    // Environment check
    const envCheck = {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL
    };

    return NextResponse.json({
      success: true,
      message: 'Auth test endpoint',
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: session.user?.role
        }
      } : null,
      database: dbStatus,
      environment: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}