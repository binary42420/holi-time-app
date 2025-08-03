import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a hooks error
    if (error.message.includes('hooks') || error.message.includes('render')) {
      console.error('🚨 React Hooks Error Detected:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} errorInfo={this.state.errorInfo} />;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <details className="text-sm text-red-700">
            <summary className="cursor-pointer mb-2">Error Details</summary>
            <div className="bg-red-100 p-3 rounded border">
              <p><strong>Error:</strong> {this.state.error?.message}</p>
              {process.env.NODE_ENV === 'development' && (
                <>
                  <p className="mt-2"><strong>Stack:</strong></p>
                  <pre className="text-xs overflow-auto bg-white p-2 rounded border mt-1">
                    {this.state.error?.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <p className="mt-2"><strong>Component Stack:</strong></p>
                      <pre className="text-xs overflow-auto bg-white p-2 rounded border mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </>
              )}
            </div>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    if (error.message.includes('hooks') || error.message.includes('render')) {
      console.error('🚨 React Hooks Error in functional component:', {
        error: error.message,
        stack: error.stack
      });
    }
  };
}
