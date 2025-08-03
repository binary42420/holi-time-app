# Timesheet Approval Workflow with PDF Generation

## Overview
The timesheet approval workflow is a multi-stage process that ensures proper review and approval of worker timesheets before finalization. Once fully approved, the system generates a professional PDF document with company signatures for download.

## Workflow Stages

### 1. Draft (DRAFT)
- Initial state when timesheet is created
- Button: "Timesheet - Draft"
- Link: `/timesheets/{id}`

### 2. Pending Company Approval (PENDING_COMPANY_APPROVAL)
- After timesheet is finalized and submitted for approval
- Button: "Timesheet - Pending Company Approval" (desktop) / "Company Review" (mobile)
- Link: `/timesheets/{id}/client-approval`

### 3. Pending Manager Approval (PENDING_MANAGER_APPROVAL)
- After company has approved the timesheet
- Button: "Timesheet - Pending Manager Approval" (desktop) / "Manager Review" (mobile)
- Links:
  - Admin/Staff: `/timesheets/{id}/manager-approval`
  - CrewChief/CompanyUser: `/timesheets/{id}`

### 4. Completed (COMPLETED)
- Final approved state with PDF generation
- Button: "Download Approved Timesheet PDF" (desktop) / "Download PDF" (mobile)
- Link: `/api/timesheets/{id}/download-pdf-simple` (direct PDF download)

### 5. Rejected (REJECTED)
- If timesheet is rejected at any stage
- Button: "Timesheet - Rejected" (desktop) / "Rejected" (mobile)
- Link: `/timesheets/{id}`

## PDF Generation Process

### Excel-Based Template System
1. **Template Loading**: System loads from `/public/templates/timesheet-template.xlsx`
2. **Data Population**: 
   - Company information (name, address, phone, email, website)
   - Job details (number, name, description, budget, dates)
   - Shift information (location, date, start/end times, notes)
   - Employee data with time entries (up to 3 clock in/out pairs per employee)
   - Calculated regular and overtime hours

### Cell Configuration
```javascript
const config = {
  // Company Information
  companyName: 'A12',
  companyAddress: 'A13',
  companyPhone: 'A14',
  companyEmail: 'A15',
  companyWebsite: 'A16',
  
  // Job Information
  jobNumber: 'B6',
  jobName: 'B7',
  jobDescription: 'B9',
  jobBudget: 'B10',
  jobStartDate: 'B11',
  jobEndDate: 'B12',
  
  // Shift Information
  shiftLocation: 'B8',
  shiftDate: 'E6',
  shiftStartTime: 'E7',
  shiftEndTime: 'E8',
  shiftDescription: 'E9',
  shiftNotes: 'E10',
  
  // Client Information
  clientContact: 'F12',
  clientSignature: 'K12',
  
  // Employee Data Grid
  employeeData: {
    startRow: 15,        // Start employees at row 15
    nameColumn: 3,       // C column - Employee Name
    workerTypeColumn: 4, // D column - Worker Type
    initialsColumn: 5,   // E column - Employee Initials  
    in1Column: 6,        // F column - Clock In #1
    out1Column: 7,       // G column - Clock Out #1
    in2Column: 8,        // H column - Clock In #2
    out2Column: 9,       // I column - Clock Out #2
    in3Column: 10,       // J column - Clock In #3
    out3Column: 11,      // K column - Clock Out #3
    regularColumn: 12,   // L column - Regular Hours
    otColumn: 13,        // M column - Overtime Hours
  }
};
```

### Signature Integration
- **Company Signature**: Automatically inserted at K12 cell location when timesheet status is COMPLETED
- **Manager Signature**: Added if available from manager approval process
- **Format**: PNG images embedded directly into the PDF

### PDF Generation Methods

#### Method 1: Excel-to-PDF (Puppeteer)
- Route: `/api/timesheets/{id}/download-pdf`
- Process: Excel → HTML → PDF using Puppeteer
- Pros: High fidelity, exact Excel formatting
- Cons: Requires Puppeteer (heavier for deployment)

#### Method 2: Direct PDF Generation (jsPDF)
- Route: `/api/timesheets/{id}/download-pdf-simple`
- Process: Direct PDF creation using jsPDF with autoTable
- Pros: Lightweight, no external dependencies
- Cons: Manual formatting required

### Caching and Performance
- Generated PDFs are cached in database as base64 data URLs
- Subsequent requests serve cached version for improved performance
- Cache invalidation occurs when timesheet data changes

## Implementation Details

### API Routes
- `/api/timesheets/{id}/excel` - Excel file download
- `/api/timesheets/{id}/download-pdf-simple` - Direct PDF generation and download
- `/api/timesheets/{id}/download-pdf` - Excel-based PDF generation (alternative)

### Components
- `TimesheetApprovalButton`: Main component that renders the appropriate button based on timesheet status
- `UnifiedEnhancedTimeTracking`: Updated to include the timesheet approval button when shift is completed

### Mobile-First Design
- Responsive button text (shorter on mobile)
- Flexible layout that stacks buttons vertically on mobile
- Appropriate sizing for touch interfaces
- Touch-friendly download buttons

### User Role Permissions
- **Admin/Staff**: Can access all approval stages and download PDFs
- **CompanyUser**: Can approve at company level, download approved PDFs
- **CrewChief**: Can view timesheet status and download PDFs for their shifts
- **Employee**: Limited access based on assignment

### Security Features
- Role-based access control for PDF downloads
- Signature verification and embedding
- Audit trail for all approval actions

### Error Handling
- Graceful fallback if signature images fail to load
- Temporary file cleanup for Excel-to-PDF conversion
- Comprehensive error logging and user feedback

## Integration Points
- Appears next to "Shift Completed - Time Tracking Locked" button
- Only shows when shift status is "Completed" and timesheet exists
- Automatically updates based on timesheet status changes
- Direct download link bypasses intermediate pages

## File Naming Convention
Generated PDFs follow the pattern:
`timesheet-{company-name}-{shift-date}-signed.pdf`

Example: `timesheet-ABC-Construction-2024-01-15-signed.pdf`

## Usage
The timesheet approval button automatically appears on the Time Tracking tab of completed shifts, providing a clear path for users to follow the approval workflow based on their role and the current timesheet status. Once the timesheet reaches COMPLETED status, users can directly download the professionally formatted PDF with all signatures and company branding.