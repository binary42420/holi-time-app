'use client';

import { DashboardPage } from '@/components/DashboardPage';
import { CompanyDashboardClient } from './CompanyDashboardClient';
import { useUser } from '@/hooks/use-user';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

import { Job, Shift } from '@prisma/client';

export type DashboardData = {
  activeJobsCount: number;
  upcomingShiftsCount: number;
  completedShiftsCount: number;
  recentJobs: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate?: string;
    company: { name: string };
  }[];
  upcomingShifts: {
    id: string;
    date: string;
    startTime: string;
    job: {
      name: string;
      company: { name: string };
    };
  }[];
};

export default function CompanyDashboard() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user?.companyId) {
        setError('No company associated with user');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/companies/${user.companyId}/dashboard`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.companyId]);

  if (loading) {
    return (
      <DashboardPage title="Loading Dashboard...">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardPage>
    );
  }

  if (error || !user?.companyId || !data) {
    return (
      <DashboardPage title="Error">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'No company associated with your account'}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardPage>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <DashboardPage
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg">
              <span className="text-white font-bold text-xl">🏢</span>
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">
              Company Dashboard
            </span>
          </div>
        }
        description="Manage your workforce scheduling and track project progress with enhanced insights"
      >
        <CompanyDashboardClient 
          initialData={data}
          companyId={user.companyId}
        />
      </DashboardPage>
    </div>
  );
}
