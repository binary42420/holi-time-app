"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useParams } from 'next/navigation';
import { useUserById } from '@/hooks/use-api';
import { useUser } from "@/hooks/use-user";
import { UserRole, ShiftStatus } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, Edit, Phone, Mail, MapPin, Briefcase, Plus, Calendar, Users, AlertCircle, RefreshCw, Clock, CheckCircle, XCircle, UserCheck, UserX, TrendingUp, Activity, Crown, Truck, HardHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast"
import { format, isPast, isFuture, isToday, isYesterday, isTomorrow, differenceInHours } from 'date-fns';
import { Progress } from "@/components/ui/progress"; // Assuming a Progress component exists

// Helper functions for status indicators (copied from companies/[id]/page.tsx for consistency)
const getShiftStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-green-500'
    case 'in_progress': return 'bg-blue-500'
    case 'scheduled': return 'bg-yellow-500'
    case 'cancelled': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

const getShiftStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'default'
    case 'in_progress': return 'secondary'
    case 'scheduled': return 'outline'
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

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

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { toast } = useToast()
  const { data: employee, isLoading, isError, refetch } = useUserById(id as string);

  // Check if current user can edit this profile
  const canEdit = currentUser && (
    currentUser.role === UserRole.Admin ||
    currentUser.id === id
  );

  const {
    totalShifts,
    completedShifts,
    upcomingShifts,
    completionRate,
    totalHours,
    recentActivity,
  } = useMemo(() => {
    if (!employee || !employee.assignments) {
      return {
        totalShifts: 0,
        completedShifts: 0,
        upcomingShifts: 0,
        completionRate: 0,
        totalHours: 0,
        recentActivity: [],
      };
    }

    const now = new Date();
    let totalShifts = 0;
    let completedShifts = 0;
    let upcomingShifts = 0;
    let totalHours = 0;
    const recentActivity: any[] = [];

    employee.assignments.forEach((assignment: any) => {
      const shift = assignment.shift;
      if (!shift) return;

      totalShifts++;

      const shiftDate = new Date(shift.date);
      const shiftStartTime = new Date(shift.startTime);
      const shiftEndTime = new Date(shift.endTime);

      if (shift.status === ShiftStatus.Completed) {
        completedShifts++;
      } else if (isFuture(shiftStartTime)) {
        upcomingShifts++;
      }

      // Calculate total hours from time entries
      assignment.timeEntries.forEach((entry: any) => {
        if (entry.clockIn && entry.clockOut) {
          const clockInTime = new Date(entry.clockIn);
          const clockOutTime = new Date(entry.clockOut);
          if (!isNaN(clockInTime.getTime()) && !isNaN(clockOutTime.getTime())) {
            totalHours += differenceInHours(clockOutTime, clockInTime);
          }
        }
      });

      // Add to recent activity if within last 30 days or upcoming
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      if (shiftDate >= thirtyDaysAgo || isFuture(shiftDate)) {
        recentActivity.push({
          type: 'shift',
          date: shiftDate,
          shift,
          assignment,
        });
      }
    });

    const completionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;

    // Sort recent activity by date, most recent first
    recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      totalShifts,
      completedShifts,
      upcomingShifts,
      completionRate,
      totalHours,
      recentActivity: recentActivity.slice(0, 5), // Limit to 5 recent activities
    };
  }, [employee]);


  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !employee) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!employee ? 'Employee not found' : 'Error loading employee data'}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { refetch(); }}
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

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'destructive';
      case 'CrewChief': return 'default';
      case 'Employee': return 'secondary';
      case 'CompanyUser': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/employees')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </Button>
        </div>
        {canEdit && (
          <Button
            onClick={() => router.push(`/admin/employees/${id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Employee Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  {employee.avatarData ? (
                    <img 
                      src={employee.avatarData} 
                      alt={employee.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <AvatarFallback>{employee.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{employee.name}</CardTitle>
                  <CardDescription className="text-base">
                    {employee.email}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getRoleBadgeVariant(employee.role)}>
                      {employee.role}
                    </Badge>
                    {/* Add more badges here if relevant, e.g., active status */}
                  </div>
                </div>
              </div>
            </CardHeader>
            {/* Add description or other relevant info here if available */}
          </Card>

          {/* Contact Information (adapted for employee) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{employee.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{employee.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{employee.location || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Crown className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Crew Chief Eligible</p>
                    <Badge variant={employee.crew_chief_eligible ? 'default' : 'secondary'} className={employee.crew_chief_eligible ? 'status-info' : ''}>
                      <Crown className="h-3 w-3 mr-1" />
                      {employee.crew_chief_eligible ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Fork Operator Eligible</p>
                    <Badge variant={employee.fork_operator_eligible ? 'default' : 'secondary'} className={employee.fork_operator_eligible ? 'status-success' : ''}>
                      <Truck className="h-3 w-3 mr-1" />
                      {employee.fork_operator_eligible ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HardHat className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">OSHA 10 Certified</p>
                    <Badge variant={employee.OSHA_10_Certifications ? 'default' : 'secondary'} className={employee.OSHA_10_Certifications ? 'status-warning' : ''}>
                      <HardHat className="h-3 w-3 mr-1" />
                      {employee.OSHA_10_Certifications ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity ({recentActivity.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.shift.job?.name || 'Unknown Job'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(activity.shift.date), 'MMM d, yyyy')} - {format(new Date(activity.shift.startTime), 'h:mm a')} to {format(new Date(activity.shift.endTime), 'h:mm a')}
                        </p>
                      </div>
                      <Badge variant={getShiftStatusBadgeVariant(activity.shift.status)}>
                        {activity.shift.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
                  <p className="text-muted-foreground text-center">This employee has no recent activity to display.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Shifts</span>
                  <Badge variant="outline">{totalShifts}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed Shifts</span>
                  <Badge variant="secondary">{completedShifts}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Hours</span>
                  <Badge variant="secondary">{totalHours.toFixed(2)}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Completion Rate</span>
                    <span className="font-medium">{completionRate.toFixed(2)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Completed Shifts</p>
                    <p className="text-xs text-muted-foreground">{completedShifts}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Upcoming Shifts</p>
                    <p className="text-xs text-muted-foreground">{upcomingShifts}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
