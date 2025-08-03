import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { google } from 'googleapis'

function createOAuth2Client() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://holitime-242147063579.us-west2.run.app'
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/google-drive-callback`
  )
}

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

    console.log('=== GOOGLE DRIVE DEBUG SESSION START ===')
    console.log('Access Token (first 20 chars):', accessToken.substring(0, 20) + '...')

    const debugResults: any = {
      timestamp: new Date().toISOString(),
      accessToken: {
        length: accessToken.length,
        preview: accessToken.substring(0, 20) + '...'
      },
      tests: []
    }

    // Test 1: Token Info
    console.log('TEST 1: Checking token info...')
    try {
      const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`)
      const tokenInfo = await tokenInfoResponse.json()
      
      debugResults.tests.push({
        name: 'Token Info',
        success: tokenInfoResponse.ok,
        status: tokenInfoResponse.status,
        data: tokenInfo,
        scopes: tokenInfo.scope ? tokenInfo.scope.split(' ') : []
      })
      
      console.log('Token Info Result:', tokenInfo)
    } catch (error) {
      debugResults.tests.push({
        name: 'Token Info',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      console.error('Token Info Error:', error)
    }

    // Test 2: OAuth2 Client Setup
    console.log('TEST 2: Setting up OAuth2 client...')
    try {
      const oauth2Client = createOAuth2Client()
      oauth2Client.setCredentials({ access_token: accessToken })
      
      const baseUrl = process.env.NEXTAUTH_URL || 'https://holitime-242147063579.us-west2.run.app'
      const redirectUri = `${baseUrl}/google-drive-callback`

      debugResults.tests.push({
        name: 'OAuth2 Client Setup',
        success: true,
        clientId: process.env.GOOGLE_CLIENT_ID ? 'present' : 'missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing',
        redirectUri: redirectUri
      })
      
      console.log('OAuth2 Client Setup: Success')
    } catch (error) {
      debugResults.tests.push({
        name: 'OAuth2 Client Setup',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      console.error('OAuth2 Client Setup Error:', error)
    }

    // Test 3: Google Drive API - About endpoint (simplest test)
    console.log('TEST 3: Testing Google Drive API - About endpoint...')
    try {
      const oauth2Client = createOAuth2Client()
      oauth2Client.setCredentials({ access_token: accessToken })
      const drive = google.drive({ version: 'v3', auth: oauth2Client })
      
      const aboutResponse = await drive.about.get({ fields: 'user,storageQuota' })
      
      debugResults.tests.push({
        name: 'Drive API - About',
        success: true,
        status: aboutResponse.status,
        data: aboutResponse.data,
        user: aboutResponse.data.user?.emailAddress
      })
      
      console.log('Drive API About Result:', aboutResponse.data)
    } catch (error: any) {
      debugResults.tests.push({
        name: 'Drive API - About',
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.errors || error.response?.data
      })
      console.error('Drive API About Error:', error)
    }

    // Test 4: Google Drive API - Simple file list (no filters)
    console.log('TEST 4: Testing Google Drive API - Simple file list...')
    try {
      const oauth2Client = createOAuth2Client()
      oauth2Client.setCredentials({ access_token: accessToken })
      const drive = google.drive({ version: 'v3', auth: oauth2Client })
      
      const filesResponse = await drive.files.list({
        pageSize: 5,
        fields: 'files(id,name,mimeType)'
      })
      
      debugResults.tests.push({
        name: 'Drive API - Simple File List',
        success: true,
        status: filesResponse.status,
        fileCount: filesResponse.data.files?.length || 0,
        files: filesResponse.data.files?.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType }))
      })
      
      console.log('Drive API Simple File List Result:', filesResponse.data.files?.length, 'files')
    } catch (error: any) {
      debugResults.tests.push({
        name: 'Drive API - Simple File List',
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.errors || error.response?.data
      })
      console.error('Drive API Simple File List Error:', error)
    }

    // Test 5: Google Drive API - Spreadsheet file list (with filters)
    console.log('TEST 5: Testing Google Drive API - Spreadsheet file list...')
    try {
      const oauth2Client = createOAuth2Client()
      oauth2Client.setCredentials({ access_token: accessToken })
      const drive = google.drive({ version: 'v3', auth: oauth2Client })
      
      const SPREADSHEET_MIME_TYPES = [
        'application/vnd.google-apps.spreadsheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
      
      const query = `(${SPREADSHEET_MIME_TYPES.map(type => `mimeType='${type}'`).join(' or ')}) and trashed=false`
      
      const spreadsheetResponse = await drive.files.list({
        q: query,
        pageSize: 10,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
        orderBy: 'modifiedTime desc'
      })
      
      debugResults.tests.push({
        name: 'Drive API - Spreadsheet File List',
        success: true,
        status: spreadsheetResponse.status,
        query: query,
        fileCount: spreadsheetResponse.data.files?.length || 0,
        files: spreadsheetResponse.data.files?.map(f => ({ 
          id: f.id, 
          name: f.name, 
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime
        }))
      })
      
      console.log('Drive API Spreadsheet File List Result:', spreadsheetResponse.data.files?.length, 'spreadsheets')
    } catch (error: any) {
      debugResults.tests.push({
        name: 'Drive API - Spreadsheet File List',
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.errors || error.response?.data
      })
      console.error('Drive API Spreadsheet File List Error:', error)
    }

    // Test 6: Direct API call (without googleapis library)
    console.log('TEST 6: Testing direct API call...')
    try {
      const directResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      const directData = await directResponse.json()
      
      debugResults.tests.push({
        name: 'Direct API Call',
        success: directResponse.ok,
        status: directResponse.status,
        statusText: directResponse.statusText,
        headers: Object.fromEntries(directResponse.headers.entries()),
        data: directData
      })
      
      console.log('Direct API Call Result:', directData)
    } catch (error: any) {
      debugResults.tests.push({
        name: 'Direct API Call',
        success: false,
        error: error.message
      })
      console.error('Direct API Call Error:', error)
    }

    console.log('=== GOOGLE DRIVE DEBUG SESSION END ===')

    return NextResponse.json({
      success: true,
      debugResults,
      summary: {
        totalTests: debugResults.tests.length,
        passedTests: debugResults.tests.filter((t: any) => t.success).length,
        failedTests: debugResults.tests.filter((t: any) => !t.success).length
      }
    })

  } catch (error) {
    console.error('Error in Google Drive debug:', error)
    return NextResponse.json(
      { error: 'Failed to debug Google Drive' },
      { status: 500 }
    )
  }
}
