"use client";

import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useJobs, useShifts } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { VisualJobTimeline } from "@/components/visual-job-timeline";

export default function JobSchedulingTimelinePage() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useJobs({});
  const { data: shiftsData, isLoading: shiftsLoading, isError: shiftsError, refetch } = useShifts({ jobId: jobId as string });

  const job = jobsData?.find(j => j.id === jobId);
  const shifts = shiftsData || [];

  const isLoading = jobsLoading || shiftsLoading;
  const isError = jobsError || shiftsError;

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view the job timeline.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p>Loading job timeline...</p>
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-red-600">
            {!job ? 'Job not found' : 'Error loading job timeline'}
          </p>
          <Button 
            onClick={() => refetch()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Job Timeline Manager</h1>
            <p className="text-muted-foreground">{job.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/jobs/${jobId}`)}
          >
            ← Back to Job
          </Button>
        </div>

        {/* Visual Timeline */}
        {shifts.length > 0 ? (
          <VisualJobTimeline 
            job={job}
            shifts={shifts}
            onRefresh={refetch}
          />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <h2 className="text-lg font-semibold mb-2">No Shifts Found</h2>
            <p className="text-muted-foreground mb-4">
              This job doesn't have any shifts scheduled yet.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/jobs/${jobId}/shifts/new`)}
            >
              Add First Shift
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}