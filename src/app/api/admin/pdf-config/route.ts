import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { PDFTemplateStorage } from '@/lib/pdf-template-storage';

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

// GET - Retrieve PDF configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId') || 'timesheet-default';

    // Try to load template from storage
    let config = await PDFTemplateStorage.loadTemplate(templateId);
    
    // If not found, return default template
    if (!config) {
      config = PDFTemplateStorage.getDefaultTemplate();
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching PDF configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF configuration' },
      { status: 500 }
    );
  }
}

// POST - Save PDF configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configuration: PDFConfiguration = await request.json();

    // Validate configuration
    if (!configuration.id || !configuration.name || !configuration.elements) {
      return NextResponse.json(
        { error: 'Invalid configuration data' },
        { status: 400 }
      );
    }

    // Update timestamp
    configuration.updatedAt = new Date().toISOString();

    // Save template to storage
    await PDFTemplateStorage.saveTemplate(configuration);

    return NextResponse.json({
      success: true,
      message: 'PDF configuration saved successfully',
      configuration
    });
  } catch (error) {
    console.error('Error saving PDF configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save PDF configuration' },
      { status: 500 }
    );
  }
}