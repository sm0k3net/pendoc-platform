import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  AppError, 
  ErrorCode, 
  mapSupabaseError, 
  mapStorageError, 
  mapAIError, 
  logError, 
  getErrorMessage,
  isAppError 
} from '@/lib/errors';
import { auditFailure, AuditAction } from '@/lib/audit';
import { PostgrestError } from '@supabase/supabase-js';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  auditAction?: AuditAction;
  context?: Record<string, unknown>;
  rethrow?: boolean;
}

interface UseErrorHandlerReturn {
  handleError: (error: unknown, options?: ErrorHandlerOptions) => AppError;
  handleSupabaseError: (error: PostgrestError | Error | null, options?: ErrorHandlerOptions) => AppError;
  handleStorageError: (error: Error | null, operation: 'upload' | 'download' | 'delete', options?: ErrorHandlerOptions) => AppError;
  handleAIError: (error: Error | null, options?: ErrorHandlerOptions) => AppError;
  withErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>;
}

/**
 * Custom hook for comprehensive error handling
 * Provides utilities to handle, log, and display errors consistently
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const { toast } = useToast();

  const showErrorToast = useCallback((error: AppError) => {
    toast({
      title: 'Error',
      description: error.userMessage,
      variant: 'destructive',
    });
  }, [toast]);

  const processError = useCallback((
    appError: AppError, 
    options: ErrorHandlerOptions = {}
  ): AppError => {
    const {
      showToast = true,
      logToConsole = true,
      auditAction,
      context,
      rethrow = false,
    } = options;

    // Log to console in development
    if (logToConsole) {
      logError(appError, context);
    }

    // Show toast notification
    if (showToast) {
      showErrorToast(appError);
    }

    // Audit the failure
    if (auditAction) {
      auditFailure(auditAction, appError.userMessage, {
        details: {
          errorCode: appError.code,
          ...context,
        },
      });
    }

    // Rethrow if requested
    if (rethrow) {
      throw appError;
    }

    return appError;
  }, [showErrorToast]);

  /**
   * Generic error handler
   */
  const handleError = useCallback((
    error: unknown, 
    options?: ErrorHandlerOptions
  ): AppError => {
    let appError: AppError;

    if (isAppError(error)) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        userMessage: error.message || 'An unexpected error occurred',
        technicalMessage: error.message,
        originalError: error,
        context: options?.context,
      });
    } else {
      appError = new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        userMessage: getErrorMessage(error),
        context: options?.context,
      });
    }

    return processError(appError, options);
  }, [processError]);

  /**
   * Supabase/Database error handler
   */
  const handleSupabaseError = useCallback((
    error: PostgrestError | Error | null,
    options?: ErrorHandlerOptions
  ): AppError => {
    const appError = mapSupabaseError(error, options?.context);
    return processError(appError, options);
  }, [processError]);

  /**
   * Storage error handler
   */
  const handleStorageError = useCallback((
    error: Error | null,
    operation: 'upload' | 'download' | 'delete',
    options?: ErrorHandlerOptions
  ): AppError => {
    const appError = mapStorageError(error, operation, options?.context);
    return processError(appError, options);
  }, [processError]);

  /**
   * AI service error handler
   */
  const handleAIError = useCallback((
    error: Error | null,
    options?: ErrorHandlerOptions
  ): AppError => {
    const appError = mapAIError(error, options?.context);
    return processError(appError, options);
  }, [processError]);

  /**
   * Wrapper function for async operations with automatic error handling
   */
  const withErrorHandling = useCallback(async <T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleSupabaseError,
    handleStorageError,
    handleAIError,
    withErrorHandling,
  };
}

/**
 * Utility function for try-catch with error handling
 * Can be used outside of React components
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: AppError) => void
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    const appError = isAppError(error) 
      ? error 
      : mapSupabaseError(error instanceof Error ? error : new Error(String(error)));
    
    logError(appError);
    errorHandler?.(appError);
    
    return { data: null, error: appError };
  }
}

export default useErrorHandler;
