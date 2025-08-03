import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/middleware';
import { hasPermission, AuthenticatedUser } from '@/lib/authorization';

export interface ValidationError {
  error: string;
  issues: Record<string, string[]>;
}

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: ValidationError;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validates request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    return {
      success: false,
      error: {
        error: 'Invalid request body',
        issues: result.error.flatten().fieldErrors,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        error: 'Invalid JSON in request body',
        issues: {},
      },
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: {
      error: 'Invalid query parameters',
      issues: result.error.flatten().fieldErrors,
    },
  };
}

/**
 * Validates path parameters against a Zod schema
 */
export function validatePathParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const result = schema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: {
      error: 'Invalid path parameters',
      issues: result.error.flatten().fieldErrors,
    },
  };
}

/**
 * Creates a standardized validation error response
 */
export function createValidationErrorResponse(error: ValidationError): NextResponse {
  return NextResponse.json(error, { status: 400 });
}

/**
 * Higher-order function to wrap API handlers with validation
 */
export function withValidation<TBody = any, TQuery = any, TParams = any>(
  handler: (
    request: NextRequest,
    context: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    }
  ) => Promise<NextResponse>,
  options: {
    bodySchema?: z.ZodSchema<TBody>;
    querySchema?: z.ZodSchema<TQuery>;
    paramsSchema?: z.ZodSchema<TParams>;
  } = {}
) {
  return async (
    request: NextRequest,
    context: { params?: Promise<Record<string, string>> } = {}
  ): Promise<NextResponse> => {
    const validationContext: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    } = {};

    // Validate body if schema provided
    if (options.bodySchema) {
      const bodyValidation = await validateRequestBody(request, options.bodySchema);
      if (!bodyValidation.success) {
        return createValidationErrorResponse(bodyValidation.error);
      }
      validationContext.body = bodyValidation.data;
    }

    // Validate query parameters if schema provided
    if (options.querySchema) {
      const queryValidation = validateQueryParams(request, options.querySchema);
      if (!queryValidation.success) {
        return createValidationErrorResponse(queryValidation.error);
      }
      validationContext.query = queryValidation.data;
    }

    // Validate path parameters if schema provided
    if (options.paramsSchema && context.params) {
      const params = await context.params;
      const paramsValidation = validatePathParams(params, options.paramsSchema);
      if (!paramsValidation.success) {
        return createValidationErrorResponse(paramsValidation.error);
      }
      validationContext.params = paramsValidation.data;
    }

    return handler(request, validationContext);
  };
}

/**
 * Common validation schemas for path parameters
 */
export const pathParamSchemas = {
  id: z.object({
    id: z.string().cuid('Invalid ID format'),
  }),
  
  idWithOptionalFields: z.object({
    id: z.string().cuid('Invalid ID format'),
  }).catchall(z.string()),
};

/**
 * Validation helper for common patterns
 */
export const validationHelpers = {
  /**
   * Validates that a string is a valid CUID
   */
  cuid: (value: string): boolean => {
    return z.string().cuid().safeParse(value).success;
  },

  /**
   * Validates that a string is a valid email
   */
  email: (value: string): boolean => {
    return z.string().email().safeParse(value).success;
  },

  /**
   * Validates that a string is a valid URL
   */
  url: (value: string): boolean => {
    return z.string().url().safeParse(value).success;
  },

  /**
   * Validates that a value is a positive integer
   */
  positiveInt: (value: number): boolean => {
    return z.number().int().min(0).safeParse(value).success;
  },
};

/**
 * Standard error messages
 */
export const validationMessages = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_URL: 'Invalid URL format',
  INVALID_ID: 'Invalid ID format',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
  STRING_TOO_LONG: 'Value is too long',
  INVALID_PHONE: 'Invalid phone number format',
  INVALID_DATE: 'Invalid date format',
  NEGATIVE_NUMBER: 'Value must be non-negative',
};

/**
 * Combined middleware for validation and authorization
 */
export function withValidationAndAuth<TBody = any, TQuery = any, TParams = any>(
  handler: (
    request: NextRequest,
    context: {
      user: AuthenticatedUser;
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    }
  ) => Promise<NextResponse>,
  options: {
    bodySchema?: z.ZodSchema<TBody>;
    querySchema?: z.ZodSchema<TQuery>;
    paramsSchema?: z.ZodSchema<TParams>;
    resource?: string;
    action?: string;
    getResource?: (request: NextRequest, params?: any) => Promise<any>;
    getResourceId?: (request: NextRequest, params?: any) => string;
  } = {}
) {
  return async (
    request: NextRequest,
    context: { params?: Promise<Record<string, string>> } = {}
  ): Promise<NextResponse> => {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const validationContext: {
      user: AuthenticatedUser;
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    } = { user };

    // Validate body if schema provided
    if (options.bodySchema) {
      const bodyValidation = await validateRequestBody(request, options.bodySchema);
      if (!bodyValidation.success) {
        return createValidationErrorResponse(bodyValidation.error);
      }
      validationContext.body = bodyValidation.data;
    }

    // Validate query parameters if schema provided
    if (options.querySchema) {
      const queryValidation = validateQueryParams(request, options.querySchema);
      if (!queryValidation.success) {
        return createValidationErrorResponse(queryValidation.error);
      }
      validationContext.query = queryValidation.data;
    }

    // Validate path parameters if schema provided
    if (options.paramsSchema && context.params) {
      const params = await context.params;
      const paramsValidation = validatePathParams(params, options.paramsSchema);
      if (!paramsValidation.success) {
        return createValidationErrorResponse(paramsValidation.error);
      }
      validationContext.params = paramsValidation.data;
    }

    // Authorization check if resource and action provided
    if (options.resource && options.action) {
      let resourceData = undefined;
      let resourceId = undefined;

      if (options.getResource) {
        resourceData = await options.getResource(request, context.params);
      }

      if (options.getResourceId) {
        resourceId = options.getResourceId(request, context.params);
      }

      const hasAccess = hasPermission(user, options.resource, options.action, {
        resource: resourceData,
        resourceId,
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return handler(request, validationContext);
  };
}
