"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import { logError, type AppError, type ErrorContext } from '@/lib/error-handler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  context?: ErrorContext
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError: AppError = {
      ...error,
      code: 'COMPONENT_ERROR',
      statusCode: 500,
      retryable: false,
      context: {
        ...this.props.context,
        component: 'ErrorBoundary',
        action: 'componentDidCatch',
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true
        }
      }
    }

    logError(appError)
    this.props.onError?.(error, errorInfo)
    this.setState({
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state
    
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: this.props.context
    }

    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share this with support.')
      })
      .catch(() => {
        console.error('Error Report:', errorReport)
        alert('Error details logged to console. Please check browser console and share with support.')
      })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle size={48} className="text-red-500" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>An unexpected error occurred. We apologize for the inconvenience.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>
                  <pre className="text-sm whitespace-pre-wrap break-all">
                    {this.state.error?.message || 'Unknown error occurred'}
                  </pre>
                  {this.state.errorId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Error ID: {this.state.errorId}
                    </p>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Button>
                <Button variant="ghost" onClick={this.handleReportError} className="w-full">
                  <Bug className="mr-2 h-4 w-4" />
                  Report Error
                </Button>
              </div>

              {process.env.ENV === 'development' && this.state.errorInfo && (
                <Accordion type="single" collapsible className="w-full mt-6">
                  <AccordionItem value="dev-details">
                    <AccordionTrigger>Developer Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">Error:</h4>
                          <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-2 rounded-md">
                            {this.state.error?.stack}
                          </pre>
                        </div>
                        <div>
                          <h4 className="font-medium">Component Stack:</h4>
                          <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-2 rounded-md">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    captureError,
    resetError
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export function AsyncErrorBoundary({ children, onError }: { children: ReactNode; onError?: (error: Error) => void }) {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      setError(error)
      onError?.(error)
      event.preventDefault()
    }

    const handleError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : new Error(event.message)
      setError(error)
      onError?.(error)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [onError])

  if (error) {
    throw error
  }

  return <>{children}</>
}
