import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logError, AppError, ErrorCode } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    return { 
      hasError: true, 
      error,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log the error
    const appError = error instanceof AppError ? error : new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      severity: 'critical',
      userMessage: 'An unexpected error occurred',
      technicalMessage: error.message,
      context: {
        componentStack: errorInfo.componentStack,
      },
      originalError: error,
    });

    logError(appError, {
      componentStack: errorInfo.componentStack,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.errorId && (
                <div className="bg-muted p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Error Reference ID</p>
                  <code className="text-sm font-mono text-primary">{this.state.errorId}</code>
                </div>
              )}
              
              {!import.meta.env.PROD && this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Technical Details (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-48">
                    <p className="font-semibold text-destructive">{this.state.error.message}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-xs mt-2 whitespace-pre-wrap text-muted-foreground">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={this.handleGoHome}
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
              <Button 
                variant="outline"
                className="w-full sm:w-auto"
                onClick={this.handleReset}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                className="w-full sm:w-auto"
                onClick={this.handleReload}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline Error Display Component
 * For displaying errors within a component without crashing the whole app
 */
interface InlineErrorProps {
  error: Error | AppError | string | null;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ error, onRetry, className = '' }: InlineErrorProps) {
  if (!error) return null;

  const message = typeof error === 'string' 
    ? error 
    : error instanceof AppError 
      ? error.userMessage 
      : error.message;

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm ${className}`}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRetry}
          className="h-auto py-1 px-2 text-destructive hover:text-destructive"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Empty State Error Component
 * For displaying errors when content fails to load
 */
interface EmptyStateErrorProps {
  title?: string;
  description?: string;
  error?: Error | AppError | null;
  onRetry?: () => void;
}

export function EmptyStateError({ 
  title = 'Failed to load',
  description = 'Something went wrong while loading this content.',
  error,
  onRetry 
}: EmptyStateErrorProps) {
  const errorMessage = error instanceof AppError 
    ? error.userMessage 
    : error?.message;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">
        {errorMessage || description}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorBoundary;
