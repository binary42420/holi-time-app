"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useShifts } from "@/hooks/use-api"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, AlertTriangle, Plus, ArrowLeft, MoreHorizontal } from "lucide-react"
import { UserRole } from '@prisma/client'
import { ShiftStatus } from '@prisma/client'
import { withAuth } from "@/lib/withAuth"
import SearchAndFilter from "@/components/SearchAndFilter"
import ShiftCard from "@/components/ShiftCard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShiftWithDetails } from "@/lib/types"

function AdminShiftsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isClient, setIsClient] = useState(false)
  const { data: shifts, isLoading: loading, error } = useShifts({ search: searchTerm })

  // Fix hydration mismatch by ensuring client-side rendering for date operations
  useEffect(() => {
    setIsClient(true)
  }, [])


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

    const filteredShifts = shifts || [];

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

      const required = (shift as any).workerRequirements ? (shift as any).workerRequirements.reduce((acc, req) => acc + req.requiredCount, 0) : 0;
      const assigned = shift.assignedPersonnel ? shift.assignedPersonnel.filter(p => !(p as any).isPlaceholder).length : 0;
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
  }, [shifts, searchTerm, isClient])

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
    return (
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-gray-700">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map(shift => (
            <div key={shift.id} className="relative group">
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
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin-panel')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Panel
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
            <Calendar className="h-5 w-5" />
            All Shifts
          </CardTitle>
          <CardDescription>
            Manage all shifts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading shifts...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Error loading shifts: {error.message}</div>
            </div>
          ) : shifts.length === 0 ? (
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
          ) : (
            <div className="mt-4">
              <SearchAndFilter onSearchChange={setSearchTerm} />
              
              <div className="mt-6">
                {renderShiftGroup("Today's Shifts", categorizedShifts.todays)}
                {renderShiftGroup("Upcoming Shifts", categorizedShifts.upcoming)}
                {renderShiftGroup("Past Shifts", categorizedShifts.past)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(AdminShiftsPage, UserRole.Admin);
