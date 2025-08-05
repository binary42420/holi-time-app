import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Briefcase,
  Calendar,
  Users,
  MapPin,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle,
  Play,
} from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { CompanyAvatar } from '@/components/CompanyAvatar';
import { UnifiedStatusBadge } from '@/components/ui/unified-status-badge';

interface RecentJobsSectionProps {
  jobs: any[];
  isLoading: boolean;
  error: any;
  onJobClick: (jobId: string) => void;
  className?: string;
}



export function RecentJobsSection({
  jobs,
  isLoading,
  error,
  onJobClick,
  className,
}: RecentJobsSectionProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Recent Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Recent Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load recent jobs. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Recent Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground">No recent jobs</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Jobs with recent activity will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Recent Jobs
          <Badge variant="secondary" className="ml-auto">
            {jobs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onJobClick(job.id)}
          >
            <div className="flex items-center space-x-4 flex-1">
              <CompanyAvatar
                company={job.company}
                size="md"
                className="h-12 w-12"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{job.name}</h4>
                  <UnifiedStatusBadge status={job.status} size="sm" />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {job.stats.totalShifts} shifts
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {job.stats.uniqueWorkers} workers
                  </div>
                  {job.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Last activity: {formatDistanceToNow(new Date(job.lastActivity), { addSuffix: true })}
                  </span>
                  {job.stats.activeShifts > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {job.stats.activeShifts} active
                    </Badge>
                  )}
                  {job.stats.upcomingShifts > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {job.stats.upcomingShifts} upcoming
                    </Badge>
                  )}
                </div>

                {job.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {job.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-medium">
                  {job.stats.completedShifts}/{job.stats.totalShifts}
                </div>
                <div className="text-xs text-muted-foreground">
                  completed
                </div>
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}