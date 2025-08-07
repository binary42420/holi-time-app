import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth-config';
import { prisma } from './prisma';
import { User } from '@prisma/client';

// Server-side authentication helper for App Router
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    // Fetch user data from the database (excluding large fields)
    const { getUserExtended } = await import('./user-queries');
    const user = await getUserExtended(session.user.id);

    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}