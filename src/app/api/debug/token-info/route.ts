import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { accessToken } = await request.json()
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    console.log('Token Info: Checking token info for token:', accessToken.substring(0, 20) + '...')

    // Check token info using Google's tokeninfo endpoint
    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`)
    
    if (!tokenInfoResponse.ok) {
      const errorText = await tokenInfoResponse.text()
      console.error('Token Info: Error from tokeninfo endpoint:', errorText)
      return NextResponse.json({
        error: 'Failed to get token info',
        details: errorText
      })
    }

    const tokenInfo = await tokenInfoResponse.json()
    console.log('Token Info: Received token info:', tokenInfo)

    return NextResponse.json({
      success: true,
      tokenInfo,
      scopes: tokenInfo.scope ? tokenInfo.scope.split(' ') : [],
      hasGoogleDriveScope: tokenInfo.scope?.includes('https://www.googleapis.com/auth/drive.readonly'),
      hasSheetsScope: tokenInfo.scope?.includes('https://www.googleapis.com/auth/spreadsheets.readonly')
    })

  } catch (error) {
    console.error('Error checking token info:', error)
    return NextResponse.json(
      { error: 'Failed to check token info' },
      { status: 500 }
    )
  }
}
