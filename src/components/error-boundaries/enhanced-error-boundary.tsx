'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Report to error tracking service
    this.reportError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send error to logging service
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId: this.state.errorId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          level: this.props.level || 'component',
        }),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorSeverity = (): 'low' | 'medium' | 'high' => {
    const { error, errorInfo } = this.state;
    const { level } = this.props;
    
    if (level === 'critical') return 'high';
    if (level === 'page') return 'medium';
    
    // Analyze error to determine severity
    if (error?.message.includes('ChunkLoadError') || 
        error?.message.includes('Loading chunk')) {
      return 'low'; // Network/loading issues
    }
    
    if (error?.stack?.includes('TypeError') || 
        error?.stack?.includes('ReferenceError')) {
      return 'high'; // Code errors
    }
    
    return 'medium';
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const { showDetails } = this.props;
    
    if (!showDetails || process.env.NODE_ENV !== 'development') {
      return null;
    }
    
    return (
      <details className="mt-4 p-4 bg-gray-50 rounded-lg">
        <summary className="cursor-pointer font-medium text-gray-700 mb-2">
          Technical Details (Development Only)
        </summary>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Error ID:</strong> {errorId}
          </div>
          <div>
            <strong>Error:</strong>
            <pre className="mt-1 p-2 bg-red-50 rounded text-red-800 overflow-auto">
              {error?.toString()}
            </pre>
          </div>
          <div>
            <strong>Stack Trace:</strong>
            <pre className="mt-1 p-2 bg-red-50 rounded text-red-800 overflow-auto text-xs">
              {error?.stack}
            </pre>
          </div>
          <div>
            <strong>Component Stack:</strong>
            <pre className="mt-1 p-2 bg-red-50 rounded text-red-800 overflow-auto text-xs">
              {errorInfo?.componentStack}
            </pre>
          </div>
        </div>
      </details>
    );
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'component' } = this.props;
    
    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }
      
      const severity = this.getErrorSeverity();
      const canRetry = this.retryCount < this.maxRetries;
      
      // Different UI based on error level
      if (level === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-red-800">Critical Error</CardTitle>
                <CardDescription>
                  A critical error has occurred. The application needs to be restarted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 text-center">
                  Error ID: {this.state.errorId}
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={this.handleReload} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Restart Application
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Home
                  </Button>
                </div>
                {this.renderErrorDetails()}
              </CardContent>
            </Card>
          </div>
        );
      }
      
      if (level === 'page') {
        return (
          <div className="min-h-[400px] flex items-center justify-center">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <Bug className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-orange-800">Page Error</CardTitle>
                <CardDescription>
                  Something went wrong while loading this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 text-center">
                  {error?.message || 'An unexpected error occurred'}
                </div>
                <div className="flex flex-col gap-2">
                  {canRetry && (
                    <Button onClick={this.handleRetry} className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again ({this.maxRetries - this.retryCount} attempts left)
                    </Button>
                  )}
                  <Button variant="outline" onClick={this.handleReload} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Home
                  </Button>
                </div>
                {this.renderErrorDetails()}
              </CardContent>
            </Card>
          </div>
        );
      }
      
      // Component level error
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 mb-1">
                Component Error
              </h3>
              <p className="text-sm text-red-700 mb-3">
                {error?.message || 'This component encountered an error and could not render.'}
              </p>
              <div className="flex gap-2">
                {canRetry && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={this.handleRetry}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={this.handleReload}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reload
                </Button>
              </div>
              {this.renderErrorDetails()}
            </div>
          </div>
        </div>
      );
    }
    
    return children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Specific error boundaries for different use cases
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary level="page" showDetails={true}>
    {children}
  </EnhancedErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary level="component">
    {children}
  </EnhancedErrorBoundary>
);

export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary level="critical" showDetails={true}>
    {children}
  </EnhancedErrorBoundary>
);