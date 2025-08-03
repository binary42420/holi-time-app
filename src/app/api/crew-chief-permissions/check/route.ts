import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { checkCrewChiefPermission } from '@/lib/services/crew-chief-permissions';

export const dynamic = 'force-dynamic';

// GET /api/crew-chief-permissions/check - Check if user has crew chief permission for a shift
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');
    const userId = searchParams.get('userId') || session.user.id;

    if (!shiftId) {
      return NextResponse.json({ error: 'Missing shiftId parameter' }, { status: 400 });
    }

    // Only allow checking own permissions unless user is Admin
    if (userId !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const permissionCheck = await checkCrewChiefPermission(userId, shiftId);
    return NextResponse.json(permissionCheck);
  } catch (error) {
    console.error('Error checking crew chief permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
