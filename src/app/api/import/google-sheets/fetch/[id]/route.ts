import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

export async function GET(
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

    if (!googleSheetsId) {
      return NextResponse.json(
        { error: 'Google Sheets ID is required' },
        { status: 400 }
      )
    }

    // Check if we have an API key configured
    const hasApiKey = !!process.env.GOOGLE_API_KEY
    if (!hasApiKey) {
      console.error('Google Sheets Fetch: GOOGLE_API_KEY environment variable not set')
      return NextResponse.json(
        {
          error: 'Google API key not configured. Please configure GOOGLE_API_KEY environment variable or use OAuth method.',
          suggestion: 'Try using the OAuth method by connecting to Google Drive first.'
        },
        { status: 500 }
      )
    }

    console.log('Google Sheets Fetch: Using API key with length:', process.env.GOOGLE_API_KEY!.length)

    console.log('Fetching Google Sheets data for ID:', googleSheetsId)

    // Test with a known public sheet first to verify API key works
    const testSheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' // Google's sample sheet
    if (googleSheetsId !== testSheetId) {
      console.log('Testing API key with known public sheet first...')
      try {
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${testSheetId}?key=${process.env.GOOGLE_API_KEY}&fields=properties.title`
        const testResponse = await fetch(testUrl)
        if (!testResponse.ok) {
          const testError = await testResponse.text()
          console.error('API key test failed:', {
            status: testResponse.status,
            error: testError
          })
          return NextResponse.json(
            { error: `Google API key test failed: ${testResponse.status} ${testResponse.statusText}. Please check API key configuration.` },
            { status: 500 }
          )
        }
        console.log('API key test successful')
      } catch (testError) {
        console.error('API key test error:', testError)
        return NextResponse.json(
          { error: 'Failed to test Google API key' },
          { status: 500 }
        )
      }
    }

    // Now try to get the spreadsheet metadata to find all sheets
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsId}?key=${process.env.GOOGLE_API_KEY}`
    console.log('Fetching metadata from:', metadataUrl)

    const metadataResponse = await fetch(metadataUrl)

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text()
      console.error('Google Sheets API Error (metadata):', {
        status: metadataResponse.status,
        statusText: metadataResponse.statusText,
        error: errorText
      })

      let errorMessage = 'Failed to fetch spreadsheet metadata.'

      if (metadataResponse.status === 403) {
        errorMessage = 'Access denied to Google Sheets. Make sure the sheet is publicly accessible (anyone with the link can view) and the API key has proper permissions.'
      } else if (metadataResponse.status === 404) {
        errorMessage = 'Google Sheets document not found. Please check the ID and make sure the sheet exists.'
      } else if (metadataResponse.status === 400) {
        errorMessage = 'Invalid Google Sheets ID format. Please check the ID and try again.'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const metadata = await metadataResponse.json()
    const sheets = metadata.sheets || []

    console.log('Found sheets:', sheets.map((s: any) => s.properties.title))

    // Fetch data from all sheets
    const sheetsData: any = {
      spreadsheetId: googleSheetsId,
      title: metadata.properties.title,
      sheets: []
    }

    for (const sheet of sheets) {
      const sheetTitle = sheet.properties.title
      const sheetId = sheet.properties.sheetId
      
      try {
        // Fetch the data for this sheet
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsId}/values/${encodeURIComponent(sheetTitle)}?key=${process.env.GOOGLE_API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
        console.log(`Fetching data for sheet "${sheetTitle}" from:`, dataUrl)

        const dataResponse = await fetch(dataUrl)

        if (dataResponse.ok) {
          const sheetData = await dataResponse.json()

          sheetsData.sheets.push({
            title: sheetTitle,
            sheetId: sheetId,
            data: sheetData.values || [],
            rowCount: sheet.properties.gridProperties?.rowCount || 0,
            columnCount: sheet.properties.gridProperties?.columnCount || 0
          })

          console.log(`Fetched data for sheet "${sheetTitle}": ${sheetData.values?.length || 0} rows`)
        } else {
          const errorText = await dataResponse.text()
          console.warn(`Failed to fetch data for sheet "${sheetTitle}":`, {
            status: dataResponse.status,
            error: errorText
          })
          sheetsData.sheets.push({
            title: sheetTitle,
            sheetId: sheetId,
            data: [],
            error: `Failed to fetch sheet data: ${dataResponse.status} ${dataResponse.statusText}`,
            rowCount: 0,
            columnCount: 0
          })
        }
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

    console.log('Successfully fetched data from', sheetsData.sheets.length, 'sheets')

    return NextResponse.json({
      success: true,
      data: sheetsData
    })

  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google Sheets data' },
      { status: 500 }
    )
  }
}
