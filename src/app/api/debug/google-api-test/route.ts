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

    const apiKey = process.env.GOOGLE_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'Google API key not configured',
        hasApiKey: false
      })
    }

    // Test with a known public Google Sheets document
    const testSheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' // Google's sample sheet
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${testSheetId}?key=${apiKey}`

    console.log('Testing Google Sheets API with URL:', testUrl)

    const response = await fetch(testUrl)
    const responseText = await response.text()

    // Parse error response if it's JSON
    let parsedResponse = responseText
    try {
      parsedResponse = JSON.parse(responseText)
    } catch (e) {
      // Keep as text if not JSON
    }

    // Additional API tests
    const additionalTests = []

    // Test 1: Check if Sheets API is enabled by testing the discovery document
    try {
      const discoveryUrl = `https://sheets.googleapis.com/$discovery/rest?version=v4&key=${apiKey}`
      const discoveryResponse = await fetch(discoveryUrl)
      const discoveryText = await discoveryResponse.text()

      additionalTests.push({
        name: 'Sheets API Discovery',
        url: discoveryUrl,
        status: discoveryResponse.status,
        success: discoveryResponse.ok,
        response: discoveryResponse.ok ? 'API enabled' : discoveryText
      })
    } catch (error) {
      additionalTests.push({
        name: 'Sheets API Discovery',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Test with minimal fields to check basic access
    try {
      const minimalUrl = `https://sheets.googleapis.com/v4/spreadsheets/${testSheetId}?key=${apiKey}&fields=properties.title`
      const minimalResponse = await fetch(minimalUrl)
      const minimalText = await minimalResponse.text()

      additionalTests.push({
        name: 'Minimal Fields Test',
        url: minimalUrl,
        status: minimalResponse.status,
        success: minimalResponse.ok,
        response: minimalText
      })
    } catch (error) {
      additionalTests.push({
        name: 'Minimal Fields Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      hasApiKey: true,
      apiKeyLength: apiKey.length,
      apiKeyPreview: apiKey.substring(0, 10) + '...',
      testSheetId,
      testUrl,
      responseStatus: response.status,
      responseStatusText: response.statusText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody: parsedResponse,
      success: response.ok,
      additionalTests,
      troubleshooting: {
        '403_forbidden': 'API key lacks permissions or Sheets API not enabled',
        '400_bad_request': 'Invalid API key format or malformed request',
        '404_not_found': 'Spreadsheet not found or not publicly accessible',
        'quota_exceeded': 'API quota limits reached',
        'billing_required': 'Billing must be enabled for this API key'
      },
      fixInstructions: {
        step1: 'Go to Google Cloud Console: https://console.cloud.google.com/',
        step2: 'Select your project: holitime',
        step3: 'Navigate to APIs & Services > Library',
        step4: 'Search for "Google Sheets API" and enable it',
        step5: 'Go to APIs & Services > Credentials',
        step6: 'Find your API key and click Edit',
        step7: 'Under "API restrictions", select "Restrict key"',
        step8: 'Add "Google Sheets API" to the list of allowed APIs',
        step9: 'Save the changes and wait a few minutes for propagation',
        step10: 'Ensure billing is enabled for the project'
      }
    })

  } catch (error) {
    console.error('Error testing Google API:', error)
    return NextResponse.json(
      { error: 'Failed to test Google API' },
      { status: 500 }
    )
  }
}
