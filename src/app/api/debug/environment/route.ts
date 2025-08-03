import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const envCheck = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'present' : 'missing',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'present' : 'missing',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing',
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'present' : 'missing',
        DATABASE_URL: process.env.DATABASE_URL ? 'present' : 'missing'
      },
      googleConfig: {
        clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
        clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
        apiKeyLength: process.env.GOOGLE_API_KEY?.length || 0,
        redirectUri: `${process.env.NEXTAUTH_URL || 'https://holitime-242147063579.us-west2.run.app'}/google-drive-callback`
      }
    }

    console.log('Environment Check:', envCheck)

    return NextResponse.json({
      success: true,
      data: envCheck
    })

  } catch (error) {
    console.error('Error checking environment:', error)
    return NextResponse.json(
      { error: 'Failed to check environment' },
      { status: 500 }
    )
  }
}
