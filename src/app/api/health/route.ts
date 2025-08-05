import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      global_check: typeof global !== 'undefined' ? 'defined' : 'undefined'
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}