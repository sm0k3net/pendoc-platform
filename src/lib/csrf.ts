/**
 * CSRF Protection Utility
 * 
 * Implements CSRF token generation and validation for form submissions
 * and API requests. Uses cryptographically secure random tokens.
 */

const CSRF_TOKEN_KEY = 'pendoc_csrf_token';
const CSRF_TOKEN_EXPIRY_KEY = 'pendoc_csrf_expiry';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a CSRF token for the current session
 */
export function getCsrfToken(): string {
  const existingToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
  
  // Check if token exists and is not expired
  if (existingToken && expiry) {
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() < expiryTime) {
      return existingToken;
    }
  }
  
  // Generate new token
  const newToken = generateSecureToken();
  const newExpiry = Date.now() + TOKEN_EXPIRY_MS;
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
  sessionStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, newExpiry.toString());
  
  return newToken;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
  
  if (!storedToken || !expiry) {
    return false;
  }
  
  const expiryTime = parseInt(expiry, 10);
  if (Date.now() >= expiryTime) {
    // Token expired, clear it
    clearCsrfToken();
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(token, storedToken);
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
}

/**
 * Rotate the CSRF token (generate a new one)
 */
export function rotateCsrfToken(): string {
  clearCsrfToken();
  return getCsrfToken();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Add CSRF token to headers for fetch requests
 */
export function getCsrfHeaders(): Record<string, string> {
  return {
    'X-CSRF-Token': getCsrfToken(),
  };
}

/**
 * Create a protected fetch function that includes CSRF token
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('X-CSRF-Token', getCsrfToken());
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Validate origin for same-origin requests.
 * Checks that document.referrer (if present) matches the current origin
 * to guard against cross-origin form submissions.
 */
export function validateOrigin(): boolean {
  // In SSR or non-browser contexts, skip check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return true;
  }

  const currentOrigin = window.location.origin;

  // If there is no referrer (e.g. direct navigation, bookmarks, privacy
  // settings stripping it), allow the request – the CSRF token itself is
  // the primary defence.
  const referrer = document.referrer;
  if (!referrer) {
    return true;
  }

  try {
    const referrerOrigin = new URL(referrer).origin;
    return referrerOrigin === currentOrigin;
  } catch {
    // Malformed referrer – deny by default
    return false;
  }
}

/**
 * Check if the request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  return protectedMethods.includes(method.toUpperCase());
}
