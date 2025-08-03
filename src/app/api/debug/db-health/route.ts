import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Skip database operations during build time
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      error: 'Database not available during build',
      timestamp: new Date().toISOString(),
      tests: {
        connection: { status: 'skipped', reason: 'build-time' },
        simple_query: { status: 'skipped', reason: 'build-time' },
        table_access: { status: 'skipped', reason: 'build-time' },
        connection_info: { status: 'skipped', reason: 'build-time' }
      }
    });
  }

  const startTime = Date.now();
  
  try {
    // Test 1: Simple query
    console.log('🔍 Testing simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;
    
    // Test 3: Table access
    console.log('🔍 Testing table access...');
    const userCount = await prisma.user.count();
    const jobCount = await prisma.job.count();
    const shiftCount = await prisma.shift.count();
    
    // Test 4: Connection info
    console.log('🔍 Getting connection info...');
    const connectionInfo = await prisma.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        version() as postgres_version
    `;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      tests: {
        connection: '✅ Success',
        simple_query: '✅ Success',
        table_access: '✅ Success',
      },
      database_info: connectionInfo,
      table_counts: {
        users: userCount,
        jobs: jobCount,
        shifts: shiftCount,
      },
      environment: {
        node_env: process.env.ENV,
        database_url_configured: !!process.env.DATABASE_URL,
        database_host: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'Not configured',
      }
    });
    
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Database health check failed:', error);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      error: {
        message: error.message,
        code: error.code,
        name: error.name,
        meta: error.meta,
      },
      environment: {
        node_env: process.env.ENV,
        database_url_configured: !!process.env.DATABASE_URL,
        database_host: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'Not configured',
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Force reconnection test
    console.log('🔄 Force reconnecting to database...');
    
    await prisma.$disconnect();
    // Re-running a query will automatically reconnect.
    const testQuery = await prisma.$queryRaw`SELECT 'reconnection_test' as test, NOW() as timestamp`;
    
    return NextResponse.json({
      success: true,
      message: 'Database reconnection successful',
      test_result: testQuery,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Database reconnection failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database reconnection failed',
      error: {
        message: error.message,
        code: error.code,
        name: error.name,
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
