
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { useUser } from "@/hooks/use-user"
import { useShifts } from "@/hooks/use-api"
import { useEnhancedPerformance } from "@/hooks/use-enhanced-performance"
import { useCacheManagement } from "@/hooks/use-cache-management"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Building,
  AlertCircle,
  RefreshCw,
  Calendar as CalendarIcon
} from "lucide-react"
import { CompanyAvatar } from "@/components/CompanyAvatar"
import { StatusBadge } from "@/components/ui/status-badge"
import { FulfillmentBadge } from "@/components/dashboard/shifts-section"

// Update the date and time formatting functions
const formatSimpleDate = (date: string | Date) => {
  return format(new Date(date), 'MM/dd/yyyy')
}

const formatSimpleTime = (time: string | Date) => {
  return format(new Date(time), 'hh:mm a')
}

export default function ShiftsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { smartPrefetch, prefetchForPage } = useEnhancedPerformance()
  const { refreshShifts, isDevelopment } = useCacheManagement()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted on client side to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Map frontend date filter values to backend expected values
  const backendDateFilter = dateFilter === 'week' ? 'this_week' : dateFilter === 'month' ? 'this_month' : dateFilter;
  const { data: shifts = [], isLoading, isError, error, refetch } = useShifts({ 
    date: backendDateFilter, 
    status: statusFilter, 
    companyId: companyFilter, 
    search: searchTerm 
  })


  const canManage = user?.role === 'Admin' || user?.role === 'CrewChief'

  // Performance optimization on mount - must be before conditional returns
  useEffect(() => {
    if (user) {
      smartPrefetch('/shifts');
    }
  }, [user, smartPrefetch]);

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Please log in to view shifts.</p>
        </div>
      </main>
    )
  }

  const getPageTitle = () => {
    switch (dateFilter) {
      case 'today': return 'Today\'s Shifts'
      case 'tomorrow': return 'Tomorrow\'s Shifts'
      case 'week': return 'This Week\'s Shifts'
      case 'month': return 'This Month\'s Shifts'
      default: return 'All Shifts'
    }
  }

  const getDateBadge = (date: string) => {
    const shiftDate = new Date(date)
    if (isToday(shiftDate)) {
      return <Badge variant="default" className="bg-blue-600 text-white">Today</Badge>
    }
    if (isTomorrow(shiftDate)) {
      return <Badge variant="default" className="bg-green-600 text-white">Tomorrow</Badge>
    }
    if (isYesterday(shiftDate)) {
      return <Badge variant="secondary">Yesterday</Badge>
    }
    return <Badge variant="outline">{format(shiftDate, 'MMM d')}</Badge>
  }



  const filteredShifts = shifts.filter((shift: any) => {
    if (searchTerm && !shift.job?.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !shift.job?.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  }).sort((a: any, b: any) => {
    // Sort by date (soonest first for upcoming shifts, most recent first for past shifts)
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    const now = new Date();
    
    // If both shifts are in the future, sort by soonest first
    if (dateA >= now && dateB >= now) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // If both shifts are in the past, sort by most recent first
    if (dateA < now && dateB < now) {
      return dateB.getTime() - dateA.getTime();
    }
    
    // If one is future and one is past, future comes first
    if (dateA >= now && dateB < now) {
      return -1;
    }
    if (dateA < now && dateB >= now) {
      return 1;
    }
    
    return 0;
  })

  const handleRowClick = (shiftId: string) => {
    // Prefetch the shift detail page before navigation for better performance
    prefetchForPage(`/shifts/${shiftId}`);
    router.push(`/shifts/${shiftId}`)
  }


  if (!mounted || isLoading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Shifts</h1>
              <p className="text-muted-foreground">Loading shift data...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>
      </main>
    )
  }

  if (isError) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Alert className="max-w-md bg-destructive/20 border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading shifts: {error?.message || 'Unknown error'}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="mt-2 w-full"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </main>
    )
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
            <p className="text-muted-foreground">
              {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {canManage && (
            <Button onClick={() => router.push('/admin/shifts/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Shift
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setDateFilter("all")
                    setCompanyFilter("all")
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs or clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="tomorrow">Tomorrow</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shifts Grid */}
          {filteredShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No shifts found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                  ? "Try adjusting your filters to see more shifts."
                  : "No shifts have been scheduled yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShifts.map((shift: any) => (
                <Card
                  key={shift.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(shift.id)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{shift.job?.name}</h3>
                          <div className="flex items-center gap-2">
                            <CompanyAvatar
                              src={shift.job?.company?.company_logo_url}
                              name={shift.job?.company?.name || ''}
                              className="w-6 h-6"
                            />
                            <p className="text-sm text-muted-foreground truncate">{shift.job?.company?.name}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-3">
                          {getDateBadge(shift.date)}
                          <StatusBadge status={shift.status} size="sm" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-300">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{formatSimpleDate(shift.date)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-300">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{formatSimpleTime(shift.startTime)} - {formatSimpleTime(shift.endTime)}</span>
                        </div>
                        {shift.location && (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="truncate">{shift.location}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm gap-2">
                          <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div className="text-muted-foreground">
                            {(() => {
                              // Use fulfillment data if available, otherwise calculate
                              if (shift.fulfillment) {
                                return `${shift.fulfillment.totalAssigned} of ${shift.fulfillment.totalRequired} Workers Assigned`;
                              }
                              
                              // Fallback calculation
                              const assignedCount = shift.assignedPersonnel?.filter((p: any) => p.userId).length || 0;
                              const totalRequired = (shift.requiredCrewChiefs || 0) + 
                                                   (shift.requiredStagehands || 0) + 
                                                   (shift.requiredForkOperators || 0) + 
                                                   (shift.requiredReachForkOperators || 0) + 
                                                   (shift.requiredRiggers || 0) + 
                                                   (shift.requiredGeneralLaborers || 0);
                              const requested = totalRequired || shift.requestedWorkers || 0;
                              
                              return `${assignedCount} of ${requested} Workers Assigned`;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }
