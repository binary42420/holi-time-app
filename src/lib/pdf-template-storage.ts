import { prisma } from '@/lib/prisma';

interface PDFElement {
  id: string;
  type: 'text' | 'table' | 'signature' | 'image';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataKey?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  required: boolean;
}

interface PDFConfiguration {
  id: string;
  name: string;
  pageSize: 'letter' | 'a4';
  pageOrientation: 'portrait' | 'landscape';
  elements: PDFElement[];
  createdAt: string;
  updatedAt: string;
}

/**
 * PDF Template Storage Service
 * Handles saving and loading PDF template configurations
 */
export class PDFTemplateStorage {
  
  /**
   * Save PDF template configuration
   */
  static async saveTemplate(config: PDFConfiguration): Promise<void> {
    // For now, we'll store in a JSON file
    // In production, you'd want to store in database
    const fs = require('fs').promises;
    const path = require('path');
    
    const templatesDir = path.join(process.cwd(), 'pdf-templates');
    
    // Ensure directory exists
    try {
      await fs.access(templatesDir);
    } catch {
      await fs.mkdir(templatesDir, { recursive: true });
    }
    
    const templatePath = path.join(templatesDir, `${config.id}.json`);
    await fs.writeFile(templatePath, JSON.stringify(config, null, 2));
  }

  /**
   * Load PDF template configuration
   */
  static async loadTemplate(templateId: string): Promise<PDFConfiguration | null> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const templatePath = path.join(process.cwd(), 'pdf-templates', `${templateId}.json`);
      const templateData = await fs.readFile(templatePath, 'utf8');
      return JSON.parse(templateData);
    } catch (error) {
      console.warn(`Template ${templateId} not found, using default`);
      return null;
    }
  }

  /**
   * List all available templates
   */
  static async listTemplates(): Promise<PDFConfiguration[]> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const templatesDir = path.join(process.cwd(), 'pdf-templates');
      const files = await fs.readdir(templatesDir);
      
      const templates: PDFConfiguration[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const templateData = await fs.readFile(path.join(templatesDir, file), 'utf8');
            templates.push(JSON.parse(templateData));
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
          }
        }
      }
      
      return templates;
    } catch (error) {
      console.warn('Failed to list templates:', error);
      return [];
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const templatePath = path.join(process.cwd(), 'pdf-templates', `${templateId}.json`);
    await fs.unlink(templatePath);
  }

  /**
   * Get default template
   */
  static getDefaultTemplate(): PDFConfiguration {
    return {
      id: 'timesheet-default',
      name: 'Timesheet Default Configuration',
      pageSize: 'letter',
      pageOrientation: 'portrait',
      elements: [
        {
          id: 'header-title',
          type: 'text',
          label: 'HOLI TIMESHEET',
          x: 306,
          y: 60,
          width: 200,
          height: 30,
          fontSize: 24,
          fontWeight: 'bold',
          required: true,
          dataKey: 'headerTitle'
        },
        {
          id: 'job-number-label',
          type: 'text',
          label: 'Job#:',
          x: 50,
          y: 100,
          width: 50,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'jobNumberLabel'
        },
        {
          id: 'job-name',
          type: 'text',
          label: 'Job Name',
          x: 100,
          y: 100,
          width: 200,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'jobName'
        },
        {
          id: 'customer-label',
          type: 'text',
          label: 'Customer:',
          x: 50,
          y: 120,
          width: 60,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerLabel'
        },
        {
          id: 'customer-name',
          type: 'text',
          label: 'Customer Name',
          x: 110,
          y: 120,
          width: 200,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerName'
        },
        {
          id: 'date-label',
          type: 'text',
          label: 'Date:',
          x: 350,
          y: 100,
          width: 40,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'dateLabel'
        },
        {
          id: 'date-value',
          type: 'text',
          label: 'Date Value',
          x: 400,
          y: 100,
          width: 100,
          height: 20,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'dateValue'
        },
        {
          id: 'employee-table',
          type: 'table',
          label: 'Employee Table',
          x: 50,
          y: 180,
          width: 500,
          height: 200,
          fontSize: 8,
          fontWeight: 'normal',
          required: true,
          dataKey: 'employeeTable'
        },
        {
          id: 'customer-signature-label',
          type: 'text',
          label: 'Customer Signature:',
          x: 50,
          y: 400,
          width: 120,
          height: 20,
          fontSize: 12,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerSignatureLabel'
        },
        {
          id: 'customer-signature',
          type: 'signature',
          label: 'Customer Signature Box',
          x: 50,
          y: 420,
          width: 200,
          height: 40,
          fontSize: 10,
          fontWeight: 'normal',
          required: true,
          dataKey: 'customerSignature'
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}