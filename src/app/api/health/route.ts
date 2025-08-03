import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isBuildTime, getEnvironmentInfo } from '@/lib/build-time-check';

async function checkDatabaseHealth() {
  // Skip database check during build time
  if (isBuildTime()) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

export async function GET() {
  try {
    // During build time, return a basic health status without database check
    if (isBuildTime()) {
      return NextResponse.json({
        status: 'build-time',
        database: 'not-available-during-build',
        timestamp: new Date().toISOString(),
        message: 'Application is being built - database checks skipped',
        environment: getEnvironmentInfo()
      });
    }

    const dbHealthy = await checkDatabaseHealth();
    
    if (!dbHealthy) {
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          database: 'disconnected',
          timestamp: new Date().toISOString(),
          environment: getEnvironmentInfo()
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: getEnvironmentInfo()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        environment: getEnvironmentInfo()
      },
      { status: 503 }
    );
  }
}
