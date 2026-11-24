/**
 * Audit Logging System for PenDoc
 * Tracks user actions for security and compliance
 */

import { supabase } from '@/integrations/supabase/client';

// Audit action categories
export type AuditCategory = 
  | 'auth'
  | 'project'
  | 'folder'
  | 'file'
  | 'vulnerability'
  | 'share'
  | 'export'
  | 'api'
  | 'settings'
  | 'ai';

// Specific audit actions
export type AuditAction =
  // Auth actions
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_change'
  | 'auth.session_refresh'
  // Project actions
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.view'
  // Folder actions
  | 'folder.create'
  | 'folder.update'
  | 'folder.delete'
  | 'folder.move'
  // File actions
  | 'file.create'
  | 'file.update'
  | 'file.delete'
  | 'file.view'
  | 'file.upload'
  | 'file.download'
  // Vulnerability actions
  | 'vulnerability.create'
  | 'vulnerability.update'
  | 'vulnerability.delete'
  | 'vulnerability.view'
  | 'vulnerability.status_change'
  // Share actions
  | 'share.grant'
  | 'share.revoke'
  | 'share.update'
  // Export actions
  | 'export.project'
  | 'export.report'
  | 'export.file'
  // API actions
  | 'api.token_create'
  | 'api.token_delete'
  | 'api.request'
  // Settings actions
  | 'settings.update'
  | 'settings.theme_change'
  | 'settings.language_change'
  // AI actions
  | 'ai.analyze'
  | 'ai.generate';

// Audit log entry interface
export interface AuditLogEntry {
  action: AuditAction;
  category: AuditCategory;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

// In-memory buffer for batch logging (reduces database calls)
const auditBuffer: AuditLogEntry[] = [];
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
const BUFFER_MAX_SIZE = 20;
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

// Get category from action
function getCategoryFromAction(action: AuditAction): AuditCategory {
  return action.split('.')[0] as AuditCategory;
}

// Get client info
function getClientInfo(): { userAgent: string; ipAddress: string } {
  return {
    userAgent: navigator.userAgent || 'unknown',
    ipAddress: 'client-side', // Actual IP is captured server-side
  };
}

// Flush buffer to database
async function flushBuffer(): Promise<void> {
  if (auditBuffer.length === 0) return;

  const entries = [...auditBuffer];
  auditBuffer.length = 0;

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Audit: No user session, skipping log flush');
      return;
    }

    const clientInfo = getClientInfo();
    
    const logs = entries.map(entry => ({
      user_id: user.id,
      action: entry.action as string,
      category: entry.category,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId || null,
      resource_name: entry.resourceName || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || clientInfo.ipAddress,
      user_agent: entry.userAgent || clientInfo.userAgent,
      success: entry.success,
      error_message: entry.errorMessage || null,
    }));

    const { error } = await supabase.from('audit_logs').insert(logs as any);

    if (error) {
      console.error('Audit: Failed to flush logs:', error);
      // Re-add failed entries to buffer (up to max size)
      const remainingSpace = BUFFER_MAX_SIZE - auditBuffer.length;
      if (remainingSpace > 0) {
        auditBuffer.push(...entries.slice(0, remainingSpace));
      }
    }
  } catch (err) {
    console.error('Audit: Error flushing buffer:', err);
  }
}

// Schedule buffer flush
function scheduleFlush(): void {
  if (flushTimeout) return;
  
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushBuffer();
  }, BUFFER_FLUSH_INTERVAL);
}

/**
 * Log an audit event
 * Events are buffered and sent in batches to reduce database load
 */
export async function audit(entry: Omit<AuditLogEntry, 'category'>): Promise<void> {
  const fullEntry: AuditLogEntry = {
    ...entry,
    category: getCategoryFromAction(entry.action),
  };

  auditBuffer.push(fullEntry);

  // Flush immediately if buffer is full
  if (auditBuffer.length >= BUFFER_MAX_SIZE) {
    await flushBuffer();
  } else {
    scheduleFlush();
  }
}

/**
 * Log an audit event immediately (for critical actions)
 * Use for auth events, security-sensitive operations
 */
export async function auditNow(entry: Omit<AuditLogEntry, 'category'>): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const clientInfo = getClientInfo();
    const category = getCategoryFromAction(entry.action);

    const logEntry = {
      user_id: user?.id || null,
      action: entry.action as string,
      category,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId || null,
      resource_name: entry.resourceName || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || clientInfo.ipAddress,
      user_agent: entry.userAgent || clientInfo.userAgent,
      success: entry.success,
      error_message: entry.errorMessage || null,
    };

    const { error } = await supabase.from('audit_logs').insert([logEntry] as any);

    if (error) {
      console.error('Audit: Failed to log immediately:', error);
    }
  } catch (err) {
    console.error('Audit: Error logging:', err);
  }
}

/**
 * Convenience wrapper for successful operations
 */
export function auditSuccess(
  action: AuditAction,
  options?: {
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  return audit({
    action,
    success: true,
    ...options,
  });
}

/**
 * Convenience wrapper for failed operations
 */
export function auditFailure(
  action: AuditAction,
  errorMessage: string,
  options?: {
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  return audit({
    action,
    success: false,
    errorMessage,
    ...options,
  });
}

/**
 * Flush any pending audit logs (call on app unmount or logout)
 */
export function flushAuditLogs(): Promise<void> {
  return flushBuffer();
}

// Flush logs when page is about to unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliable delivery during page unload
    if (auditBuffer.length > 0 && navigator.sendBeacon) {
      // In a real implementation, you'd send to an endpoint
      // For now, we just flush normally
      flushBuffer();
    }
  });
}

/**
 * Hook for components to use audit logging
 */
export function useAudit() {
  return {
    audit,
    auditNow,
    auditSuccess,
    auditFailure,
    flushAuditLogs,
  };
}
