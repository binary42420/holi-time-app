"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { useJobs } from "@/hooks/use-api";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Calendar,
  Users,
  MapPin,
  Plus,
  AlertCircle,
  RefreshCw,
  Search,
  BarChart3,
  Building,
  Filter,
} from "lucide-react";

// Safe date formatting to prevent hydration issues
const safeFormatDate = (date: string | Date) => {
  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch {
    return "Invalid date";
  }
};

export default function JobsListPage() {
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mounted, setMounted] = useState(false);
  
  const {
    data: jobs,
    isLoading,
    isError,
    refetch,
  } = useJobs({});

  const canCreateJob = user?.role === "Admin";

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter jobs based on search and status
  const filteredJobs = jobs?.filter((job: any) => {
    const matchesSearch = searchQuery === "" || 
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Prevent hydration mismatch - wait for client mount
  if (!mounted) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Jobs</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading jobs
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
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">
            Manage and track all job schedules
          </p>
        </div>
        {canCreateJob && (
          <Button
            onClick={() => router.push("/jobs/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              {filteredJobs.length} of {jobs?.length || 0} jobs
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Grid */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job: any) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {job.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Building className="h-3 w-3" />
                      {job.company?.name || "No company assigned"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={job.status === "Active" ? "default" : "secondary"}
                  >
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  {job.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">{job.location}</span>
                    </div>
                  )}
                  {job.startDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{safeFormatDate(job.startDate)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="flex-1"
                  >
                    <Briefcase className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/jobs/${job.id}/scheduling-timeline`)}
                    className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
                    title="Open Timeline Manager"
                  >
                    <BarChart3 className="h-3 w-3" />
                    Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || statusFilter !== "all" ? "No jobs found" : "No jobs yet"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            {searchQuery || statusFilter !== "all" 
              ? "Try adjusting your search criteria or filters."
              : "Get started by creating your first job to track schedules and assignments."
            }
          </p>
          {canCreateJob && !searchQuery && statusFilter === "all" && (
            <Button
              onClick={() => router.push("/jobs/new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Job
            </Button>
          )}
        </div>
      )}

      {/* Table View for Larger Screens */}
      {filteredJobs.length > 0 && (
        <Card className="hidden lg:block">
          <CardHeader>
            <CardTitle>Jobs Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.name}</div>
                          {job.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {job.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.company?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {job.location || "—"}
                      </TableCell>
                      <TableCell>
                        {job.startDate 
                          ? safeFormatDate(job.startDate)
                          : "—"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={job.status === "Active" ? "default" : "secondary"}
                        >
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/jobs/${job.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/jobs/${job.id}/scheduling-timeline`)}
                            className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}