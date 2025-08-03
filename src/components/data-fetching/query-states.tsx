'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertCircle, Wifi, WifiOff } from "lucide-react";

// Loading States
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

interface LoadingSkeletonProps {
  type?: 'list' | 'card' | 'table' | 'form';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ type = 'list', count = 3, className }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'card':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        );
      
      case 'table':
        return (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        );
      
      case 'form':
        return (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        );
      
      default:
        return <Skeleton className="h-20 w-full" />;
    }
  };

  return <div className={className}>{renderSkeleton()}</div>;
}

interface LoadingStateProps {
  message?: string;
  type?: 'spinner' | 'skeleton';
  skeletonType?: 'list' | 'card' | 'table' | 'form';
  skeletonCount?: number;
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  type = 'spinner',
  skeletonType = 'list',
  skeletonCount = 3,
  className 
}: LoadingStateProps) {
  if (type === 'skeleton') {
    return <LoadingSkeleton type={skeletonType} count={skeletonCount} className={className} />;
  }

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="flex items-center space-x-2">
        <LoadingSpinner />
        <span className="text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

// Error States
interface ErrorStateProps {
  error: string | Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
  className?: string;
}

/**
 * Displays an error state with an optional retry button.
 *
 * @param {ErrorStateProps} props - The properties for the error state component.
 * @param {string | Error} props.error - The error message or error object to display.
 * @param {() => void} [props.onRetry] - Optional callback function to retry the action that caused the error.
 * @param {string} [props.title='Something went wrong'] - Optional title for the error state.
 * @param {string} [props.description] - Optional description for the error state. Defaults to the error message.
 * @param {boolean} [props.showRetry=true] - Whether to show the retry button.
 * @param {string} [props.className] - Optional additional class names for styling.
 */
export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  description,
  showRetry = true,
  className
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const displayDescription = description || errorMessage;

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">{title}</CardTitle>
          {displayDescription && (
            <CardDescription className="text-red-700">
              {displayDescription}
            </CardDescription>
          )}
        </CardHeader>
        {showRetry && onRetry && (
          <CardContent className="text-center">
            <Button onClick={onRetry} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Empty States
interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title = 'No data found',
  description = 'There are no items to display.',
  action,
  icon,
  className 
}: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        {icon && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            {icon}
          </div>
        )}
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-4 text-sm text-gray-500">{description}</p>
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Network Status
interface NetworkStatusProps {
  isOnline?: boolean;
  className?: string;
}

export function NetworkStatus({ isOnline = true, className }: NetworkStatusProps) {
  if (isOnline) return null;

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <WifiOff className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">You're offline</AlertTitle>
      <AlertDescription className="text-orange-700">
        Some features may not be available while you're offline.
      </AlertDescription>
    </Alert>
  );
}

// Query State Wrapper
interface QueryStateWrapperProps {
  loading: boolean;
  error: string | Error | null;
  data: any;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onRetry?: () => void;
  showNetworkStatus?: boolean;
  className?: string;
}

export function QueryStateWrapper({
  loading,
  error,
  data,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry,
  showNetworkStatus = true,
  className,
}: QueryStateWrapperProps) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return loadingComponent || <LoadingState className={className} />;
  }

  if (error) {
    return errorComponent || (
      <ErrorState 
        error={error} 
        onRetry={onRetry} 
        className={className}
      />
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return emptyComponent || <EmptyState className={className} />;
  }

  return (
    <div className={className}>
      {showNetworkStatus && <NetworkStatus isOnline={isOnline} />}
      {children}
    </div>
  );
}

// Stale data indicator
interface StaleDataIndicatorProps {
  isStale: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function StaleDataIndicator({ isStale, onRefresh, className }: StaleDataIndicatorProps) {
  if (!isStale) return null;

  return (
    <Alert className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Data may be outdated</AlertTitle>
      <AlertDescription className="text-yellow-700">
        This information might not be current.
        {onRefresh && (
          <Button 
            variant="link" 
            size="sm" 
            onClick={onRefresh}
            className="ml-2 h-auto p-0 text-yellow-700 underline"
          >
            Refresh now
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
