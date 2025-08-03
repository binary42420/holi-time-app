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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id: googleSheetsId } = await params
    const { accessToken } = await request.json()

    if (!googleSheetsId) {
      return NextResponse.json(
        { error: 'Google Sheets ID is required' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    console.log('Fetching Google Sheets data with OAuth for ID:', googleSheetsId)
    console.log('Access token length:', accessToken.length)

    // Set up OAuth client with access token
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    // Test the OAuth token first with a simple API call
    try {
      console.log('Testing OAuth token with Drive API...')
      const drive = google.drive({ version: 'v3', auth: oauth2Client })
      const aboutResponse = await drive.about.get({ fields: 'user' })
      console.log('OAuth token test successful, user:', aboutResponse.data.user?.emailAddress)
    } catch (tokenError: any) {
      console.error('OAuth token test failed:', tokenError.message)
      return NextResponse.json(
        { error: `OAuth token validation failed: ${tokenError.message}` },
        { status: 401 }
      )
    }

    try {
      // Get spreadsheet metadata
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: googleSheetsId,
      })

      const sheetsData: any = {
        spreadsheetId: googleSheetsId,
        title: spreadsheet.data.properties?.title || 'Unknown',
        sheets: []
      }

      // Fetch data from all sheets
      for (const sheet of spreadsheet.data.sheets || []) {
        const sheetTitle = sheet.properties?.title || 'Unknown'
        const sheetId = sheet.properties?.sheetId || 0
        
        try {
          const sheetData = await sheets.spreadsheets.values.get({
            spreadsheetId: googleSheetsId,
            range: sheetTitle,
            valueRenderOption: 'UNFORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING'
          })

          sheetsData.sheets.push({
            title: sheetTitle,
            sheetId: sheetId,
            data: sheetData.data.values || [],
            rowCount: sheet.properties?.gridProperties?.rowCount || 0,
            columnCount: sheet.properties?.gridProperties?.columnCount || 0
          })
          
          console.log(`Fetched data for sheet "${sheetTitle}": ${sheetData.data.values?.length || 0} rows`)
        } catch (error) {
          console.error(`Error fetching sheet "${sheetTitle}":`, error)
          sheetsData.sheets.push({
            title: sheetTitle,
            sheetId: sheetId,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error',
            rowCount: 0,
            columnCount: 0
          })
        }
      }

      console.log('Successfully fetched data from', sheetsData.sheets.length, 'sheets using OAuth')

      return NextResponse.json({
        success: true,
        data: sheetsData
      })

    } catch (error: any) {
      console.error('Error accessing Google Sheets with OAuth:', error)
      
      let errorMessage = 'Failed to access Google Sheets'
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        errorMessage = 'Google access token has expired. Please reconnect to Google Drive.'
      } else if (error.code === 403) {
        errorMessage = 'Insufficient permissions to access this Google Sheets document.'
      } else if (error.code === 404) {
        errorMessage = 'Google Sheets document not found. Please check the ID.'
      } else {
        errorMessage = error.message || 'Failed to access Google Sheets'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error fetching Google Sheets data with OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google Sheets data' },
      { status: 500 }
    )
  }
}
