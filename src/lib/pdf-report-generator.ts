// PDF Report Generator Utility
// This would integrate with a PDF generation library like jsPDF, Puppeteer, or React-PDF

export interface JobReportData {
  job: {
    id: string;
    jobNumber: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    status: string;
    company?: {
      name: string;
    };
  };
  shifts: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
    status: string;
    crew_chief_required: number;
    fork_operators_required: number;
    stage_hands_required: number;
    general_labor_required: number;
    assignments?: Array<{
      id: string;
      workerType: string;
      user?: {
        id: string;
        name: string;
      };
    }>;
  }>;
  summary: {
    totalShifts: number;
    totalWorkerSlotsRequired: number;
    totalWorkerSlotsAssigned: number;
    fillRate: number;
    workerTypeBreakdown: {
      crew_chief: { required: number; assigned: number };
      fork_operator: { required: number; assigned: number };
      stage_hand: { required: number; assigned: number };
      general_labor: { required: number; assigned: number };
    };
  };
}

export class PDFReportGenerator {
  private static instance: PDFReportGenerator;

  public static getInstance(): PDFReportGenerator {
    if (!PDFReportGenerator.instance) {
      PDFReportGenerator.instance = new PDFReportGenerator();
    }
    return PDFReportGenerator.instance;
  }

  /**
   * Generate a PDF report from job data
   * This is a placeholder implementation - would need actual PDF library
   */
  public async generateJobReportPDF(
    reportData: JobReportData,
    options: {
      includeColors?: boolean;
      printFriendly?: boolean;
      includeCharts?: boolean;
    } = {}
  ): Promise<Blob> {
    const {
      includeColors = true,
      printFriendly = false,
      includeCharts = false
    } = options;

    // This would be implemented with a PDF library like:
    // - jsPDF for client-side generation
    // - Puppeteer for server-side HTML to PDF
    // - React-PDF for React-based PDF generation
    // - PDFKit for Node.js PDF generation

    console.log('Generating PDF report with options:', {
      includeColors,
      printFriendly,
      includeCharts,
      jobId: reportData.job.id,
      shiftsCount: reportData.shifts.length
    });

    // Placeholder: Create a simple text-based "PDF" (would be actual PDF in real implementation)
    const pdfContent = this.generatePDFContent(reportData, options);
    
    // Convert to blob (placeholder - would be actual PDF blob)
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    
    return blob;
  }

  /**
   * Generate HTML content for PDF conversion
   */
  public generateHTMLForPDF(
    reportData: JobReportData,
    options: {
      includeColors?: boolean;
      printFriendly?: boolean;
    } = {}
  ): string {
    const { includeColors = true, printFriendly = false } = options;
    
    const styles = printFriendly ? this.getPrintStyles() : this.getScreenStyles();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Job Report - ${reportData.job.description}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${this.generateJobHeaderHTML(reportData.job)}
          ${this.generateSummaryHTML(reportData.summary)}
          ${this.generateShiftsHTML(reportData.shifts, includeColors)}
          ${this.generateFooterHTML()}
        </body>
      </html>
    `;
  }

  private generatePDFContent(reportData: JobReportData, options: any): string {
    // Placeholder text content (would generate actual PDF in real implementation)
    return `
JOB REPORT
==========

Job: ${reportData.job.description}
Job #: ${reportData.job.jobNumber}
Company: ${reportData.job.company?.name || 'N/A'}
Location: ${reportData.job.location}
Duration: ${new Date(reportData.job.startDate).toLocaleDateString()} - ${new Date(reportData.job.endDate).toLocaleDateString()}
Status: ${reportData.job.status}

SUMMARY
-------
Total Shifts: ${reportData.summary.totalShifts}
Workers Required: ${reportData.summary.totalWorkerSlotsRequired}
Workers Assigned: ${reportData.summary.totalWorkerSlotsAssigned}
Fill Rate: ${reportData.summary.fillRate}%

WORKER TYPE BREAKDOWN
--------------------
Crew Chiefs: ${reportData.summary.workerTypeBreakdown.crew_chief.assigned}/${reportData.summary.workerTypeBreakdown.crew_chief.required}
Fork Operators: ${reportData.summary.workerTypeBreakdown.fork_operator.assigned}/${reportData.summary.workerTypeBreakdown.fork_operator.required}
Stage Hands: ${reportData.summary.workerTypeBreakdown.stage_hand.assigned}/${reportData.summary.workerTypeBreakdown.stage_hand.required}
General Labor: ${reportData.summary.workerTypeBreakdown.general_labor.assigned}/${reportData.summary.workerTypeBreakdown.general_labor.required}

SHIFTS
------
${reportData.shifts.map((shift, index) => `
Shift #${index + 1}
Date: ${new Date(shift.date).toLocaleDateString()}
Time: ${new Date(shift.startTime).toLocaleTimeString()} - ${new Date(shift.endTime).toLocaleTimeString()}
Status: ${shift.status}
Required Workers:
  - Crew Chiefs: ${shift.crew_chief_required}
  - Fork Operators: ${shift.fork_operators_required}
  - Stage Hands: ${shift.stage_hands_required}
  - General Labor: ${shift.general_labor_required}
Assigned Workers: ${shift.assignments?.filter(a => a.user).length || 0}
${shift.description ? `Description: ${shift.description}` : ''}
`).join('\n')}

Generated on: ${new Date().toLocaleString()}
    `;
  }

  private generateJobHeaderHTML(job: any): string {
    return `
      <div class="job-header">
        <h1>${job.description}</h1>
        <div class="job-details">
          <div class="detail-row">
            <span class="label">Job #:</span>
            <span class="value">${job.jobNumber}</span>
          </div>
          <div class="detail-row">
            <span class="label">Company:</span>
            <span class="value">${job.company?.name || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Location:</span>
            <span class="value">${job.location}</span>
          </div>
          <div class="detail-row">
            <span class="label">Duration:</span>
            <span class="value">${new Date(job.startDate).toLocaleDateString()} - ${new Date(job.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `;
  }

  private generateSummaryHTML(summary: any): string {
    return `
      <div class="summary-section">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${summary.totalShifts}</div>
            <div class="summary-label">Total Shifts</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${summary.totalWorkerSlotsAssigned}</div>
            <div class="summary-label">Workers Assigned</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${summary.totalWorkerSlotsRequired}</div>
            <div class="summary-label">Workers Required</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${summary.fillRate}%</div>
            <div class="summary-label">Fill Rate</div>
          </div>
        </div>
      </div>
    `;
  }

  private generateShiftsHTML(shifts: any[], includeColors: boolean): string {
    return `
      <div class="shifts-section">
        <h2>Shift Details</h2>
        ${shifts.map((shift, index) => `
          <div class="shift-card">
            <div class="shift-header">
              <h3>Shift #${index + 1}</h3>
              <span class="shift-status">${shift.status}</span>
            </div>
            <div class="shift-details">
              <div class="shift-info">
                <span>Date: ${new Date(shift.date).toLocaleDateString()}</span>
                <span>Time: ${new Date(shift.startTime).toLocaleTimeString()} - ${new Date(shift.endTime).toLocaleTimeString()}</span>
              </div>
              <div class="worker-requirements">
                <h4>Worker Requirements</h4>
                ${shift.crew_chief_required > 0 ? `<div>Crew Chiefs: ${shift.assignments?.filter((a: any) => a.workerType === 'crew_chief' && a.user).length || 0}/${shift.crew_chief_required}</div>` : ''}
                ${shift.fork_operators_required > 0 ? `<div>Fork Operators: ${shift.assignments?.filter((a: any) => a.workerType === 'fork_operator' && a.user).length || 0}/${shift.fork_operators_required}</div>` : ''}
                ${shift.stage_hands_required > 0 ? `<div>Stage Hands: ${shift.assignments?.filter((a: any) => a.workerType === 'stage_hand' && a.user).length || 0}/${shift.stage_hands_required}</div>` : ''}
                ${shift.general_labor_required > 0 ? `<div>General Labor: ${shift.assignments?.filter((a: any) => a.workerType === 'general_labor' && a.user).length || 0}/${shift.general_labor_required}</div>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private generateFooterHTML(): string {
    return `
      <div class="report-footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    `;
  }

  private getPrintStyles(): string {
    return `
      body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 0; padding: 20px; }
      .job-header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
      .job-header h1 { margin: 0 0 10px 0; font-size: 18px; }
      .job-details { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
      .detail-row { display: flex; }
      .label { font-weight: bold; margin-right: 10px; min-width: 80px; }
      .summary-section { margin: 20px 0; }
      .summary-section h2 { font-size: 16px; margin-bottom: 10px; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
      .summary-item { text-align: center; border: 1px solid #ccc; padding: 10px; }
      .summary-value { font-size: 16px; font-weight: bold; }
      .summary-label { font-size: 10px; color: #666; }
      .shifts-section h2 { font-size: 16px; margin-bottom: 10px; }
      .shift-card { border: 1px solid #ccc; margin-bottom: 15px; padding: 10px; break-inside: avoid; }
      .shift-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .shift-header h3 { margin: 0; font-size: 14px; }
      .shift-status { padding: 2px 8px; border: 1px solid #ccc; font-size: 10px; }
      .shift-info { margin-bottom: 10px; }
      .shift-info span { display: block; margin-bottom: 2px; }
      .worker-requirements h4 { margin: 0 0 5px 0; font-size: 12px; }
      .worker-requirements div { margin-bottom: 2px; }
      .report-footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
    `;
  }

  private getScreenStyles(): string {
    return `
      body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
      .job-header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .job-header h1 { margin: 0 0 15px 0; font-size: 24px; color: #333; }
      .job-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .detail-row { display: flex; align-items: center; }
      .label { font-weight: bold; margin-right: 10px; min-width: 100px; color: #666; }
      .value { color: #333; }
      .summary-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .summary-section h2 { font-size: 20px; margin-bottom: 15px; color: #333; }
      .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
      .summary-item { text-align: center; background: #f8f9fa; border-radius: 6px; padding: 15px; }
      .summary-value { font-size: 24px; font-weight: bold; color: #2563eb; }
      .summary-label { font-size: 12px; color: #666; margin-top: 5px; }
      .shifts-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .shifts-section h2 { font-size: 20px; margin-bottom: 15px; color: #333; }
      .shift-card { border: 1px solid #e5e7eb; margin-bottom: 15px; padding: 15px; border-radius: 6px; background: #fafafa; }
      .shift-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
      .shift-header h3 { margin: 0; font-size: 16px; color: #333; }
      .shift-status { padding: 4px 12px; background: #e5e7eb; border-radius: 4px; font-size: 12px; color: #374151; }
      .shift-info { margin-bottom: 15px; }
      .shift-info span { display: block; margin-bottom: 5px; color: #666; }
      .worker-requirements h4 { margin: 0 0 10px 0; font-size: 14px; color: #333; }
      .worker-requirements div { margin-bottom: 5px; padding: 5px 10px; background: white; border-radius: 4px; border-left: 3px solid #2563eb; }
      .report-footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
    `;
  }
}

// Export singleton instance
export const pdfReportGenerator = PDFReportGenerator.getInstance();