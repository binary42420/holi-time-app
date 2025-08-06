// Enhanced Job Scheduling Timeline Page
// Provides a comprehensive scheduling dashboard for team assignment meetings
// Features: Visual timeline, multiple view modes, advanced filtering, meeting mode,
// real-time updates, and enhanced export capabilities

import React from 'react'
import SchedulingTimelineDashboard from '@/components/scheduling-timeline-dashboard'

export default function JobSchedulingPage({ params }: { params: { id: string } }) {
  return (
    <div className="container py-6">
      <SchedulingTimelineDashboard jobId={params.id} />
    </div>
  )
}

export const metadata = {
  title: 'Job Scheduling Timeline',
  description: 'Interactive scheduling timeline for team assignment meetings and staffing management',
}
