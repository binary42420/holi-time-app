"use client"

import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { UserRole } from '@prisma/client';
import { useMemo } from 'react';

import { Company } from "@/lib/types";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  is_active: boolean;
  last_login?: Date;
  companyId?: string;
  companyName?: string;
  company?: Company;
};

export const useUser = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      return !result?.error;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const user: AuthUser | null = useMemo(() => {
    return session?.user
      ? {
          id: session.user.id,
          name: session.user.name ?? 'Unknown User',
          email: session.user.email ?? '',
          avatar: (session.user as any).avatarUrl || (session.user as any).image || '',
          role: session.user.role as UserRole,
          is_active: true, // Assuming active if session exists
          companyId: (session.user as any).companyId,
          company: (session.user as any).company,
        }
      : null;
  }, [session?.user]);

  return {
    user,
    status,
    login,
    logout,
    isLoading: status === 'loading'
  };
};
