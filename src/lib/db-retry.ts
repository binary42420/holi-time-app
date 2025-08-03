import { QueryResult } from 'pg';
import { query as baseQuery } from './db';

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code;
  
  // Network-related errors that should be retried
  const retryableErrors = [
    'network error',
    'connection terminated',
    'connection refused',
    'timeout',
    'econnreset',
    'enotfound',
    'econnrefused',
    'etimedout',
    'socket hang up',
    'network is unreachable',
  ];
  
  // PostgreSQL error codes that should be retried
  const retryableCodes = [
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08004', // sqlserver_rejected_establishment_of_sqlconnection
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
  ];
  
  return retryableErrors.some(err => message.includes(err)) || 
         retryableCodes.includes(code);
}

function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

export async function queryWithRetry(
  text: string,
  params?: any[],
  retryOptions: RetryOptions = {}
): Promise<QueryResult> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: any;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await baseQuery(text, params);
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === options.maxAttempts) {
        break;
      }
      
      const delay = calculateDelay(attempt, options);
      console.warn(`Database query failed (attempt ${attempt}/${options.maxAttempts}), retrying in ${delay}ms:`, {
        error: (error as any).message,
        code: (error as any).code,
        query: text.substring(0, 100) + '...',
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all attempts failed
  console.error(`Database query failed after ${options.maxAttempts} attempts:`, {
    error: (lastError as any).message,
    code: (lastError as any).code,
    query: text.substring(0, 100) + '...',
  });
  
  throw lastError;
}

// Convenience function for critical queries that need more retries
export async function criticalQuery(
  text: string,
  params?: any[]
): Promise<QueryResult> {
  return queryWithRetry(text, params, {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
  });
}

// Convenience function for read-only queries that can be retried aggressively
export async function readQuery(
  text: string,
  params?: any[]
): Promise<QueryResult> {
  return queryWithRetry(text, params, {
    maxAttempts: 4,
    baseDelay: 500,
    maxDelay: 5000,
  });
}

// Health check with retry
export async function healthCheckWithRetry(): Promise<boolean> {
  try {
    await queryWithRetry('SELECT 1', [], { maxAttempts: 2, baseDelay: 1000 });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
