import { useCallback } from 'react'
import { toast } from "@/hooks/use-toast"

// Type Definitions
export interface ErrorContext {
  [key: string]: any
}

export interface AppError extends Error {
  code: string
  statusCode: number
  retryable: boolean
  context?: ErrorContext
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number  
  maxDelay: number
  backoffFactor: number
  retryableErrors: string[]
}

// Error Classes
export class NetworkError extends Error implements AppError {
  code = 'NETWORK_ERROR'
  statusCode = 0
  retryable = true
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR'
  statusCode = 400
  retryable = false
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'AUTH_ERROR'
  statusCode = 401
  retryable = false
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class ConflictError extends Error implements AppError {
  code = 'CONFLICT_ERROR'
  statusCode = 409
  retryable = false
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ServerError extends Error implements AppError {
  code = 'SERVER_ERROR'
  statusCode = 500
  retryable = true
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = 'ServerError'
  }
}

export function handleHttpError(
  statusCode: number, 
  error: {message?: string}, 
  context?: ErrorContext
): AppError {
  if (statusCode >= 400 && statusCode < 500) {
    return new ValidationError(error.message || 'Client error occurred.', context)
  }
  return new ServerError(error.message || 'Server error occurred.', context)
}

export function classifyError(error: any, context?: ErrorContext): AppError {
  if (error instanceof NetworkError || 
      error instanceof ValidationError || 
      error instanceof AuthenticationError || 
      error instanceof ConflictError || 
      error instanceof ServerError) {
    return error
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('Network connection failed. Please check your internet connection.', context)
  }

  if (error.name === 'AbortError') {
    return new NetworkError('Request was cancelled or timed out.', context)
  }

  if (error.status || error.statusCode) {
    const statusCode = error.status || error.statusCode
    return handleHttpError(statusCode, error, context)
  }
  
  return new ServerError(error.message || 'An unexpected error occurred.', context)
}

// User-friendly message mapping
export function getUserFriendlyMessage(error: AppError): string {
  // If the error message is already user-friendly, use it
  if (error.message && !error.message.includes('prisma') && !error.message.includes('database')) {
    return error.message;
  }

  // Map error codes to user-friendly messages
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Network connection failed. Please check your internet connection and try again.';
    
    case 'AUTH_ERROR':
      return 'Authentication failed. Please log in again.';
    
    case 'VALIDATION_ERROR':
      return error.message || 'Invalid input. Please check your data and try again.';
    
    case 'CONFLICT_ERROR':
      return error.message || 'This action conflicts with existing data. Please refresh and try again.';
    
    case 'SERVER_ERROR':
      // Check for specific server error patterns
      if (error.message?.includes('Foreign key constraint')) {
        return 'Cannot delete this item because it is being used elsewhere. Please remove related items first.';
      }
      if (error.message?.includes('Unique constraint')) {
        return 'This item already exists. Please use a different name or identifier.';
      }
      return error.message || 'A server error occurred. Please try again later.';
    
    default:
      return error.message || 'Failed to perform action. Please try again.';
  }
}

// Logging function
export function logError(error: AppError): void {
  console.error('Application Error:', {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    retryable: error.retryable,
    context: error.context,
    stack: error.stack
  });
}

// Retry Utilities
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 2000,
  backoffFactor: 1.5,
  retryableErrors: ['NETWORK_ERROR', 'SERVER_ERROR']
}

export function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
    config.maxDelay
  )
  const jitter = delay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, delay + jitter)
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: AppError
  
  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = classifyError(error, context)
      
      if (!lastError.retryable || !retryConfig.retryableErrors.includes(lastError.code || '')) {
        throw lastError
      }
      
      if (attempt === retryConfig.maxAttempts) {
        throw lastError
      }
      
      const delay = calculateDelay(attempt, retryConfig)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

// Client-specific Error Handling
export function handleError(error: AppError, context?: ErrorContext) {
  console.error("Caught error:", {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    context: { ...error.context, ...context },
    stack: error.stack
  })

  if (typeof window !== 'undefined') {
    toast({
      title: error.name || 'Error',
      description: error.message,
      variant: 'destructive',
    })
  }
}
export function useErrorHandler(defaultContext?: ErrorContext) {
  const executeWithRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: ErrorContext,
      config?: Partial<RetryConfig>
    ): Promise<T> => {
      try {
        // Now calls the top-level withRetry function, not itself
        return await withRetry(operation, { ...defaultContext, ...context }, config);
      } catch (error) {
        handleError(error as AppError, { ...defaultContext, ...context });
        throw error;
      }
    },
    [defaultContext]
  );

  return { withRetry: executeWithRetry };
}
