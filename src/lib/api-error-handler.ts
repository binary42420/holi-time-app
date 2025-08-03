import { NextResponse } from 'next/server';
import { PrismaClientInitializationError, PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

export class DatabaseConnectionError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseTimeoutError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseTimeoutError';
  }
}

export function handleDatabaseError(error: any): ApiError {
  console.error('Database error occurred:', error);

  // Handle Prisma-specific errors
  if (error instanceof PrismaClientInitializationError) {
    return {
      message: 'Database connection failed. Please try again later.',
      code: 'DATABASE_CONNECTION_ERROR',
      statusCode: 503,
      details: {
        type: 'PrismaClientInitializationError',
        errorCode: error.errorCode,
        message: error.message,
      }
    };
  }

  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P1001':
        return {
          message: 'Database server is unreachable. Please check your connection.',
          code: 'DATABASE_UNREACHABLE',
          statusCode: 503,
          details: { prismaCode: error.code }
        };
      case 'P1002':
        return {
          message: 'Database connection timeout. Please try again.',
          code: 'DATABASE_TIMEOUT',
          statusCode: 504,
          details: { prismaCode: error.code }
        };
      case 'P1003':
        return {
          message: 'Database does not exist.',
          code: 'DATABASE_NOT_FOUND',
          statusCode: 503,
          details: { prismaCode: error.code }
        };
      case 'P1008':
        return {
          message: 'Database operation timeout.',
          code: 'DATABASE_OPERATION_TIMEOUT',
          statusCode: 504,
          details: { prismaCode: error.code }
        };
      case 'P1009':
        return {
          message: 'Database already exists.',
          code: 'DATABASE_ALREADY_EXISTS',
          statusCode: 409,
          details: { prismaCode: error.code }
        };
      case 'P1010':
        return {
          message: 'Access denied for database user.',
          code: 'DATABASE_ACCESS_DENIED',
          statusCode: 403,
          details: { prismaCode: error.code }
        };
      case 'P1011':
        return {
          message: 'Error opening TLS connection.',
          code: 'DATABASE_TLS_ERROR',
          statusCode: 503,
          details: { prismaCode: error.code }
        };
      case 'P1012':
        return {
          message: 'Database schema validation error.',
          code: 'DATABASE_SCHEMA_ERROR',
          statusCode: 500,
          details: { prismaCode: error.code }
        };
      case 'P1013':
        return {
          message: 'Invalid database string provided.',
          code: 'DATABASE_STRING_INVALID',
          statusCode: 500,
          details: { prismaCode: error.code }
        };
      case 'P1014':
        return {
          message: 'Underlying model does not exist.',
          code: 'DATABASE_MODEL_NOT_FOUND',
          statusCode: 500,
          details: { prismaCode: error.code }
        };
      case 'P1015':
        return {
          message: 'Unsupported database version.',
          code: 'DATABASE_VERSION_UNSUPPORTED',
          statusCode: 503,
          details: { prismaCode: error.code }
        };
      case 'P1016':
        return {
          message: 'Raw query failed.',
          code: 'DATABASE_RAW_QUERY_FAILED',
          statusCode: 500,
          details: { prismaCode: error.code }
        };
      case 'P1017':
        return {
          message: 'Server has closed the connection.',
          code: 'DATABASE_CONNECTION_CLOSED',
          statusCode: 503,
          details: { prismaCode: error.code }
        };
      default:
        return {
          message: 'Database operation failed.',
          code: 'DATABASE_OPERATION_ERROR',
          statusCode: 500,
          details: { prismaCode: error.code, message: error.message }
        };
    }
  }

  if (error instanceof PrismaClientUnknownRequestError) {
    return {
      message: 'An unknown database error occurred.',
      code: 'DATABASE_UNKNOWN_ERROR',
      statusCode: 500,
      details: {
        type: 'PrismaClientUnknownRequestError',
        message: error.message,
      }
    };
  }

  // Handle custom database errors
  if (error instanceof DatabaseConnectionError) {
    return {
      message: error.message,
      code: 'DATABASE_CONNECTION_ERROR',
      statusCode: 503,
      details: error.originalError
    };
  }

  if (error instanceof DatabaseTimeoutError) {
    return {
      message: error.message,
      code: 'DATABASE_TIMEOUT_ERROR',
      statusCode: 504,
      details: error.originalError
    };
  }

  // Handle network/connection errors
  if (error.code === 'ECONNREFUSED') {
    return {
      message: 'Database connection refused. The database server may be down.',
      code: 'DATABASE_CONNECTION_REFUSED',
      statusCode: 503,
      details: { networkError: error.code }
    };
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    return {
      message: 'Database connection timeout. Please try again.',
      code: 'DATABASE_CONNECTION_TIMEOUT',
      statusCode: 504,
      details: { networkError: error.code }
    };
  }

  if (error.code === 'ENOTFOUND') {
    return {
      message: 'Database host not found. Please check the connection configuration.',
      code: 'DATABASE_HOST_NOT_FOUND',
      statusCode: 503,
      details: { networkError: error.code }
    };
  }

  // Generic error fallback
  return {
    message: 'An unexpected error occurred while accessing the database.',
    code: 'DATABASE_GENERIC_ERROR',
    statusCode: 500,
    details: {
      message: error.message,
      name: error.name,
      stack: process.env.ENV === 'development' ? error.stack : undefined
    }
  };
}

export function createErrorResponse(error: ApiError): NextResponse {
  return NextResponse.json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      details: error.details,
    },
    timestamp: new Date().toISOString(),
  }, { status: error.statusCode });
}

export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await operation();
  } catch (error) {
    const apiError = handleDatabaseError(error);
    return createErrorResponse(apiError);
  }
}
