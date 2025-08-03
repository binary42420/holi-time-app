'use client';

import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CompanyDashboard from '../(dashboards)/company/page';
import { EnhancedEmployeeDashboard } from '@/components/dashboards/enhanced-employee-dashboard';
import { EnhancedCrewChiefDashboard } from '@/components/dashboards/enhanced-crew-chief-dashboard';
import { EnhancedAdminDashboard } from '@/components/dashboards/enhanced-admin-dashboard';

export default function DashboardPage() {
  const { user, status } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading' && !user) {
      router.push('/login');
    }
  }, [user, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Redirecting to login...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  switch (user.role) {
    case 'CompanyUser':
      return <CompanyDashboard />;
    case 'Staff':
    case 'Employee':
      return <EnhancedEmployeeDashboard />;
    case 'CrewChief':
      return <EnhancedCrewChiefDashboard />;
    case 'Admin':
      return <EnhancedAdminDashboard />;
    default:
      return <EnhancedEmployeeDashboard />; // Default to employee dashboard
  }
}