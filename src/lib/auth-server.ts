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

    // Fetch the complete user data from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}