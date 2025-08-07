'use client';

import { useUser } from "@/hooks/use-user";
import { useRouter } from 'next/navigation';
import { useEffect, lazy, Suspense } from 'react';

// Lazy load dashboards for code splitting and faster initial loads
const CompanyDashboard = lazy(() => import('../(dashboards)/company/page'));
const EnhancedEmployeeDashboard = lazy(() => import('@/components/dashboards/enhanced-employee-dashboard').then(m => ({ default: m.EnhancedEmployeeDashboard })));
const EnhancedCrewChiefDashboard = lazy(() => import('@/components/dashboards/enhanced-crew-chief-dashboard').then(m => ({ default: m.EnhancedCrewChiefDashboard })));
const EnhancedAdminDashboard = lazy(() => import('@/components/dashboards/enhanced-admin-dashboard').then(m => ({ default: m.EnhancedAdminDashboard })));

// Fast loading component
const DashboardLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading dashboard...</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user, status } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading' && !user) {
      router.push('/login');
    }
  }, [user, status, router]);

  if (status === 'loading' || !user) {
    return <DashboardLoader />;
  }

  // Render dashboard with suspense for code splitting
  const renderDashboard = () => {
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
  };

  return (
    <Suspense fallback={<DashboardLoader />}>
      {renderDashboard()}
    </Suspense>
  );
}