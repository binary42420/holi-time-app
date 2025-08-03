import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractedClient {
  name: string;
  clientName?: string; // Changed from companyName
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
}

export interface ExtractedShift {
  jobName: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  requestedWorkers?: number;
  notes?: string;
  crewChiefName?: string;
  assignedPersonnel?: {
    name: string;
    role: string;
    roleCode?: string;
  }[];
}

export interface ExtractedData {
  clients: ExtractedClient[];
  shifts: ExtractedShift[];
  metadata: {
    sheetName: string;
    extractedAt: string;
    confidence: number;
  };
}

export interface SpreadsheetAnalysis {
  sheets: ExtractedData[];
  summary: {
    totalClients: number;
    totalShifts: number;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

/**
 * Initialize Gemini AI client
 */
function initializeGemini(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract data from spreadsheet content using Gemini AI
 */
export async function extractSpreadsheetData(
  fileContent: Buffer,
  fileName: string,
  mimeType: string
): Promise<SpreadsheetAnalysis> {
  const genAI = initializeGemini();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });

  try {
    // Convert buffer to base64 for Gemini
    const base64Data = fileContent.toString('base64');
    
    const prompt = `
You are a highly skilled data extraction specialist, specifically trained to extract information from schedule sheets with a consistent template. Your task is to extract specific information from a Google Sheet file and present it in a structured, comma-separated value (CSV) format.

**Task:**

Extract the following information for each employee listed on the schedule sheet, for each shift, separated by start date and start time. Each row of employee data should be written on a new row in the response CSV.

**Sheet Template Description:**

The Google Sheet follows a consistent template with the following key areas and column structure:

*   **Header Section:** The header section contains general job information, including:
    *   Client Name (Label: "CLIENT NAME:") // Changed from Client Company Name
    *   Client Contact Name (Label: "POC:")
    *   Location (Label: "LOCATION:")
*   **Schedule Table:** The schedule table lists employee shifts and time entries. Key columns include:
    *   "DATE/TIME:" (Combined date and time, various formats)
    *   "EMPLOYEE NAME:"
    *   "JT" (Job Title)
    *   "IN" (Clock-in times)
    *   "OUT" (Clock-out times)
    *   "Contact:" (Phone numbers)
*   **Contact Information:** Phone numbers are listed in the "Contact:" column, and are associated with the employee listed in the same row.
*   **Email Addresses:** Email addresses are not consistently present in the sheet. If an email address can be reliably extracted, include it; otherwise, leave the field blank.

**Data Fields to Extract:**

*   **client name:** The name of the client contracting the labor. Found in the header section (Label: "CLIENT NAME:"). // Changed from client company name
*   **client contact name:** The name of the primary contact at the client. Found in the header section (Label: "POC:"). // Changed from client company
*   **location:** The address or site where the work is performed. Found in the header section (Label: "LOCATION:").
*   **shift start date:** The date the employee's shift begins (Format: MM/DD/YYYY). Extracted from the "DATE/TIME:" column. The format is not standard, so you will need to parse and convert it.
    *   Example conversions:
        *   2/2/25 915a should be converted to 02/02/2025 09:15 AM
        *   9/5/24 1235p should be converted to 09/05/2024 12:35 PM
        *   12/05/2025 111a should be converted to 12/05/2025 01:11 AM
*   **shift start time:** The time the employee's shift begins (Response Format: HH:MM AM/PM). Extracted from the "DATE/TIME:" column.
*   **employee email address:** The employee's email address (if available). If not found, leave blank.
*   **employee phone #:** The employee's phone number. Extracted from the "Contact:" column, associated with the employee's row.
*   **employee name:** The full name of the employee. Extracted from the "EMPLOYEE NAME:" column.
*   **job title:** Job title or role of the employee. Extracted from the "JT" column.
    *   **IMPORTANT:** Ignore the "check in/out" column. It's usually blank, so don't let the column confuse you while extracting the in and out time entries.
*   **in1:** First clock-in time (Format: HH:MM AM/PM). Extracted from the "IN" columns.
*   **out1:** First clock-out time (Format: HH:MM AM/PM). Extracted from the "OUT" columns.
*   **in2:** Second clock-in time (Format: HH:MM AM/PM). Extracted from the "IN" columns.
*   **out2:** Second clock-out time (Format: HH:MM AM/PM). Extracted from the "OUT" columns.
*   **in3:** Third clock-in time (Format: HH:MM AM/PM). Extracted from the "IN" columns.
*   **out3:** Third clock-out time (Format: HH:MM AM/PM). Extracted from the "OUT" columns.

**Input:**

You will be provided with the content of a Google Sheet file.

**Instructions:**

1.  Locate and extract the client name, client contact name, and location from the header section using the specified labels. // Changed from client company name
2.  Iterate through the rows of the schedule table.
3.  For each row representing an employee shift:
    *   Extract the shift start date and time from the "DATE/TIME:" column, converting to the specified formats.
    *   Extract the employee name from the "EMPLOYEE NAME:" column.
    *   Extract the job title from the "JT" column.
    *   Extract the employee phone number from the "Contact:" column.
    *   Extract the clock-in and clock-out times (in1, out1, in2, out2, in3, out3) from the "IN" and "OUT" columns, formatting them correctly.
    *   If an employee email address is found, extract it; otherwise, leave the field blank.
4.  Construct a CSV row with the extracted data.
5.  Append each CSV row to the output string.
6.  Return the complete CSV string, including the header row.

**Output:**

Your output should be a single string formatted as CSV data, with the following header row:
File: ${fileName}
Type: ${mimeType}

Please extract the following information from each sheet in the spreadsheet:

1. **Client Information:**
   - Client name // Changed from Company/Client name
   - Contact person name
   - Email address
   - Phone number
   - Address
   
2. **Shift/Job Information:**
   - Job/Project name
   - Client name (link to client data)
   - Date (convert to YYYY-MM-DD format)
   - Start time (convert to HH:MM format)
   - End time (convert to HH:MM format)
   - Location/Address
   - Number of requested workers
   - Notes or description
   - Crew chief name (if specified)
   - Assigned personnel with their roles

**Important Guidelines:**
- Look for common spreadsheet patterns: headers in first row, data in subsequent rows
- Handle various date formats (MM/DD/YYYY, DD/MM/YYYY, etc.) and convert to YYYY-MM-DD
- Handle various time formats (12-hour, 24-hour) and convert to 24-hour HH:MM
- Identify role codes: CC=Crew Chief, SH=Stage Hand, FO=Fork Operator, etc.
- If client info is in a separate sheet, extract it separately
- If shifts reference clients by name, maintain those relationships
- Provide confidence score (0-100) for extraction quality
- Handle multiple sheets if present

Return the data in this exact JSON format:
{
  "sheets": [
    {
      "clients": [
        {
          "name": "Client Name",
          "clientName": "Client Name", // Changed from companyName
          "email": "email@example.com",
          "phone": "555-1234",
          "address": "123 Main St",
          "contactPerson": "John Doe"
        }
      ],
      "shifts": [
        {
          "jobName": "Job Name",
          "clientName": "Client Name",
          "date": "2024-01-15",
          "startTime": "08:00",
          "endTime": "17:00",
          "location": "123 Work Site",
          "requestedWorkers": 5,
          "notes": "Special requirements",
          "crewChiefName": "Chief Name",
          "assignedPersonnel": [
            {
              "name": "Worker Name",
              "role": "Stage Hand",
              "roleCode": "SH"
            }
          ]
        }
      ],
      "metadata": {
        "sheetName": "Sheet1",
        "extractedAt": "${new Date().toISOString()}",
        "confidence": 85
      }
    }
  ],
  "summary": {
    "totalClients": 1,
    "totalShifts": 1,
    "dateRange": {
      "start": "2024-01-15",
      "end": "2024-01-15"
    }
  }
}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType === 'application/vnd.google-apps.spreadsheet' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : mimeType,
          data: base64Data,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]) as SpreadsheetAnalysis;
    
    // Validate the extracted data structure
    if (!extractedData.sheets || !Array.isArray(extractedData.sheets)) {
      throw new Error('Invalid data structure returned from AI');
    }

    return extractedData;
  } catch (error) {
    console.error('Error extracting spreadsheet data:', error);
    throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
