"use client"

import { useState, useMemo, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from '@tanstack/react-query'
import { useUser } from "@/hooks/use-user"
import { useTimesheets } from "@/hooks/use-api"
import { useNavigationPerformance } from "@/hooks/use-navigation-performance"
import { useTimesheetCache } from "@/hooks/use-entity-cache"
import { useEnhancedPerformance } from "@/hooks/use-enhanced-performance"
import { format } from "date-fns"
import type { TimesheetDetails } from "@/lib/types"
import { TimesheetDetails as TimesheetDetailsComponent } from "@/components/timesheet-details"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Clock, Calendar, Building2, AlertCircle, RefreshCw } from "lucide-react"
import { CompanyAvatar } from "@/components/CompanyAvatar"

function TimesheetsContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTimesheetId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('pending_client_approval');
  
  // Enhanced navigation performance
  const { navigateWithPrefetch, handleHover, cancelHover } = useNavigationPerformance({
    enableHoverPrefetch: true,
    enableRoutePreloading: true,
  });
  
  // Performance optimizations
  const { smartPrefetch } = useEnhancedPerformance();

  const { data: timesheetsData, isLoading: loading, error, refetch } = useTimesheets({ status: activeTab });

  const selectedTimesheet = useMemo(() => {
    if (!selectedTimesheetId || !timesheetsData) return null;
    return timesheetsData.find(t => t.id === selectedTimesheetId) || null;
  }, [selectedTimesheetId, timesheetsData]);

  const queryClient = useQueryClient();

  // Prefetch timesheets page data on mount
  useEffect(() => {
    if (user) {
      smartPrefetch('/timesheets');
    }
  }, [user, smartPrefetch]);

  const handlePrefetchTimesheet = (id: string) => {
    handleHover(`/timesheets/${id}/review`);
  };

  const handleTimesheetClick = (id: string) => {
    navigateWithPrefetch(`/timesheets/${id}/review`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return 'secondary';
      case 'pending_manager_approval':
        return 'outline';
      case 'completed':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return 'Client Review';
      case 'pending_manager_approval':
        return 'Manager Review';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load timesheets. Please try again.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => refetch()} 
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Timesheets</h1>
          <p className="text-muted-foreground">
            Review and manage timesheet submissions
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timesheets List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending_client_approval">Client</TabsTrigger>
                  <TabsTrigger value="pending_manager_approval">Manager</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-2 mt-2">
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {timesheetsData && timesheetsData.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No timesheets found for this status
                      </p>
                      {timesheetsData && timesheetsData.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Try switching to a different status tab above
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  timesheetsData.filter(timesheet => timesheet && timesheet.shift).map(timesheet => (
                    <Card
                      key={timesheet.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTimesheetId === timesheet.id 
                          ? 'ring-2 ring-primary border-primary' 
                          : ''
                      }`}
                      onMouseEnter={() => handlePrefetchTimesheet(timesheet.id)}
                      onMouseLeave={cancelHover}
                      onClick={() => handleTimesheetClick(timesheet.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">
                              {timesheet.shift?.job?.name || 'Unknown Job'}
                            </h3>
                            <Badge variant={getStatusBadgeVariant(timesheet.status)}>
                              {getStatusLabel(timesheet.status)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <CompanyAvatar
                              src={timesheet.shift?.job?.company?.company_logo_url}
                              name={timesheet.shift?.job?.company?.name || ''}
                              className="w-5 h-5"
                            />
                            <span className="text-sm text-muted-foreground truncate">
                              {timesheet.shift?.job?.company?.name || 'Unknown Company'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {timesheet.shift?.date ? format(new Date(timesheet.shift.date), 'MMM d, yyyy') : 'No date'}
                            </div>
                            {timesheet.shift?.startTime && timesheet.shift?.endTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(timesheet.shift.startTime), 'h:mm a')} - {format(new Date(timesheet.shift.endTime), 'h:mm a')}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Timesheet Details */}
        <div className="lg:col-span-2">
          <Card className="h-[700px]">
            <ScrollArea className="h-full">
              {selectedTimesheet ? (
                <div className="p-6">
                  <TimesheetDetailsComponent timesheet={selectedTimesheet as TimesheetDetails} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">No timesheet selected</h3>
                      <p className="text-muted-foreground">
                        Select a timesheet from the list to view its details
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function TimesheetsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    }>
      <TimesheetsContent />
    </Suspense>
  )
}
