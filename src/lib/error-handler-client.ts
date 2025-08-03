'use client';

import { toast } from "@/hooks/use-toast"
import { 
  classifyError, 
  getUserFriendlyMessage, 
  logError, 
  withRetry,
  type ErrorContext, 
  type AppError,
  type RetryConfig 
} from './error-handler'

// Client-specific error handler with toast
export function handleClientError(error: any, context?: ErrorContext): void {
  const appError = classifyError(error, context)
  
  // Log the error
  logError(appError)
  
  // Show user-friendly message
  const userMessage = getUserFriendlyMessage(appError)
  
  toast({
    title: "Error",
    description: userMessage,
    variant: "destructive",
  })
}

// Client-specific error boundary hook
export function useClientErrorHandler() {
  return {
    handleError: (error: any, context?: ErrorContext) => handleClientError(error, context),
    withRetry: (operation: () => Promise<any>, context?: ErrorContext, config?: Partial<RetryConfig>) => 
      withRetry(operation, context, config),
    classifyError: (error: any, context?: ErrorContext) => classifyError(error, context)
  }
}
