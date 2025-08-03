'use client';

import React from 'react';
import { useUser } from "@/hooks/use-user";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  hasAccess: (role: string) => boolean
) {
  return function WithAuth(props: P) {
    const { user, status } = useUser();
    const isLoading = status === 'loading';
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login');
      } else if (!isLoading && user && !hasAccess(user.role)) {
        router.push('/unauthorized');
      }
    }, [user, isLoading, router]);

    if (isLoading || !user || !hasAccess(user.role)) {
      return <div>Loading...</div>; // Or a proper loading spinner
    }

    return <WrappedComponent {...props} />;
  };
}
