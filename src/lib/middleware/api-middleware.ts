import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { handleDatabaseError, createErrorResponse } from '@/lib/api-error-handler';
import { z } from 'zod';

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// Request context interface
export interface RequestContext {
  user?: any;
  requestId: string;
  startTime: number;
  method: string;
  url: string;
}

// Middleware options
export interface MiddlewareOptions {
  requireAuth?: boolean;
  requiredRole?: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
    key?: (req: NextRequest) => string;
  };
}

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Request ID generator
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Rate limiting middleware
function checkRateLimit(req: NextRequest, options: MiddlewareOptions['rateLimit']): boolean {
  if (!options) return true;

  const clientId = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = options.windowMs;
  
  const current = rateLimitStore.get(clientId);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (current.count >= options.requests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Authentication middleware
async function checkAuth(req: NextRequest, requiredRoles?: string[]): Promise<any> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = session.user.role;
    if (!requiredRoles.includes(userRole)) {
      throw new Error(`Insufficient permissions. Required: ${requiredRoles.join(', ')}`);
    }
  }
  
  return session.user;
}

// Validation middleware
function validateRequest(req: NextRequest, body: any, validation: MiddlewareOptions['validation']) {
  const errors: string[] = [];
  
  if (validation?.body && body) {
    const result = validation.body.safeParse(body);
    if (!result.success) {
      errors.push(`Body validation: ${result.error.message}`);
    }
  }
  
  if (validation?.query) {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const result = validation.query.safeParse(query);
    if (!result.success) {
      errors.push(`Query validation: ${result.error.message}`);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
}

// Success response helper
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ApiResponse<T>['meta']>
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0',
      ...meta,
    },
  };
  
  return NextResponse.json(response);
}

// Error response helper
export function createApiErrorResponse(
  message: string,
  code?: string,
  statusCode: number = 400,
  details?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0',
    },
  };
  
  return NextResponse.json(response, { status: statusCode });
}

// Main API middleware wrapper
export function withApiMiddleware(
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    try {
      // Rate limiting
      if (options.rateLimit && !checkRateLimit(req, options.rateLimit)) {
        return createApiErrorResponse(
          'Rate limit exceeded',
          'RATE_LIMIT_EXCEEDED',
          429
        );
      }
      
      // Parse request body if present
      let body: any = null;
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        try {
          const contentType = req.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            body = await req.json();
          }
        } catch (error) {
          return createApiErrorResponse(
            'Invalid JSON in request body',
            'INVALID_JSON',
            400
          );
        }
      }
      
      // Validation
      if (options.validation) {
        validateRequest(req, body, options.validation);
      }
      
      // Authentication
      let user: any = null;
      if (options.requireAuth) {
        user = await checkAuth(req, options.requiredRole);
      }
      
      // Create request context
      const context: RequestContext = {
        user,
        requestId,
        startTime,
        method: req.method,
        url: req.url,
      };
      
      // Execute handler
      const response = await handler(req, context);
      
      // Add performance headers
      const duration = Date.now() - startTime;
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', `${duration}ms`);
      
      return response;
      
    } catch (error: any) {
      console.error('API Middleware Error:', error);
      
      // Handle specific error types
      if (error.message === 'Authentication required') {
        return createApiErrorResponse(
          'Authentication required',
          'AUTH_REQUIRED',
          401
        );
      }
      
      if (error.message.startsWith('Insufficient permissions')) {
        return createApiErrorResponse(
          error.message,
          'INSUFFICIENT_PERMISSIONS',
          403
        );
      }
      
      if (error.message.startsWith('Validation failed')) {
        return createApiErrorResponse(
          error.message,
          'VALIDATION_ERROR',
          400
        );
      }
      
      // Handle database errors
      const dbError = handleDatabaseError(error);
      return createErrorResponse(dbError);
    }
  };
}

// Specific middleware for common patterns
export const withAuth = (requiredRoles?: string[]) => (
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
) => withApiMiddleware(handler, { requireAuth: true, requiredRole: requiredRoles });

export const withValidation = (validation: MiddlewareOptions['validation']) => (
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
) => withApiMiddleware(handler, { validation });

export const withRateLimit = (requests: number, windowMs: number) => (
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>
) => withApiMiddleware(handler, { rateLimit: { requests, windowMs } });

// Pagination helper
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): ApiResponse['meta']['pagination'] {
  const pages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

// Query parameter parser with validation
export function parseQueryParams<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): T {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  
  // Convert string numbers to actual numbers
  const processedParams = Object.entries(params).reduce((acc, [key, value]) => {
    // Try to parse as number if it looks like a number
    if (/^\d+$/.test(value)) {
      acc[key] = parseInt(value, 10);
    } else if (/^\d*\.\d+$/.test(value)) {
      acc[key] = parseFloat(value);
    } else if (value === 'true' || value === 'false') {
      acc[key] = value === 'true';
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
  
  const result = schema.safeParse(processedParams);
  if (!result.success) {
    throw new Error(`Query parameter validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes