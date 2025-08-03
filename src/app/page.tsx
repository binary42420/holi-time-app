'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CompanyPortalLanding } from '@/components/company-portal-landing';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (session && typeof window !== 'undefined') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Show client portal landing if not authenticated or loading screen if checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <CompanyPortalLanding />;
  }

  // If authenticated, show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
