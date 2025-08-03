import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      companyId?: string;
      avatarUrl?: string;
    };
  }

  interface User {
    id: string;
    role: UserRole;
    companyId?: string | null;
    avatarUrl?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    companyId?: string;
    avatarUrl?: string | null;
    error?: string;
  }
}
