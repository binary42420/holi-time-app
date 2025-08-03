import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

const GEMINI_PROMPT = `
You are a data extraction and transformation specialist for the Holitime workforce management system. Your task is to analyze Google Sheets documents and extract workforce scheduling data, transforming it into a standardized CSV format for import.

## INPUT SPECIFICATIONS

**Google Sheets Document**: You will receive a Google Sheets document ID for a publicly shared document. Process ALL worksheets/tabs within the file.

**Expected Data Types**: Look for client companies, job projects, shift schedules, employee information, and time tracking data across all sheets.

## DATA EXTRACTION REQUIREMENTS

### 1. IDENTIFY AND EXTRACT DATA
Scan all worksheets for the following information types:

**Customer Information:**
- Company names (not individual contact names)
- Contact person names
- Phone numbers
- Email addresses

**Job/Project Information:**
- Job names, project titles, event names
- Start dates, project dates
- Customer associations

**Shift Information:**
- Shift dates
- Start and end times
- Job associations
- Location information

**Employee Information:**
- Full employee names
- Email addresses
- Phone numbers
- Role assignments, job titles, worker types

**Time Tracking:**
- Clock in/out times
- Multiple time pairs per employee per shift
- Break times, lunch periods

### 2. RECOGNIZE FLEXIBLE DATA FORMATS
Be prepared to handle various spreadsheet layouts:

**Column Header Variations:**
- "CUSTOMER NAME:", "Customer" → client_name
- "POC:", "Contact" → contact_name
- "POC:", "Contact Phone" → contact_phone (might be combined with contact name or under it)
- "HANDS ON JOB #:", "Job" → job_name
- "(there is no labeled start and end date for the job. this should be determined by the first shift start date, SEPERATELY BY EACH SHEET, EACH SHEET INDICATES A DIFFERENT JOB. EACH SEPERATE GOOGLE SPREADSHEET CONTAIN DATA FOR 1 SINGLE CLIENT COMPANY, EACH SHEET BEING A DIFFERENT JOB FOR THAT 1 CLIENT, AND MULTIPLE SHIFTS ARE CONTAINED ON EACH SHEET ALL PERTAINING TO THE SAME JOB FOR THE SAME CLIENT)" → job_start_date
- "DATE/TIME:" (COMBINED WITH SHIFT START TIME) → shift_date
- "DATE/TIME:"  → shift_start_time
- "NAME", "Worker", "Staff", "Name" → employee_name
- "Email Adresss:", "Email", "Email Address" → employee_email
- "CONTACT INFO:", "phone" → employee_phone
- "JT", "Position","Job Title" → worker_type

**Date Format Recognition:**
- MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- "January 15, 2024", "15-Jan-24", "1/15/24"
- Convert ALL dates to YYYY-MM-DD format

**Time Format Recognition:**
- 12-hour format (8:00 AM, 5:30 PM) → 24-hour format (08:00, 17:30)
- 24-hour format (08:00, 17:30) → 24-HOUR FORMAT
- other 12-hour time formats (8p 830p 1115a, 1p) → 24-hour format (20:00, 20:30, 11:15, 13:00)

**Worker Type Mapping:**
- "CC" → CC
- "SH" → SH (default if blank or if none of the other options match)
- "FO" → FO
- "" or any other value in JT column → "SH"

### 3. DATA PROCESSING LOGIC

**Multi-Sheet Processing:**
1. Identify the primary data structure across all sheets
2. Look for master client/job lists in separate tabs
3. Combine employee assignments from multiple sheets
4. Maintain data relationships across sheets
5. each sheet represents all the shifts scheduled for 1 client company for 1 specific job. 
6. each seperate sheet in a spreadsheet is a different job.
7. if no job name can be determined for a sheet, use part of the location as the name, ie location: waterfront park > job name: waterfront 

**Data Validation:**
- Ensure dates are valid and logical (shift dates after job start dates)
-if email is missing or invalid, warn but dont invalidate the row of shift data 
- Check time logic (end times after start times unless its an overnight shift going into the next day)
- Verify worker types match allowed codes
- the shift start date and shift start time are generally both combined in 1 cell, you'll need to split the date and time to the corresponding columns
**Missing Data Handling:**
- Leave fields empty rather than inserting "N/A" or placeholders
- Infer missing data where logical (e.g., job start date from first shift date)
- Flag required fields that are completely missing
- if worker type cant be determined, input it as SH for Stage Hand
- if an employee row has no clock in / clock out entries, still extract that row just without any in or out times
## OUTPUT REQUIREMENTS

### 4. CSV FORMAT SPECIFICATION
Generate a CSV with exactly these 18 columns in this order:

client_name,contact_name,contact_phone,job_name,job_start_date,shift_date,shift_start_time,shift_end_time,employee_name,employee_email,employee_phone,worker_type,clock_in_1,clock_out_1,clock_in_2,clock_out_2,clock_in_3,clock_out_3

**Row Structure:**

- one job per google sheet (all shifts within each seperate sheet will always be for the same overall job, each new sheet is always a new job)
- One row per employee per shift assignment
- If an employee works multiple shifts, create separate rows for each shift for the same employee
- If multiple employees work the same shift, create separate rows for each employee

**Data Format Requirements:**
- Dates: YYYY-MM-DD (e.g., 2024-01-15)
- Times: HH:MM in 24-hour format (e.g., 08:00, 17:30)
- Worker types: Exact codes (CC, SH, FO, RFO, RG, GL)
- Empty fields: Leave completely blank, no quotes or spaces unless they can be inferred

### 5. SUMMARY REPORT
Provide a detailed analysis including:

**Data Discovery:**
- Number of sheets processed
- Types of data found in each sheet
- Total clients, jobs, shifts, and employees identified

**Data Quality Assessment:**
- Rows with complete data vs. missing information
- Date/time format issues encountered

**Processing Summary:**
- Total CSV rows generated
- Data transformations performed
- Assumptions made for missing data

**Recommendations:**
- Suggest corrections for problematic data
- Identify patterns that might need manual review
- Recommend additional data that would improve import quality

### 6. ERROR HANDLING AND VALIDATION

**Critical Issues (Stop Processing):**
- No recognizable workforce data found
- All sheets are empty or inaccessible
- Fundamental data structure cannot be determined

**Warning Issues (Continue with Notes):**
- Some sheets couldn't be processed
- Significant amounts of missing required data
- Date/time formats that couldn't be parsed
- Unrecognized worker types

**Data Integrity Checks:**
- Ensure each row has at minimum: client_name, job_name, shift_date, employee_name
- Verify shift times are logical (start before end)
- Check that employee assignments don't conflict (same person, same time)
- Validate that job dates align with shift dates

## EXAMPLE OUTPUT STRUCTURE

client_name,contact_name,contact_phone,job_name,job_start_date,shift_date,shift_start_time,shift_end_time,employee_name,employee_email,employee_phone,worker_type,clock_in_1,clock_out_1,clock_in_2,clock_out_2,clock_in_3,clock_out_3
Acme Construction,John Smith,555-0123,Downtown Office Building,2024-01-15,2024-01-20,08:00,17:00,Jane Doe,jane.doe@email.com,555-0456,SH,08:00,12:00,13:00,17:00,,
Acme Construction,John Smith,555-0123,Downtown Office Building,2024-01-15,2024-01-20,08:00,17:00,Bob Wilson,bob.wilson@email.com,555-0789,FO,08:00,17:00,,,,

## PROCESSING INSTRUCTIONS

1. **Access the Google Sheets document** using the provided document ID
2. **Scan all worksheets** for workforce-related data
3. **Identify data patterns** and map to Holitime format
4. **Transform and validate** all extracted data
5. **Generate the standardized CSV** with proper formatting
6. **Create the summary report** with findings and recommendations
7. **Flag any critical issues** that require manual intervention

**Remember**: The goal is to minimize manual data entry while maintaining data accuracy. When in doubt, preserve the original data and flag for manual review rather than making assumptions that could introduce errors.

**Output the CSV data first, followed by the summary report.**

heres a script i was using before which might help you to locate the client data header and employee data headers. 

function findClientMetadataHeaderRow(sheet) {
    if (!sheet) { return null; }
    try {
        const data = sheet.getDataRange().getValues();
        const requiredMatches = Math.min(3, CONFIG.CLIENT_METADATA.headerKeywords.length);
        for (let i = 0; i < data.length; i++) {
            const row = data[i]; if (!row) continue;
            const ucRow = row.map(cell => String(cell).trim().toUpperCase());
            let matches = 0;
            for (const kw of CONFIG.CLIENT_METADATA.headerKeywords) { 
                if (ucRow.some(cell => cell.includes(kw.toUpperCase()))) { 
                    matches++; 
                } 
            }
            if (matches >= requiredMatches) { 
                return i;
            }
        }
    } catch (error) {  return null; }
}

function extractAndApplyClientMetadata(sourceSheet, destinationSheet, metadataHeaderRowIndex, sourceData) {
    try {
        const headerVals = sourceData[metadataHeaderRowIndex];
        if (!headerVals) { return; }
        const metadataValuesRowIndex = metadataHeaderRowIndex + 1;
        if (metadataValuesRowIndex >= sourceData.length || !sourceData[metadataValuesRowIndex]) { return; }
        const metadataRowValues = sourceData[metadataValuesRowIndex];

        for (const fieldName in CONFIG.CLIENT_METADATA.fields) {
            if (CONFIG.CLIENT_METADATA.fields.hasOwnProperty(fieldName)) {
                const cfg = CONFIG.CLIENT_METADATA.fields[fieldName];
                const colIdxInHeader = findColumnContainingKeywords(headerVals, cfg.keywords);

                if (colIdxInHeader) {
                    const colIdxInSourceData = colIdxInHeader - 1;
                    if (colIdxInSourceData < 0 || colIdxInSourceData >= metadataRowValues.length) { continue; }
                    const val = metadataRowValues[colIdxInSourceData];
                    const valStr = String(val == null ? "" : val).trim();
                    const isKw = cfg.keywords.some(kw => valStr.toUpperCase() === kw.trim().toUpperCase());
                    if (!isKw) {
                        try {
                            destinationSheet.getRange(cfg.templateCell).setValue(valStr);
                        } catch (e) {
                        }
                    }
                }
            }
        }
    } catch (error) {
    }
}


function findAllHeaderRows(sheet) {
    if (!sheet) { logToSheet("Library: findAllHeaderRows: Invalid sheet."); return []; }
    try {
        const data = sheet.getDataRange().getValues();
        const headerRows = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i]; if (!row) continue;
            const ucRow = row.map(cell => String(cell).trim().toUpperCase());
            let matches = 0;
            if (findColumnByKeywords(ucRow, CONFIG.HEADER_KEYWORDS.DATE)) matches++;
            if (findColumnByKeywords(ucRow, CONFIG.HEADER_KEYWORDS.EMPLOYEE)) matches++;
            if (findColumnByKeywords(ucRow, CONFIG.HEADER_KEYWORDS.JT)) matches++;
            if (findColumnByKeywords(ucRow, CONFIG.HEADER_KEYWORDS.IN)) matches++;
            if (findColumnByKeywords(ucRow, CONFIG.HEADER_KEYWORDS.OUT)) matches++;
            if (matches >= 3) { headerRows.push(i + 1); } // 1-based index
        }
        return headerRows;
    } catch (error) {
        return [];
    }
}

/**
 * Finds a column index in a row array that exactly matches one of the provided keywords.
 */
function findColumnByKeywords(row, keywords) {
    if (!row || !Array.isArray(row) || !keywords || !Array.isArray(keywords) || keywords.length === 0) return null;
    try {
        const ucRow = row.map(cell => String(cell === null || cell === undefined ? "" : cell).trim().toUpperCase());
        const foundIndex = ucRow.findIndex(cellContent => 
            keywords.some(keyword => cellContent === String(keyword).trim().toUpperCase())
        );
        return foundIndex !== -1 ? foundIndex + 1 : null; // 1-based index
    } catch (error) {
        return null;
    }
}

/**
 * Finds a column index in a header row array where the cell content CONTAINS one of the provided keywords.
 */
function findColumnContainingKeywords(headerRowArray, keywords) {
    if (!headerRowArray || !Array.isArray(headerRowArray) || !keywords || !Array.isArray(keywords) || keywords.length === 0) return null;
    try {
        const ucHeaderRow = headerRowArray.map(cell => String(cell === null || cell === undefined ? "" : cell).trim().toUpperCase());
        const ucKeywords = keywords.map(kw => String(kw).trim().toUpperCase());
        for (let i = 0; i < ucHeaderRow.length; i++) {
            if (ucKeywords.some(keyword => ucHeaderRow[i].includes(keyword))) return i + 1; // 1-based index
        }
        return null; 
    } catch (error) {
        return null;
    }
}
    
IMPORTANT: once you extract that data, go back and reanalyze the data you've extracted and to what column you've extracted them to, and try to infer as to what is likely misaligned. fix it before responding`;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { googleSheetsId, sheetsData } = await request.json()

    if (!googleSheetsId || !sheetsData) {
      return NextResponse.json(
        { error: 'Google Sheets ID and data are required' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API not configured. Please set GOOGLE_AI_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    console.log('Gemini Processing: Starting analysis of Google Sheets data')

    // Prepare the data for Gemini
    const sheetsContent = JSON.stringify(sheetsData, null, 2)
    
    const fullPrompt = `${GEMINI_PROMPT}

## GOOGLE SHEETS DATA TO PROCESS

Google Sheets ID: ${googleSheetsId}

Sheets Data:
${sheetsContent}

Please analyze this data and provide:
1. The standardized CSV output with the exact 18 columns
2. A detailed summary report of the processing

Begin your response with "CSV_DATA:" followed by the CSV content, then "SUMMARY_REPORT:" followed by the analysis.`

    // Call Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 1,
          topP: 1,
          maxOutputTokens: 20000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API Error:', errorText)
      return NextResponse.json(
        { error: 'Failed to process data with Gemini API' },
        { status: 500 }
      )
    }

    const geminiResult = await geminiResponse.json()
    
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
      return NextResponse.json(
        { error: 'No response from Gemini API' },
        { status: 500 }
      )
    }

    const responseText = geminiResult.candidates[0].content.parts[0].text
    
    // Parse the response to extract CSV and summary
    const csvMatch = responseText.match(/CSV_DATA:([\s\S]*?)(?=SUMMARY_REPORT:|$)/)
    const summaryMatch = responseText.match(/SUMMARY_REPORT:([\s\S]*?)$/)
    
    if (!csvMatch) {
      return NextResponse.json(
        { error: 'Could not extract CSV data from Gemini response' },
        { status: 500 }
      )
    }

    const csvData = csvMatch[1].trim()
    const summaryReport = summaryMatch ? summaryMatch[1].trim() : 'No summary provided'

    console.log('Gemini Processing: Successfully processed data')

    return NextResponse.json({
      success: true,
      csvData,
      summaryReport,
      originalResponse: responseText
    })

  } catch (error) {
    console.error('Error processing with Gemini:', error)
    return NextResponse.json(
      { error: 'Failed to process Google Sheets data' },
      { status: 500 }
    )
  }
}
