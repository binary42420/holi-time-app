"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useOptimizedShifts, useOptimizedCompanies } from "@/hooks/use-optimized-queries"
import { useIntelligentPrefetch, useHoverPrefetch } from "@/hooks/use-intelligent-prefetch"
import { ProgressiveLoading, ContentLoading, StaggeredLoading } from "@/components/ui/enhanced-loading"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, AlertTriangle, Plus, ArrowLeft, MoreHorizontal, Filter, Search } from "lucide-react"
import { UserRole } from '@prisma/client'
import { ShiftStatus } from '@prisma/client'
import { withAuth } from "@/lib/withAuth"

import ShiftCard from "@/components/ShiftCard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ShiftWithDetails } from "@/lib/types"

function AdminShiftsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [companyFilter, setCompanyFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [workersFilter, setWorkersFilter] = useState("all")
  const [isClient, setIsClient] = useState(false)
  
  // Use optimized queries with intelligent caching
  const { data: shifts, isLoading: loading, error, refetch } = useOptimizedShifts({ 
    search: searchTerm,
    companyId: companyFilter !== "all" ? companyFilter : undefined
  }, {
    prefetch: true, // Enable prefetching of individual shifts
  })
  
  const { data: companiesData } = useOptimizedCompanies(undefined, {
    prefetchLogos: true, // Prefetch company logos for better UX
  })
  const companies = companiesData?.companies || []

  // Initialize intelligent prefetching
  const { triggerIntelligentPrefetch } = useIntelligentPrefetch()
  const { onShiftHover, cancelHover } = useHoverPrefetch()

  // Fix hydration mismatch by ensuring client-side rendering for date operations
  useEffect(() => {
    setIsClient(true)
    // Trigger intelligent prefetching for this page
    triggerIntelligentPrefetch('/admin/shifts')
  }, [triggerIntelligentPrefetch])


  const {
    categorizedShifts,
    activeShifts,
    upcomingShiftsCount,
    understaffedShifts,
    totalShifts
  } = React.useMemo(() => {
    // Only perform date operations on client side to prevent hydration mismatch
    if (!isClient) {
      return {
        categorizedShifts: { todays: [], upcoming: [], past: [] },
        activeShifts: 0,
        upcomingShiftsCount: 0,
        understaffedShifts: 0,
        totalShifts: 0
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todays: ShiftWithDetails[] = []
    const upcoming: ShiftWithDetails[] = []
    const past: ShiftWithDetails[] = []
    let activeCount = 0
    let upcomingCount = 0
    let understaffedCount = 0

    let filteredShifts = shifts || [];

    // Apply additional filters
    filteredShifts = filteredShifts.filter(shift => {
      // Date filter
      if (dateFilter !== "all") {
        const shiftDate = new Date(shift.date);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            if (shiftDate < todayStart || shiftDate > todayEnd) return false;
            break;
          case "this_week":
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            if (shiftDate < weekStart || shiftDate > weekEnd) return false;
            break;
          case "this_month":
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            if (shiftDate < monthStart || shiftDate > monthEnd) return false;
            break;
        }
      }

      // Workers filter
      if (workersFilter !== "all") {
        const totalRequired = (shift as any).requiredCrewChiefs + 
                             (shift as any).requiredStagehands + 
                             (shift as any).requiredForkOperators + 
                             (shift as any).requiredReachForkOperators + 
                             (shift as any).requiredRiggers + 
                             (shift as any).requiredGeneralLaborers;
        const assigned = shift.assignedPersonnel ? shift.assignedPersonnel.filter(p => 
          p.userId && p.status !== 'NoShow'
        ).length : 0;
        
        switch (workersFilter) {
          case "no_workers":
            if (totalRequired > 0) return false;
            break;
          case "understaffed":
            if (assigned >= totalRequired) return false;
            break;
          case "fully_staffed":
            if (assigned < totalRequired) return false;
            break;
        }
      }

      return true;
    });

    filteredShifts.forEach(shift => {
      const shiftDate = new Date(shift.date)
      shiftDate.setHours(0, 0, 0, 0)

      if (shiftDate.getTime() === today.getTime()) {
        todays.push(shift)
      } else if (shiftDate > today) {
        upcoming.push(shift)
        upcomingCount++
      } else {
        past.push(shift)
      }

      if (shift.status === ShiftStatus.InProgress) {
        activeCount++
      }

      const required = (shift as any).requiredCrewChiefs + 
                      (shift as any).requiredStagehands + 
                      (shift as any).requiredForkOperators + 
                      (shift as any).requiredReachForkOperators + 
                      (shift as any).requiredRiggers + 
                      (shift as any).requiredGeneralLaborers;
      const assigned = shift.assignedPersonnel ? shift.assignedPersonnel.filter(p => 
        p.userId && p.status !== 'NoShow'
      ).length : 0;
      if (assigned < required && shift.status !== ShiftStatus.Completed) {
        understaffedCount++
      }
    })

    return {
      categorizedShifts: { todays, upcoming, past },
      activeShifts: activeCount,
      upcomingShiftsCount: upcomingCount,
      understaffedShifts: understaffedCount,
      totalShifts: filteredShifts.length
    }
  }, [shifts, searchTerm, dateFilter, workersFilter, isClient])

  useEffect(() => {
    if (user && user.role !== UserRole.Admin) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Show loading state during hydration to prevent mismatch
  if (!isClient || user?.role !== UserRole.Admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const renderShiftGroup = (title: string, shifts: ShiftWithDetails[]) => {
    if (!shifts.length) return null
    
    const shiftCards = shifts.map(shift => (
      <div 
        key={shift.id} 
        className="relative group"
        onMouseEnter={() => onShiftHover(shift.id)}
        onMouseLeave={cancelHover}
      >
        <ShiftCard 
          shift={shift}
          onClick={() => router.push(`/shifts/${shift.id}`)}
        />
        <div className="absolute top-2 right-2 invisible group-hover:visible">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/shifts/${shift.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/shifts/${shift.id}/edit`)}>
                Edit Shift
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete Shift
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    ));

    return (
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-gray-700">{title}</h2>
        <StaggeredLoading className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shiftCards}
        </StaggeredLoading>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Shift Management</h1>
          <p className="text-muted-foreground">Schedule and manage work shifts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/shifts/templates')}>
            Shift Templates
          </Button>
          <Button onClick={() => router.push('/admin/shifts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Shift
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShifts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShifts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingShiftsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Understaffed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{understaffedShifts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Company</label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Workers Needed</label>
            <Select value={workersFilter} onValueChange={setWorkersFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="no_workers">No Workers Needed</SelectItem>
                <SelectItem value="understaffed">Understaffed</SelectItem>
                <SelectItem value="fully_staffed">Fully Staffed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Shifts
          </CardTitle>
          <CardDescription>
            Manage all shifts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressiveLoading
            isLoading={loading}
            hasError={!!error}
            isEmpty={!shifts || shifts.length === 0}
            skeleton={<ContentLoading.Shifts />}
            errorState={
              <div className="flex items-center justify-center py-8">
                <div className="text-destructive">Error loading shifts: {error?.message}</div>
              </div>
            }
            emptyState={
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Shifts Found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by scheduling your first shift.
                </p>
                <Button onClick={() => router.push('/admin/shifts/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Shift
                </Button>
              </div>
            }
          >
            <div className="mt-4">
              {renderShiftGroup("Today's Shifts", categorizedShifts.todays)}
              {renderShiftGroup("Upcoming Shifts", categorizedShifts.upcoming)}
              {renderShiftGroup("Past Shifts", categorizedShifts.past)}
            </div>
          </ProgressiveLoading>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(AdminShiftsPage, UserRole.Admin);
