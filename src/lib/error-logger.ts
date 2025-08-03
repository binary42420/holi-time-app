/**
 * Centralized Error Logging System
 * Provides structured error logging with different levels and contexts
 */

import { ERROR_MESSAGES } from '@/constants';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  userAgent?: string;
  ip?: string;
  errorInfo?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: LogContext;
  timestamp: string;
  stack?: string;
}

export interface ErrorReport {
  id: string;
  level: LogLevel;
  message: string;
  error: string;
  stack?: string;
  context: LogContext;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

class ErrorLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isProduction = process.env.ENV === 'production';

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  /**
   * Log a warning
   */
  warn(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.WARN, message, error, context);
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  /**
   * Log a fatal error
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, error, context);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, error?: Error, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    
    const logEntry: LogEntry = {
      level,
      message,
      error,
      context: {
        ...context,
        timestamp,
      },
      timestamp,
      stack: error?.stack,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging based on environment
    this.consoleLog(logEntry);

    // Send to external logging service in production
    if (this.isProduction && level !== LogLevel.DEBUG) {
      this.sendToExternalService(logEntry);
    }

    // Store critical errors for reporting
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.storeCriticalError(logEntry);
    }
  }

  /**
   * Console logging with appropriate formatting
   */
  private consoleLog(entry: LogEntry): void {
    const { level, message, error, context } = entry;
    
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    const fullMessage = `[${level.toUpperCase()}] ${message}${contextStr}`;

    switch (level) {
      case LogLevel.DEBUG:
        if (!this.isProduction) console.debug(fullMessage);
        break;
      case LogLevel.INFO:
        console.info(fullMessage);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, error);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, error);
        break;
      case LogLevel.FATAL:
        console.error(`🚨 FATAL: ${fullMessage}`, error);
        break;
    }
  }

  /**
   * Send logs to external service (Sentry, LogRocket, etc.)
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    try {
      // Example: Send to Sentry
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        const { Sentry } = window as any;
        
        if (entry.error) {
          Sentry.captureException(entry.error, {
            level: entry.level,
            contexts: {
              custom: entry.context,
            },
          });
        } else {
          Sentry.captureMessage(entry.message, entry.level);
        }
      }

      // Example: Send to custom logging endpoint
      if (this.isProduction) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {
          // Silently fail to avoid infinite loops
        });
      }
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('Failed to send log to external service:', error);
    }
  }

  /**
   * Store critical errors for admin review
   */
  private storeCriticalError(entry: LogEntry): void {
    try {
      const errorReport: ErrorReport = {
        id: this.generateId(),
        level: entry.level,
        message: entry.message,
        error: entry.error?.message || 'Unknown error',
        stack: entry.stack,
        context: entry.context || {},
        timestamp: entry.timestamp,
        resolved: false,
      };

      // Store in localStorage for development
      if (!this.isProduction && typeof window !== 'undefined') {
        const stored = localStorage.getItem('critical_errors') || '[]';
        const errors = JSON.parse(stored);
        errors.push(errorReport);
        localStorage.setItem('critical_errors', JSON.stringify(errors.slice(-50)));
      }

      // In production, this would be sent to a database
    } catch (error) {
      console.error('Failed to store critical error:', error);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    recent: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const byLevel = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0,
    };

    let recent = 0;

    this.logs.forEach(log => {
      byLevel[log.level]++;
      if (new Date(log.timestamp).getTime() > oneHourAgo) {
        recent++;
      }
    });

    return {
      total: this.logs.length,
      byLevel,
      recent,
    };
  }
}

// Global logger instance
export const logger = new ErrorLogger();

/**
 * Error boundary helper for React components
 */
export class ErrorBoundaryLogger {
  static logError(error: Error, errorInfo: any, context?: LogContext): void {
    logger.error('React Error Boundary caught an error', error, {
      ...context,
      component: 'ErrorBoundary',
      errorInfo: errorInfo.componentStack,
    });
  }
}

/**
 * API error handler
 */
export class ApiErrorLogger {
  static logApiError(
    method: string,
    url: string,
    status: number,
    error: Error,
    context?: LogContext
  ): void {
    logger.error(`API Error: ${method} ${url} - ${status}`, error, {
      ...context,
      component: 'API',
      action: method,
      resource: url,
      metadata: { status },
    });
  }

  static logApiSuccess(
    method: string,
    url: string,
    status: number,
    context?: LogContext
  ): void {
    logger.info(`API Success: ${method} ${url} - ${status}`, {
      ...context,
      component: 'API',
      action: method,
      resource: url,
      metadata: { status },
    });
  }
}

/**
 * Database error handler
 */
export class DatabaseErrorLogger {
  static logDatabaseError(
    operation: string,
    table: string,
    error: Error,
    context?: LogContext
  ): void {
    logger.error(`Database Error: ${operation} on ${table}`, error, {
      ...context,
      component: 'Database',
      action: operation,
      resource: table,
    });
  }

  static logSlowQuery(
    query: string,
    duration: number,
    context?: LogContext
  ): void {
    logger.warn(`Slow Database Query (${duration}ms)`, undefined, {
      ...context,
      component: 'Database',
      action: 'slow_query',
      metadata: { query: query.substring(0, 100), duration },
    });
  }
}

/**
 * Authentication error handler
 */
export class AuthErrorLogger {
  static logAuthFailure(
    reason: string,
    email?: string,
    context?: LogContext
  ): void {
    logger.warn(`Authentication failed: ${reason}`, undefined, {
      ...context,
      component: 'Authentication',
      action: 'login_failed',
      metadata: { email, reason },
    });
  }

  static logAuthSuccess(email: string, context?: LogContext): void {
    logger.info(`Authentication successful`, {
      ...context,
      component: 'Authentication',
      action: 'login_success',
      metadata: { email },
    });
  }

  static logUnauthorizedAccess(
    resource: string,
    userId?: string,
    context?: LogContext
  ): void {
    logger.warn(`Unauthorized access attempt to ${resource}`, undefined, {
      ...context,
      component: 'Authorization',
      action: 'unauthorized_access',
      resource,
      userId,
    });
  }
}

/**
 * Performance monitoring
 */
export class PerformanceLogger {
  static logPerformance(
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    if (duration > 5000) {
      logger.warn(`Performance: ${operation} took ${duration}ms`, undefined, {
        ...context,
        component: 'Performance',
        action: operation,
        metadata: { duration }
      });
    } else {
      logger.info(`Performance: ${operation} took ${duration}ms`, {
        ...context,
        component: 'Performance',
        action: operation,
        metadata: { duration }
      });
    }
  }

  static startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.logPerformance(operation, duration);
    };
  }
}
