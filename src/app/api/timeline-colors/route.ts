import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET - Load timeline colors
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Load timeline colors from database
      const colorSettings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['timeline_crew_chief_colors', 'timeline_worker_type_colors']
          }
        }
      });

      const response = {
        crewChiefColors: {},
        workerTypeColors: {}
      };

      colorSettings.forEach(setting => {
        if (setting.key === 'timeline_crew_chief_colors') {
          response.crewChiefColors = JSON.parse(setting.value || '{}');
        } else if (setting.key === 'timeline_worker_type_colors') {
          response.workerTypeColors = JSON.parse(setting.value || '{}');
        }
      });

      return NextResponse.json(response);
    } catch (dbError) {
      // If SystemSetting table doesn't exist yet, return defaults
      console.warn('SystemSetting table may not exist yet:', dbError);
      return NextResponse.json({
        crewChiefColors: {},
        workerTypeColors: {}
      });
    }
  } catch (error) {
    console.error('Error loading timeline colors:', error);
    return NextResponse.json({ error: 'Failed to load colors' }, { status: 500 });
  }
}

// POST - Save timeline colors (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { type, colors } = await request.json();

    if (!type || !colors) {
      return NextResponse.json({ error: 'Missing type or colors' }, { status: 400 });
    }

    const settingKey = type === 'crew_chief' 
      ? 'timeline_crew_chief_colors' 
      : 'timeline_worker_type_colors';

    // Save or update the color settings
    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: {
        value: JSON.stringify(colors),
        updatedAt: new Date(),
        updatedBy: session.user.id
      },
      create: {
        key: settingKey,
        value: JSON.stringify(colors),
        createdBy: session.user.id,
        updatedBy: session.user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving timeline colors:', error);
    return NextResponse.json({ error: 'Failed to save colors' }, { status: 500 });
  }
}

// DELETE - Reset timeline colors to defaults (admin only)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Delete both color settings to reset to defaults
    await prisma.systemSetting.deleteMany({
      where: {
        key: {
          in: ['timeline_crew_chief_colors', 'timeline_worker_type_colors']
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting timeline colors:', error);
    return NextResponse.json({ error: 'Failed to reset colors' }, { status: 500 });
  }
}