"use client"

import { useParams, useRouter } from "next/navigation"
import { useCompany, useShifts } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Calendar, Clock, Users, MapPin, AlertCircle, RefreshCw, UserCheck, UserX, Activity } from "lucide-react"
import { getAssignedWorkerCount, getTotalRequiredWorkers } from "@/lib/worker-count-utils"

// Helper function to get shift display name (prioritize description, fallback to job name)
const getShiftDisplayName = (shift: any) => {
  if (shift.description && shift.description.trim()) {
    return shift.description.trim()
  }
  return shift.job?.name || 'Unnamed Shift'
}

// Helper functions for status indicators
const getAssignmentStatusColor = (assignedCount: number, requiredCount: number) => {
  const percentage = requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 0
  if (percentage >= 100) return 'text-green-600'
  if (percentage >= 75) return 'text-yellow-600'
  if (percentage >= 50) return 'text-orange-600'
  return 'text-red-600'
}

const getAssignmentStatusIcon = (assignedCount: number, requiredCount: number) => {
  const percentage = requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 0
  if (percentage >= 100) return <UserCheck className="h-4 w-4 text-green-600" />
  if (percentage >= 50) return <Users className="h-4 w-4 text-yellow-600" />
  return <UserX className="h-4 w-4 text-red-600" />
}

const getDaysUntilShift = (shiftDate: string) => {
  const days = Math.ceil((new Date(shiftDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days away`
}

export default function CompanyUpcomingPage() {
  const params = useParams()
  const companyId = params.id as string
  const router = useRouter()
  
  const { data: company, isLoading: companyLoading, isError: companyError, refetch: refetchCompany } = useCompany(companyId)
  const { data: shifts, isLoading: shiftsLoading, isError: shiftsError, refetch: refetchShifts } = useShifts()

  // Filter upcoming shifts for this company
  const companyShifts = shifts?.filter((shift: any) => 
    shift.job?.companyId === companyId && new Date(shift.date) >= new Date()
  ) || []
  
  // Sort shifts by date (soonest first)
  const sortedShifts = companyShifts.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const isLoading = companyLoading || shiftsLoading
  const hasError = companyError || shiftsError

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
                  refetchShifts();
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

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold">Upcoming Shifts</h1>
        <p className="text-muted-foreground">All scheduled upcoming shifts for {company.name}</p>
        <div className="mt-2">
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            {sortedShifts.length} upcoming shifts
          </Badge>
        </div>
      </div>

      {/* Upcoming Shifts List */}
      <div className="space-y-4">
        {sortedShifts.length > 0 ? (
          sortedShifts.map((shift: any) => (
            <Card 
              key={shift.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-blue-500" 
              onClick={() => router.push(`/shifts/${shift.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <h3 className="text-xl font-semibold">
                        {getShiftDisplayName(shift)}
                      </h3>
                      <Badge variant="outline" className="border-blue-500 text-blue-600">
                        Scheduled
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(shift.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(shift.startTime).toLocaleTimeString()} - {new Date(shift.endTime).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{shift.location || 'No location'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="font-medium text-blue-600">
                          {getDaysUntilShift(shift.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getAssignmentStatusIcon(getAssignedWorkerCount(shift), getTotalRequiredWorkers(shift))}
                      <span className={getAssignmentStatusColor(getAssignedWorkerCount(shift), getTotalRequiredWorkers(shift))}>
                        {getAssignedWorkerCount(shift)}/{getTotalRequiredWorkers(shift)} workers assigned
                      </span>
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
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Shifts</h3>
              <p className="text-muted-foreground text-center">
                {company.name} doesn't have any upcoming shifts scheduled.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}