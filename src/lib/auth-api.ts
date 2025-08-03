import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

type ApiHandler = (req: Request, context: { params: any }) => Promise<NextResponse>;

type RoleCheck = (role: UserRole) => boolean;

export function withAuthApi(handler: ApiHandler, roleCheck?: RoleCheck) {
  return async (req: Request, context: { params: any }) => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (roleCheck && !roleCheck(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req, context);
  };
}
