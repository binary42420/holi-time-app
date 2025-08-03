'use client';

import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { emergencyCookieCleanup } from '@/lib/cookie-cleanup';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isHydrationError: boolean;
}

class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      isHydrationError: false 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a hydration error
    const isHydrationError = 
      error.message.includes('Hydration') ||
      error.message.includes('hydration') ||
      error.message.includes('server HTML') ||
      error.message.includes('client-side') ||
      error.message.includes('Text content does not match');

    return {
      hasError: true,
      error,
      isHydrationError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('HydrationErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // If it's a hydration error, try auto-cleanup
    if (this.state.isHydrationError) {
      console.warn('Hydration error detected, attempting cookie cleanup...');
      setTimeout(() => {
        emergencyCookieCleanup();
      }, 1000);
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleCleanupAndRefresh = () => {
    emergencyCookieCleanup();
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {this.state.isHydrationError ? 'Hydration Error' : 'Application Error'}
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  {this.state.isHydrationError 
                    ? 'The page content doesn\'t match between server and client. This might be due to large cookies or cached data.'
                    : 'Something went wrong while loading the application.'
                  }
                </p>
                
                {this.state.isHydrationError && (
                  <div className="text-sm text-muted-foreground">
                    <p>Common causes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Large cookies causing 431 errors</li>
                      <li>Cached data mismatch</li>
                      <li>Date/time differences</li>
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button onClick={this.handleRefresh} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                  
                  {this.state.isHydrationError && (
                    <Button 
                      onClick={this.handleCleanupAndRefresh} 
                      variant="outline" 
                      className="w-full"
                    >
                      Clear Data & Refresh
                    </Button>
                  )}
                  
                  <Button 
                    onClick={this.handleReset} 
                    variant="ghost" 
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HydrationErrorBoundary;
