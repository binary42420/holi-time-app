"use client";

import { useParams } from "next/navigation";
import SchedulingTimelineDashboard from "@/components/scheduling-timeline-dashboard";

export default function JobSchedulingTimelinePage() {
  const params = useParams();
  const jobId = params.id as string;

  return (
    <div className="container mx-auto py-6">
      <SchedulingTimelineDashboard jobId={jobId} />
    </div>
  );
}