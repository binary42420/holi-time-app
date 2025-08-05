"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useJobs, useCompanies } from "@/hooks/use-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Briefcase, AlertCircle, RefreshCw, Filter, Search } from "lucide-react";
import { withAuth } from "@/lib/withAuth";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { UserRole, JobStatus } from '@prisma/client'

import { Job } from "@/lib/types"

import { WorkerRolesBadges } from "@/components/WorkerRolesBadges"
import { getWorkersNeeded, WorkerNeeded } from "@/lib/worker-count-utils"

// Define the interface for worker requirements
interface WorkerRequirement {
  id: string;
  roleCode: string;
  roleName: string;
  requiredCount: number;
}
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/StatusBadge"

function AdminJobsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("recentShifts")

  const { data: jobsData, isLoading: loading, error, refetch } = useJobs({
    status: statusFilter,
    companyId: companyFilter,
    search: searchTerm,
    sortBy: sortBy,
  })
  const { data: companiesData } = useCompanies()
  const jobs = jobsData || []
  const companies = companiesData?.companies || []

  console.log('Jobs data:', jobs);

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`)
  }

  // Calculate total required workers across all shifts for all worker types
  const totalWorkers = (job: Job) => {
    return job.shifts.reduce((acc, shift) => {
      const shiftTotal = (shift as any).requiredCrewChiefs + 
                        (shift as any).requiredStagehands + 
                        (shift as any).requiredForkOperators + 
                        (shift as any).requiredReachForkOperators + 
                        (shift as any).requiredRiggers + 
                        (shift as any).requiredGeneralLaborers;
      return acc + shiftTotal;
    }, 0);
  }
  
  // Calculate total assigned personnel across all shifts (only actual assignments, not placeholders)
  const filledPositions = (job: Job) => {
    return job.shifts.reduce((acc, shift) => {
      const actualAssignments = shift.assignedPersonnel?.filter(p => 
        p.userId && p.status !== 'NoShow'
      ).length || 0;
      return acc + actualAssignments;
    }, 0);
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-1/2 bg-gray-700" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full bg-gray-800" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Alert className="max-w-md bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                Error loading jobs: {error.toString()}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-2 w-full border-red-700 text-red-200 hover:bg-red-800"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Manage Jobs</h1>
              <p className="text-gray-400">{jobs.length} jobs found</p>
            </div>
            <Button onClick={() => router.push('/admin/jobs/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Job
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Sorting
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search jobs or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.values(JobStatus).map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Company</label>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="recentShifts">Recent Shifts</SelectItem>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {jobs.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700 text-center py-12">
              <CardContent>
                <Briefcase size={48} className="text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white">No Jobs Found</h3>
                <p className="text-gray-400 mt-2">Try adjusting your filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  onClick={() => handleJobClick(job.id)}
                  className="cursor-pointer flex flex-col"
                >
                  <CardHeader>
                    <CardTitle className="text-white">{job.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <CompanyAvatar
                        src={job.company?.company_logo_url}
                        name={job.company?.name || ''}
                        className="w-6 h-6"
                      />
                      <p className="text-gray-400">{job.company?.name}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between">
                    <div>
                      <StatusBadge status={job.status} />
                      <div className="mt-4">
                        {(() => {
                          // Calculate workers needed across all shifts for this job
                          const allWorkersNeeded: WorkerNeeded[] = [];
                          const workerNeededMap = new Map<string, WorkerNeeded>();

                          job.shifts.forEach(shift => {
                            const shiftWorkersNeeded = getWorkersNeeded({
                              assignedPersonnel: shift.assignedPersonnel,
                              requiredCrewChiefs: (shift as any).requiredCrewChiefs,
                              requiredStagehands: (shift as any).requiredStagehands,
                              requiredForkOperators: (shift as any).requiredForkOperators,
                              requiredReachForkOperators: (shift as any).requiredReachForkOperators,
                              requiredRiggers: (shift as any).requiredRiggers,
                              requiredGeneralLaborers: (shift as any).requiredGeneralLaborers,
                            });

                            // Aggregate workers needed by role across all shifts
                            shiftWorkersNeeded.forEach(worker => {
                              const existing = workerNeededMap.get(worker.roleCode);
                              if (existing) {
                                existing.needed += worker.needed;
                                existing.required += worker.required;
                                existing.assigned += worker.assigned;
                              } else {
                                workerNeededMap.set(worker.roleCode, { ...worker });
                              }
                            });
                          });

                          const workersNeeded = Array.from(workerNeededMap.values());

                          return workersNeeded.length > 0 ? (
                            <>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Workers Still Needed</h4>
                              <WorkerRolesBadges requirements={workersNeeded.map(worker => ({
                                id: `${job.id}-${worker.roleCode}`,
                                roleCode: worker.roleCode,
                                roleName: worker.roleName,
                                requiredCount: worker.needed
                              }))} />
                            </>
                          ) : (
                            <>
                              <h4 className="text-sm font-medium text-green-400 mb-2">Fully Staffed</h4>
                              <p className="text-xs text-gray-500">All positions filled across all shifts</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Filled Positions</span>
                        <span>{filledPositions(job)} of {totalWorkers(job)}</span>
                      </div>
                      <Progress value={totalWorkers(job) > 0 ? (filledPositions(job) / totalWorkers(job)) * 100 : 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

export default withAuth(AdminJobsPage, UserRole.Admin)