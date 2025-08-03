import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { sheetsId } = await request.json()
    
    if (!sheetsId) {
      return NextResponse.json(
        { error: 'Google Sheets ID is required' },
        { status: 400 }
      )
    }

    console.log('=== GOOGLE SHEETS DEBUG SESSION START ===')
    console.log('Testing Google Sheets ID:', sheetsId)

    const debugResults: any = {
      timestamp: new Date().toISOString(),
      sheetsId,
      tests: []
    }

    // Test 1: Check if API key is configured
    console.log('TEST 1: Checking API key configuration...')
    const hasApiKey = !!process.env.GOOGLE_API_KEY
    debugResults.tests.push({
      name: 'API Key Configuration',
      success: hasApiKey,
      hasApiKey,
      apiKeyLength: hasApiKey ? process.env.GOOGLE_API_KEY!.length : 0
    })

    if (!hasApiKey) {
      console.log('No API key configured, skipping API key tests')
    } else {
      // Test 2: Test with known public sheet
      console.log('TEST 2: Testing API key with known public sheet...')
      try {
        const testSheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${testSheetId}?key=${process.env.GOOGLE_API_KEY}&fields=properties.title`
        
        const testResponse = await fetch(testUrl)
        const testData = testResponse.ok ? await testResponse.json() : await testResponse.text()
        
        debugResults.tests.push({
          name: 'Known Public Sheet Test',
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
          url: testUrl,
          data: testData
        })
        
        console.log('Known public sheet test result:', testResponse.status, testData)
      } catch (error) {
        debugResults.tests.push({
          name: 'Known Public Sheet Test',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error('Known public sheet test error:', error)
      }

      // Test 3: Test the specific sheet metadata
      console.log('TEST 3: Testing specific sheet metadata...')
      try {
        const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}?key=${process.env.GOOGLE_API_KEY}&fields=properties`
        
        const metadataResponse = await fetch(metadataUrl)
        const metadataData = metadataResponse.ok ? await metadataResponse.json() : await metadataResponse.text()
        
        debugResults.tests.push({
          name: 'Specific Sheet Metadata',
          success: metadataResponse.ok,
          status: metadataResponse.status,
          statusText: metadataResponse.statusText,
          url: metadataUrl,
          data: metadataData
        })
        
        console.log('Specific sheet metadata result:', metadataResponse.status, metadataData)
      } catch (error) {
        debugResults.tests.push({
          name: 'Specific Sheet Metadata',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error('Specific sheet metadata error:', error)
      }

      // Test 4: Test sheet access with minimal fields
      console.log('TEST 4: Testing sheet access with minimal fields...')
      try {
        const minimalUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}?key=${process.env.GOOGLE_API_KEY}&fields=properties.title`
        
        const minimalResponse = await fetch(minimalUrl)
        const minimalData = minimalResponse.ok ? await minimalResponse.json() : await minimalResponse.text()
        
        debugResults.tests.push({
          name: 'Minimal Sheet Access',
          success: minimalResponse.ok,
          status: minimalResponse.status,
          statusText: minimalResponse.statusText,
          url: minimalUrl,
          data: minimalData
        })
        
        console.log('Minimal sheet access result:', minimalResponse.status, minimalData)
      } catch (error) {
        debugResults.tests.push({
          name: 'Minimal Sheet Access',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error('Minimal sheet access error:', error)
      }
    }

    // Test 5: Check if sheet URL is accessible via web
    console.log('TEST 5: Testing sheet web accessibility...')
    try {
      const webUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/edit`
      const webResponse = await fetch(webUrl, { method: 'HEAD' })
      
      debugResults.tests.push({
        name: 'Web Accessibility',
        success: webResponse.ok,
        status: webResponse.status,
        statusText: webResponse.statusText,
        url: webUrl,
        headers: Object.fromEntries(webResponse.headers.entries())
      })
      
      console.log('Web accessibility result:', webResponse.status)
    } catch (error) {
      debugResults.tests.push({
        name: 'Web Accessibility',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      console.error('Web accessibility error:', error)
    }

    console.log('=== GOOGLE SHEETS DEBUG SESSION END ===')

    return NextResponse.json({
      success: true,
      debugResults,
      summary: {
        totalTests: debugResults.tests.length,
        passedTests: debugResults.tests.filter((t: any) => t.success).length,
        failedTests: debugResults.tests.filter((t: any) => !t.success).length
      },
      recommendations: generateRecommendations(debugResults.tests)
    })

  } catch (error) {
    console.error('Error in Google Sheets debug:', error)
    return NextResponse.json(
      { error: 'Failed to debug Google Sheets' },
      { status: 500 }
    )
  }
}

function generateRecommendations(tests: any[]): string[] {
  const recommendations: string[] = []
  
  const apiKeyTest = tests.find(t => t.name === 'API Key Configuration')
  if (!apiKeyTest?.success) {
    recommendations.push('Configure GOOGLE_API_KEY environment variable')
  }
  
  const knownSheetTest = tests.find(t => t.name === 'Known Public Sheet Test')
  if (!knownSheetTest?.success) {
    recommendations.push('Check Google Sheets API is enabled in Google Cloud Console')
    recommendations.push('Verify API key has proper permissions for Google Sheets API')
  }
  
  const metadataTest = tests.find(t => t.name === 'Specific Sheet Metadata')
  if (!metadataTest?.success) {
    if (metadataTest?.status === 403) {
      recommendations.push('Make sure the Google Sheets document is publicly accessible (anyone with link can view)')
    } else if (metadataTest?.status === 404) {
      recommendations.push('Check that the Google Sheets ID is correct')
    }
  }
  
  const webTest = tests.find(t => t.name === 'Web Accessibility')
  if (!webTest?.success) {
    recommendations.push('Verify the Google Sheets document exists and is accessible')
  }
  
  return recommendations
}
