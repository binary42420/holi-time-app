"use client"

import { useParams, useRouter } from "next/navigation"
import { useCompany, useJobs } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Briefcase, Calendar, Users, MapPin, Plus, AlertCircle, RefreshCw } from "lucide-react"
import { useUser } from "@/hooks/use-user"

interface CompanyJobsPageProps {
  params: { id: string }
}

export default function CompanyJobsPage() {
  const params = useParams()
  const companyId = params.id as string
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Admin'
  
  const { data: company, isLoading: companyLoading, isError: companyError, refetch: refetchCompany } = useCompany(companyId)
  const { data: jobs, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useJobs()

  const companyJobs = jobs?.filter(job => job.companyId === companyId) || []
  const isLoading = companyLoading || jobsLoading
  const hasError = companyError || jobsError

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (hasError || !company) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!company ? 'Company not found' : 'Error loading company data'}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchCompany();
                  refetchJobs();
                }}
                className="mt-2 w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/companies/${companyId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {company.name}
          </Button>
        </div>
        {canEdit && (
          <Button
            onClick={() => router.push(`/admin/jobs/new?companyId=${companyId}`)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        )}
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold">All Jobs</h1>
        <p className="text-muted-foreground">Complete job history for {company.name}</p>
        <div className="mt-2">
          <Badge variant="outline">{companyJobs.length} total jobs</Badge>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {companyJobs.length > 0 ? (
          companyJobs.map((job: any) => (
            <Card 
              key={job.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors" 
              onClick={() => router.push(`/jobs/${job.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-xl font-semibold">{job.name}</h3>
                      <Badge variant={job.status === 'Active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                    {job.description && (
                      <p className="text-muted-foreground mb-3">{job.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {job.startDate ? new Date(job.startDate).toLocaleDateString() : 'No start date'}
                          {job.endDate && ` - ${new Date(job.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{job.shiftsCount || 0} shifts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location || 'No location'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {company.name} doesn't have any jobs assigned yet.
              </p>
              {canEdit && (
                <Button 
                  onClick={() => router.push(`/admin/jobs/new?companyId=${companyId}`)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create First Job
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}