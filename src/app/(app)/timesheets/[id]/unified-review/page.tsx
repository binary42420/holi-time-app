'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UnifiedTimesheetReview from '@/components/unified-timesheet-review';
import { LoadingSpinner } from '@/components/loading-states';

export default function UnifiedTimesheetReviewPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const timesheetId = params.id as string;

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (!session?.user) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600">Please sign in to view this timesheet.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <UnifiedTimesheetReview
        timesheetId={timesheetId}
        userRole={session.user.role}
        userId={session.user.id}
        companyId={session.user.companyId}
      />
    </div>
  );
}
