"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Clock, Users, Building2, FileText } from 'lucide-react';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export const Skeleton = ({ className, animate = true }: SkeletonProps) => (
  <div
    className={cn(
      "bg-muted rounded-md",
      animate && "animate-pulse",
      className
    )}
  />
);

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
};

interface ProgressiveLoadingProps {
  isLoading: boolean;
  hasError?: boolean;
  isEmpty?: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  loadingText?: string;
}

export const ProgressiveLoading = ({
  isLoading,
  hasError,
  isEmpty,
  children,
  skeleton,
  emptyState,
  errorState,
  loadingText
}: ProgressiveLoadingProps) => {
  if (hasError && errorState) {
    return <>{errorState}</>;
  }

  if (isLoading) {
    return skeleton || <LoadingSpinner text={loadingText} />;
  }

  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
};

// Skeleton components for specific UI elements
export const ShiftCardSkeleton = () => (
  <div className="bg-card border rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-20" />
    </div>
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

export const JobCardSkeleton = () => (
  <div className="bg-card border rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-4 w-20" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  </div>
);

export const TimesheetRowSkeleton = () => (
  <tr className="border-b">
    <td className="p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </td>
    <td className="p-4">
      <div>
        <Skeleton className="h-4 w-32 mb-1" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </td>
    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
    <td className="p-4">
      <div className="flex items-center gap-1">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-8" />
      </div>
    </td>
    <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
    <td className="p-4">
      <div className="flex gap-1 justify-end">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </td>
  </tr>
);

export const DashboardStatsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    ))}
  </div>
);

interface SmartLoadingProps {
  type: 'shifts' | 'jobs' | 'timesheets' | 'dashboard' | 'table';
  count?: number;
  className?: string;
}

export const SmartLoading = ({ type, count = 3, className }: SmartLoadingProps) => {
  const skeletons = {
    shifts: () => Array.from({ length: count }).map((_, i) => (
      <ShiftCardSkeleton key={i} />
    )),
    jobs: () => Array.from({ length: count }).map((_, i) => (
      <JobCardSkeleton key={i} />
    )),
    timesheets: () => Array.from({ length: count }).map((_, i) => (
      <TimesheetRowSkeleton key={i} />
    )),
    dashboard: () => <DashboardStatsSkeleton />,
    table: () => Array.from({ length: count }).map((_, i) => (
      <TimesheetRowSkeleton key={i} />
    ))
  };

  return (
    <div className={cn("space-y-4", className)}>
      {skeletons[type]()}
    </div>
  );
};

// Loading overlay for full-page loading
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  onCancel?: () => void;
}

export const LoadingOverlay = ({ 
  isVisible, 
  message = "Loading...", 
  progress,
  onCancel 
}: LoadingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border rounded-lg p-6 shadow-lg max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="text-center space-y-2">
            <p className="font-medium">{message}</p>
            {progress !== undefined && (
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Staggered loading animation for lists
interface StaggeredLoadingProps {
  children: React.ReactNode[];
  delay?: number;
  className?: string;
}

export const StaggeredLoading = ({ 
  children, 
  delay = 100,
  className 
}: StaggeredLoadingProps) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * delay}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Loading state for specific content types
export const ContentLoading = {
  Shifts: () => <SmartLoading type="shifts" count={6} />,
  Jobs: () => <SmartLoading type="jobs" count={6} />,
  Timesheets: () => <SmartLoading type="timesheets" count={8} />,
  Dashboard: () => <SmartLoading type="dashboard" />,
  Table: (rows = 5) => <SmartLoading type="table" count={rows} />
};