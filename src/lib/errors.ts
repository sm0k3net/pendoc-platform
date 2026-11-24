/**
 * Comprehensive Error Handling System for PenDoc
 * Provides standardized error types, handling, and reporting
 */

import { PostgrestError } from '@supabase/supabase-js';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Application-specific error codes
export enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_INVALID_CREDENTIALS = 'AUTH_1001',
  AUTH_SESSION_EXPIRED = 'AUTH_1002',
  AUTH_UNAUTHORIZED = 'AUTH_1003',
  AUTH_EMAIL_NOT_CONFIRMED = 'AUTH_1004',
  AUTH_RATE_LIMITED = 'AUTH_1005',

  // Database errors (2xxx)
  DB_CONNECTION_ERROR = 'DB_2001',
  DB_QUERY_ERROR = 'DB_2002',
  DB_NOT_FOUND = 'DB_2003',
  DB_DUPLICATE_ENTRY = 'DB_2004',
  DB_CONSTRAINT_VIOLATION = 'DB_2005',
  DB_PERMISSION_DENIED = 'DB_2006',

  // Validation errors (3xxx)
  VALIDATION_REQUIRED_FIELD = 'VAL_3001',
  VALIDATION_INVALID_FORMAT = 'VAL_3002',
  VALIDATION_OUT_OF_RANGE = 'VAL_3003',
  VALIDATION_FILE_TOO_LARGE = 'VAL_3004',
  VALIDATION_INVALID_FILE_TYPE = 'VAL_3005',

  // Network errors (4xxx)
  NETWORK_TIMEOUT = 'NET_4001',
  NETWORK_OFFLINE = 'NET_4002',
  NETWORK_REQUEST_FAILED = 'NET_4003',
  NETWORK_CORS_ERROR = 'NET_4004',

  // Storage errors (5xxx)
  STORAGE_UPLOAD_FAILED = 'STG_5001',
  STORAGE_DOWNLOAD_FAILED = 'STG_5002',
  STORAGE_QUOTA_EXCEEDED = 'STG_5003',
  STORAGE_FILE_NOT_FOUND = 'STG_5004',

  // AI/External service errors (6xxx)
  AI_SERVICE_UNAVAILABLE = 'AI_6001',
  AI_RATE_LIMITED = 'AI_6002',
  AI_INVALID_RESPONSE = 'AI_6003',

  // General errors (9xxx)
  UNKNOWN_ERROR = 'GEN_9001',
  OPERATION_CANCELLED = 'GEN_9002',
  FEATURE_NOT_AVAILABLE = 'GEN_9003',
}

// Error metadata interface
export interface ErrorMetadata {
  code: ErrorCode;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
  stack?: string;
  originalError?: unknown;
}

// Custom application error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly technicalMessage?: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly originalError?: unknown;

  constructor(params: {
    code: ErrorCode;
    severity?: ErrorSeverity;
    userMessage: string;
    technicalMessage?: string;
    context?: Record<string, unknown>;
    originalError?: unknown;
  }) {
    super(params.userMessage);
    this.name = 'AppError';
    this.code = params.code;
    this.severity = params.severity || 'medium';
    this.userMessage = params.userMessage;
    this.technicalMessage = params.technicalMessage;
    this.context = params.context;
    this.timestamp = new Date().toISOString();
    this.requestId = generateRequestId();
    this.originalError = params.originalError;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toMetadata(): ErrorMetadata {
    return {
      code: this.code,
      severity: this.severity,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      context: this.context,
      timestamp: this.timestamp,
      requestId: this.requestId,
      stack: this.stack,
      originalError: this.originalError,
    };
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.userMessage,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

// Generate a unique request ID for error tracking
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Map Supabase/Postgres errors to application errors
export function mapSupabaseError(error: PostgrestError | Error | null, context?: Record<string, unknown>): AppError {
  if (!error) {
    return new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      userMessage: 'An unexpected error occurred',
      context,
    });
  }

  // Handle PostgrestError
  if ('code' in error && typeof (error as PostgrestError).code === 'string') {
    const pgError = error as PostgrestError;
    
    // Map common Postgres error codes
    switch (pgError.code) {
      case '23505': // unique_violation
        return new AppError({
          code: ErrorCode.DB_DUPLICATE_ENTRY,
          severity: 'low',
          userMessage: 'This item already exists',
          technicalMessage: pgError.message,
          context: { ...context, pgCode: pgError.code },
          originalError: error,
        });

      case '23503': // foreign_key_violation
        return new AppError({
          code: ErrorCode.DB_CONSTRAINT_VIOLATION,
          severity: 'medium',
          userMessage: 'Cannot complete this action due to related data',
          technicalMessage: pgError.message,
          context: { ...context, pgCode: pgError.code },
          originalError: error,
        });

      case '42501': // insufficient_privilege
        return new AppError({
          code: ErrorCode.DB_PERMISSION_DENIED,
          severity: 'medium',
          userMessage: 'You do not have permission to perform this action',
          technicalMessage: pgError.message,
          context: { ...context, pgCode: pgError.code },
          originalError: error,
        });

      case 'PGRST116': // Not found (no rows returned)
        return new AppError({
          code: ErrorCode.DB_NOT_FOUND,
          severity: 'low',
          userMessage: 'The requested item was not found',
          technicalMessage: pgError.message,
          context: { ...context, pgCode: pgError.code },
          originalError: error,
        });

      default:
        return new AppError({
          code: ErrorCode.DB_QUERY_ERROR,
          severity: 'medium',
          userMessage: 'A database error occurred',
          technicalMessage: pgError.message,
          context: { ...context, pgCode: pgError.code },
          originalError: error,
        });
    }
  }

  // Handle auth errors
  const errorMessage = error.message?.toLowerCase() || '';
  
  if (errorMessage.includes('invalid login credentials')) {
    return new AppError({
      code: ErrorCode.AUTH_INVALID_CREDENTIALS,
      severity: 'low',
      userMessage: 'Invalid email or password',
      technicalMessage: error.message,
      context,
      originalError: error,
    });
  }

  if (errorMessage.includes('email not confirmed')) {
    return new AppError({
      code: ErrorCode.AUTH_EMAIL_NOT_CONFIRMED,
      severity: 'low',
      userMessage: 'Please confirm your email address before logging in',
      technicalMessage: error.message,
      context,
      originalError: error,
    });
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return new AppError({
      code: ErrorCode.AUTH_RATE_LIMITED,
      severity: 'medium',
      userMessage: 'Too many attempts. Please try again later',
      technicalMessage: error.message,
      context,
      originalError: error,
    });
  }

  if (errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('session')) {
    return new AppError({
      code: ErrorCode.AUTH_SESSION_EXPIRED,
      severity: 'low',
      userMessage: 'Your session has expired. Please log in again',
      technicalMessage: error.message,
      context,
      originalError: error,
    });
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return new AppError({
      code: ErrorCode.NETWORK_REQUEST_FAILED,
      severity: 'high',
      userMessage: 'Unable to connect. Please check your internet connection',
      technicalMessage: error.message,
      context,
      originalError: error,
    });
  }

  // Default error
  return new AppError({
    code: ErrorCode.UNKNOWN_ERROR,
    severity: 'medium',
    userMessage: 'An unexpected error occurred. Please try again',
    technicalMessage: error.message,
    context,
    originalError: error,
  });
}

// Map storage errors
export function mapStorageError(error: Error | null, operation: 'upload' | 'download' | 'delete', context?: Record<string, unknown>): AppError {
  if (!error) {
    return new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      userMessage: 'An unexpected storage error occurred',
      context,
    });
  }

  const errorMessage = error.message?.toLowerCase() || '';

  if (errorMessage.includes('payload too large') || errorMessage.includes('file too large')) {
    return new AppError({
      code: ErrorCode.STORAGE_QUOTA_EXCEEDED,
      severity: 'low',
      userMessage: 'File is too large. Maximum size is 50MB',
      technicalMessage: error.message,
      context: { ...context, operation },
      originalError: error,
    });
  }

  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return new AppError({
      code: ErrorCode.STORAGE_FILE_NOT_FOUND,
      severity: 'low',
      userMessage: 'File not found',
      technicalMessage: error.message,
      context: { ...context, operation },
      originalError: error,
    });
  }

  const operationMap = {
    upload: ErrorCode.STORAGE_UPLOAD_FAILED,
    download: ErrorCode.STORAGE_DOWNLOAD_FAILED,
    delete: ErrorCode.STORAGE_FILE_NOT_FOUND,
  };

  return new AppError({
    code: operationMap[operation],
    severity: 'medium',
    userMessage: `Failed to ${operation} file. Please try again`,
    technicalMessage: error.message,
    context: { ...context, operation },
    originalError: error,
  });
}

// Map AI service errors
export function mapAIError(error: Error | null, context?: Record<string, unknown>): AppError {
  if (!error) {
    return new AppError({
      code: ErrorCode.AI_SERVICE_UNAVAILABLE,
      userMessage: 'AI service is temporarily unavailable',
      context,
    });
  }

  const errorMessage = error.message?.toLowerCase() || '';

  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return new AppError({
      code: ErrorCode.AI_RATE_LIMITED,
      severity: 'low',
      userMessage: 'AI service is busy. Please try again in a moment',
      technicalMessage: error.message,
      context,
      originalError: error,
    });
  }

  if (errorMessage.includes('timeout')) {
    return new AppError({
      code: ErrorCode.NETWORK_TIMEOUT,
      severity: 'medium',
      userMessage: 'AI request timed out. Please try again',
      technicalMessage: error.message,
      context,
      originalError: error,
    });
  }

  return new AppError({
    code: ErrorCode.AI_SERVICE_UNAVAILABLE,
    severity: 'medium',
    userMessage: 'AI service is temporarily unavailable. Please try again later',
    technicalMessage: error.message,
    context,
    originalError: error,
  });
}

// Validation error helper
export function createValidationError(field: string, message: string, context?: Record<string, unknown>): AppError {
  return new AppError({
    code: ErrorCode.VALIDATION_REQUIRED_FIELD,
    severity: 'low',
    userMessage: message,
    context: { field, ...context },
  });
}

// Error logging utility (for console in development, could be extended for production)
export function logError(error: AppError | Error, additionalContext?: Record<string, unknown>): void {
  const isProduction = import.meta.env.PROD;
  
  if (error instanceof AppError) {
    const metadata = error.toMetadata();
    
    if (!isProduction) {
      console.group(`🚨 [${metadata.code}] ${metadata.userMessage}`);
      console.error('Severity:', metadata.severity);
      console.error('Technical:', metadata.technicalMessage);
      console.error('Context:', { ...metadata.context, ...additionalContext });
      console.error('Request ID:', metadata.requestId);
      console.error('Timestamp:', metadata.timestamp);
      if (metadata.stack) {
        console.error('Stack:', metadata.stack);
      }
      console.groupEnd();
    } else {
      // In production, log a condensed version
      console.error(JSON.stringify({
        code: metadata.code,
        severity: metadata.severity,
        message: metadata.userMessage,
        requestId: metadata.requestId,
        timestamp: metadata.timestamp,
      }));
    }
  } else {
    // Regular Error
    if (!isProduction) {
      console.error('🚨 Unexpected Error:', error);
      console.error('Context:', additionalContext);
    } else {
      console.error(JSON.stringify({
        message: error.message,
        ...additionalContext,
      }));
    }
  }
}

// Type guard to check if something is an AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Safe error message extractor for unknown errors
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
