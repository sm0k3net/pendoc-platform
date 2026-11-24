import { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { EmptyStateError } from '@/components/ErrorBoundary';

interface AuditLog {
  id: string;
  action: string;
  category: string;
  resource_type: string | null;
  resource_name: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  auth: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  project: 'bg-green-500/10 text-green-500 border-green-500/20',
  file: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  folder: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  vulnerability: 'bg-red-500/10 text-red-500 border-red-500/20',
  share: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  export: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  ai: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  settings: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  api: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

const actionLabels: Record<string, string> = {
  'auth.login': 'Logged in',
  'auth.logout': 'Logged out',
  'auth.signup': 'Signed up',
  'auth.session_refresh': 'Session refreshed',
  'project.create': 'Created project',
  'project.update': 'Updated project',
  'project.delete': 'Deleted project',
  'project.view': 'Viewed project',
  'file.create': 'Created file',
  'file.update': 'Updated file',
  'file.delete': 'Deleted file',
  'file.view': 'Viewed file',
  'file.upload': 'Uploaded file',
  'folder.create': 'Created folder',
  'folder.delete': 'Deleted folder',
  'vulnerability.create': 'Added vulnerability',
  'vulnerability.update': 'Updated vulnerability',
  'vulnerability.delete': 'Deleted vulnerability',
  'vulnerability.view': 'Viewed vulnerability',
  'share.grant': 'Shared access',
  'share.revoke': 'Revoked access',
  'export.project': 'Exported project',
  'export.report': 'Generated report',
  'ai.analyze': 'Used AI assistant',
  'ai.generate': 'Generated content with AI',
  'settings.update': 'Updated settings',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const { handleSupabaseError } = useErrorHandler();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, category, resource_type, resource_name, success, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // If table doesn't exist yet, show empty state
        if (error.code === '42P01') {
          setLogs([]);
          setLoading(false);
          return;
        }
        
        const appError = handleSupabaseError(error, {
          showToast: false,
        });
        setLoadError(new Error(appError.userMessage));
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      handleSupabaseError(err as Error, { showToast: false });
      setLoadError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [handleSupabaseError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const successCount = logs.filter((log) => log.success).length;
  const failedCount = logs.filter((log) => !log.success).length;

  return (
    <Card className="border-border/70 shadow-sm animate-fade-in">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Your recent activity and security events
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!loading && !loadError && logs.length > 0 && (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Entries loaded</div>
              <div className="mt-2 text-lg font-semibold">{logs.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Successful</div>
              <div className="mt-2 text-lg font-semibold text-green-500">{successCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Failed</div>
              <div className="mt-2 text-lg font-semibold text-red-500">{failedCount}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading activity...
          </div>
        ) : loadError ? (
          <EmptyStateError
            title="Failed to load activity"
            error={loadError}
            onRetry={fetchLogs}
          />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p>No activity recorded yet</p>
            <p className="text-sm">Your actions will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[420px] pr-2 sm:pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="mt-0.5">
                    {log.success ? (
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <X className="h-3.5 w-3.5 text-red-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm">
                        {actionLabels[log.action] || log.action}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${categoryColors[log.category] || 'bg-gray-500/10'}`}
                      >
                        {log.category}
                      </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(log.created_at)}
                      </div>
                    </div>
                    {log.resource_name && (
                      <p className="text-sm text-muted-foreground break-words">
                        {log.resource_type}: {log.resource_name}
                      </p>
                    )}
                    {log.error_message && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
