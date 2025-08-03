"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useJobs } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UserRole } from "@prisma/client"
import JobCard from "@/components/JobCard"

function JobsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: jobsData, isLoading: loading, error } = useJobs()
  const [searchTerm] = useState("")
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted on client side to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const jobs = jobsData || []
  const filteredJobs = jobs.filter(job =>
    job.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Sort jobs by their earliest/latest shift date
    // Jobs with upcoming shifts come first, then jobs with recent shifts
    const getJobDate = (job: any) => {
      if (!job.recentShifts || job.recentShifts.length === 0) {
        return new Date(job.createdAt || job.updatedAt || 0);
      }
      
      // Find the nearest shift date (either upcoming or most recent)
      const now = new Date();
      const upcomingShifts = job.recentShifts.filter((shift: any) => new Date(shift.date) >= now);
      const pastShifts = job.recentShifts.filter((shift: any) => new Date(shift.date) < now);
      
      if (upcomingShifts.length > 0) {
        // Return earliest upcoming shift
        return new Date(Math.min(...upcomingShifts.map((shift: any) => new Date(shift.date).getTime())));
      } else if (pastShifts.length > 0) {
        // Return most recent past shift
        return new Date(Math.max(...pastShifts.map((shift: any) => new Date(shift.date).getTime())));
      }
      
      return new Date(job.createdAt || job.updatedAt || 0);
    };
    
    const dateA = getJobDate(a);
    const dateB = getJobDate(b);
    const now = new Date();
    
    // If both jobs have upcoming shifts, sort by soonest first
    if (dateA >= now && dateB >= now) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // If both jobs have only past shifts, sort by most recent first
    if (dateA < now && dateB < now) {
      return dateB.getTime() - dateA.getTime();
    }
    
    // If one has upcoming shifts and one doesn't, upcoming comes first
    if (dateA >= now && dateB < now) {
      return -1;
    }
    if (dateA < now && dateB >= now) {
      return 1;
    }
    
    return 0;
  })

  const handleDeleteJob = async (jobId: string, jobName: string) => {
    if (confirm(`Are you sure you want to delete ${jobName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          toast({
            title: "Job Deleted",
            description: `${jobName} has been successfully deleted.`,
          })
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        } else {
          throw new Error('Failed to delete job')
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete job. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  if (!mounted || loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Jobs</h1>
              <p className="text-muted-foreground">Loading job data...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 space-y-4">
                <div className="h-5 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="max-w-md bg-destructive/20 border border-destructive rounded-lg p-6 text-center">
                <p className="text-destructive-foreground">Error loading jobs: {error.toString()}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </main>
    )
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Jobs</h1>
              <p className="text-muted-foreground">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
              </p>
            </div>
            {(user?.role === 'Admin' || user?.role === 'CrewChief') && (
              <Button 
                onClick={() => router.push('/jobs/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Job
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onView={() => router.push(`/jobs/${job.id}`)}
                onEdit={() => router.push(`/jobs/${job.id}/edit`)}
                onDelete={(j) => handleDeleteJob(j.id, j.name)}
              />
            ))}
          </div>
      </div>
    </main>
  )
}

export default JobsPage;