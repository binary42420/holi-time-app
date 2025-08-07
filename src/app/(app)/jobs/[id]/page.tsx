"use client";

import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { useJobs, useShifts } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Users,
  Clock,
  MapPin,
  Plus,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Activity,
  UserCheck,
  UserX,
  BarChart3,
  FileText,
} from "lucide-react";
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager";
import { DangerZone } from "@/components/danger-zone";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftStatus } from "@prisma/client";
import {
  getAssignedWorkerCount,
  getTotalRequiredWorkers,
} from "@/lib/worker-count-utils";

// Helper function to get shift display name (prioritize description, fallback to job name)
const getShiftDisplayName = (shift: any, fallbackJobName?: string) => {
  if (shift.description && shift.description.trim()) {
    return shift.description.trim();
  }
  return shift.job?.name || fallbackJobName || "Unnamed Shift";
};

// Helper functions for status indicators (copied from companies/[id]/page.tsx for consistency)
const getShiftStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "bg-green-500";
    case "in_progress":
      return "bg-blue-500";
    case "scheduled":
      return "bg-yellow-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getShiftStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "default";
    case "in_progress":
      return "secondary";
    case "scheduled":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

const getAssignmentStatusColor = (
  assignedCount: number,
  requiredCount: number
) => {
  const percentage =
    requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 0;
  if (percentage >= 100) return "text-green-600";
  if (percentage >= 75) return "text-yellow-600";
  if (percentage >= 50) return "text-orange-600";
  return "text-red-600";
};

const getAssignmentStatusIcon = (
  assignedCount: number,
  requiredCount: number
) => {
  const percentage =
    requiredCount > 0 ? (assignedCount / requiredCount) * 100 : 0;
  if (percentage >= 100)
    return <UserCheck className="h-4 w-4 text-green-600" />;
  if (percentage >= 50) return <Users className="h-4 w-4 text-yellow-600" />;
  return <UserX className="h-4 w-4 text-red-600" />;
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { user } = useUser();
  const router = useRouter();
  const canEdit = user?.role === "Admin";

  const {
    data: jobs,
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
  } = useJobs({});
  const {
    data: shifts,
    isLoading: shiftsLoading,
    isError: shiftsError,
    refetch: refetchShifts,
  } = useShifts({ jobId });

  const job = jobs?.find((j) => j.id === jobId);

  const isLoading = jobsLoading || shiftsLoading;
  const hasError = jobsError || shiftsError;

  // Process data for enhanced display
  const recentShifts = shifts?.slice(0, 20) || [];
  const upcomingShifts =
    shifts
      ?.filter((shift: any) => new Date(shift.date) >= new Date())
      .slice(0, 10) || [];
  const completedShifts =
    shifts?.filter((shift: any) => shift.status === "Completed") || [];

  // Calculate statistics
  const totalShifts = shifts?.length || 0;
  const completedShiftsCount = completedShifts.length;
  const completionRate =
    totalShifts > 0 ? (completedShiftsCount / totalShifts) * 100 : 0;

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
    );
  }

  if (hasError || !job) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!job ? "Job not found" : "Error loading job data"}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchJobs();
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
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/jobs")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/jobs/${jobId}/report`)}
            className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 text-green-700 dark:text-green-300"
          >
            <FileText className="h-4 w-4" />
            Job Report
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              console.log(
                "Timeline button clicked, navigating to:",
                `/jobs/${jobId}/scheduling-timeline`
              );
              router.push(`/jobs/${jobId}/scheduling-timeline`);
            }}
            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
            style={{ minWidth: "180px" }}
          >
            <BarChart3 className="h-4 w-4" />
            Timeline Manager
          </Button>
          {canEdit && (
            <Button
              onClick={() => router.push(`/jobs/${jobId}/edit`)}
              className="flex items-center gap-2"
            >
              Edit Job
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Job Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Briefcase className="h-16 w-16 text-muted-foreground" />
                <div className="flex-1">
                  <CardTitle className="text-2xl">{job.name}</CardTitle>
                  <CardDescription className="text-base">
                    {job.company?.name
                      ? `for ${job.company.name}`
                      : "No company assigned"}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={
                        job.status === "Active" ? "default" : "secondary"
                      }
                    >
                      {job.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <TrendingUp className="h-3 w-3" />
                      {completionRate.toFixed(0)}% shift completion
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            {job.description && (
              <CardContent>
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{job.description}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {job.location || "No location specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-muted-foreground">
                      {job.startDate
                        ? format(new Date(job.startDate), "PPP")
                        : "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-sm text-muted-foreground">
                      {job.endDate
                        ? format(new Date(job.endDate), "PPP")
                        : "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Shifts</p>
                    <p className="text-sm text-muted-foreground">
                      {totalShifts} shifts
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shifts Overview */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Shifts ({totalShifts})</TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingShifts.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedShiftsCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    All Shifts
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/jobs/${jobId}/shifts/new`)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Shift
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentShifts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Workers</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentShifts.map((shift: any) => {
                            const assigned = getAssignedWorkerCount(shift);
                            const required = getTotalRequiredWorkers(shift);
                            return (
                              <TableRow key={shift.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {format(new Date(shift.date), "PPP")}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(
                                        new Date(shift.startTime),
                                        "p"
                                      )} -{" "}
                                      {format(new Date(shift.endTime), "p")}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getShiftDisplayName(shift, job.name)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={getShiftStatusBadgeVariant(
                                      shift.status
                                    )}
                                  >
                                    {shift.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getAssignmentStatusIcon(
                                      assigned,
                                      required
                                    )}
                                    <span
                                      className={getAssignmentStatusColor(
                                        assigned,
                                        required
                                      )}
                                    >
                                      {assigned}/{required}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-8 px-2"
                                  >
                                    <Link href={`/jobs-shifts/${shift.id}`}>
                                      View
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No shifts found
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        This job doesn't have any shifts yet.
                      </p>
                      <Button
                        onClick={() => router.push(`/jobs/${jobId}/shifts/new`)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add First Shift
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Upcoming Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingShifts.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingShifts.map((shift: any) => {
                        const assigned = getAssignedWorkerCount(shift);
                        const required = getTotalRequiredWorkers(shift);
                        return (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-medium">
                                  {format(new Date(shift.date), "PPP")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(shift.startTime), "p")} -{" "}
                                  {format(new Date(shift.endTime), "p")}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {getShiftDisplayName(shift, job.name)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {getAssignmentStatusIcon(assigned, required)}
                                  <span
                                    className={`text-sm ${getAssignmentStatusColor(
                                      assigned,
                                      required
                                    )}`}
                                  >
                                    {assigned}/{required} workers assigned
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="flex items-center gap-2"
                            >
                              <Link href={`/jobs-shifts/${shift.id}`}>
                                View Details
                              </Link>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No upcoming shifts
                      </h3>
                      <p className="text-muted-foreground">
                        All shifts for this job are in the past or completed.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Completed Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {completedShifts.length > 0 ? (
                    <div className="space-y-4">
                      {completedShifts.slice(0, 10).map((shift: any) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-green-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div>
                              <p className="font-medium">
                                {format(new Date(shift.date), "PPP")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getShiftDisplayName(shift, job.name)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="default">Completed</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No completed shifts
                      </h3>
                      <p className="text-muted-foreground">
                        Shifts will appear here once they are completed.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Company-specific actions */}
          {job.company && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CrewChiefPermissionManager
                targetId={job.id}
                targetType="job"
                targetName={job.name}
              />
              <DangerZone 
                entityType="job"
                entityId={job.id}
                entityName={job.name}
                redirectTo="/jobs"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Shifts</span>
                  <span className="text-sm font-bold">{totalShifts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-sm font-bold text-green-600">
                    {completedShiftsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Upcoming</span>
                  <span className="text-sm font-bold text-blue-600">
                    {upcomingShifts.length}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm font-bold">
                      {completionRate.toFixed(0)}%
                    </span>
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
                    <p className="text-xs text-muted-foreground">
                      {completedShiftsCount} shifts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Upcoming Shifts</p>
                    <p className="text-xs text-muted-foreground">
                      {upcomingShifts.length} scheduled
                    </p>
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
