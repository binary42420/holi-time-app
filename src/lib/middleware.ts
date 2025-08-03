import { NextRequest } from 'next/server';
import { type UserAuth } from './types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth-config';
import { prisma } from './prisma';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Helper function to get user from request (for use in API routes)
// NOTE: This function is deprecated in favor of getAuthenticatedUser from auth-server.ts
// for App Router API routes. Keep for backward compatibility with Pages Router.
export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      // Fetch the complete user data from the database
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (!user) {
        console.warn(`Session exists for user ${session.user.id} but user not found in database`);
        return null;
      }
      
      return user;
    }

    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Helper function to get user auth info (lightweight version)
export async function getCurrentUserAuth(req: NextRequest): Promise<UserAuth | null> {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name!,
      role: session.user.role,
      companyId: session.user.companyId || null,
      avatarUrl: session.user.image || `https://i.pravatar.cc/32?u=${session.user.email}`
    };
  }

  return null;
}
