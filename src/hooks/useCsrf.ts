import { useCallback, useEffect, useState } from 'react';
import { getCsrfToken, validateCsrfToken, rotateCsrfToken, clearCsrfToken, getCsrfHeaders } from '@/lib/csrf';

/**
 * Hook for CSRF protection in React components
 * 
 * Usage:
 * const { csrfToken, csrfHeaders, validateToken, rotateToken } = useCsrf();
 * 
 * // In forms:
 * <input type="hidden" name="_csrf" value={csrfToken} />
 * 
 * // In fetch requests:
 * fetch(url, { headers: csrfHeaders })
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    // Get or generate token on mount
    setCsrfToken(getCsrfToken());
  }, []);

  const validateToken = useCallback((token: string): boolean => {
    return validateCsrfToken(token);
  }, []);

  const rotateToken = useCallback((): string => {
    const newToken = rotateCsrfToken();
    setCsrfToken(newToken);
    return newToken;
  }, []);

  const clearToken = useCallback(() => {
    clearCsrfToken();
    setCsrfToken('');
  }, []);

  const csrfHeaders = getCsrfHeaders();

  return {
    csrfToken,
    csrfHeaders,
    validateToken,
    rotateToken,
    clearToken,
  };
}

/**
 * Higher-order function to wrap form submission with CSRF validation
 */
export function withCsrfProtection<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: T,
  onValidationFail?: () => void
): T {
  return (async (...args: unknown[]) => {
    const token = getCsrfToken();
    if (!validateCsrfToken(token)) {
      console.error('CSRF validation failed');
      onValidationFail?.();
      throw new Error('Security validation failed. Please refresh the page and try again.');
    }
    return handler(...args);
  }) as T;
}
