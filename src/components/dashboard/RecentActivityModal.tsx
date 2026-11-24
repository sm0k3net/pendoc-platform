import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar, Filter, Clock, User, Bug, FileText, Folder, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface AuditLog {
  id: string;
  action: string;
  category: string | null;
  resource_type: string | null;
  resource_name: string | null;
  success: boolean;
  created_at: string;
  error_message: string | null;
}

interface RecentActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

export function RecentActivityModal({ open, onOpenChange, userId }: RecentActivityModalProps) {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = subDays(new Date(), daysAgo).toISOString();
      
      let query = supabase
        .from('audit_logs')
        .select('id, action, category, resource_type, resource_name, success, created_at, error_message')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (filter !== 'all') {
        query = query.eq('category', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when modal opens or filters change
  useState(() => {
    if (open) {
      fetchLogs();
    }
  });

  const getIcon = (category: string | null, resourceType: string | null) => {
    if (category === 'auth') return <User className="h-4 w-4 text-blue-500" />;
    if (resourceType === 'vulnerability') return <Bug className="h-4 w-4 text-orange-500" />;
    if (resourceType === 'file') return <FileText className="h-4 w-4 text-green-500" />;
    if (resourceType === 'folder') return <Folder className="h-4 w-4 text-yellow-500" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const formatAction = (action: string) => {
    return action.replace(/\./g, ' ').replace(/_/g, ' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            All Activity
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Select value={dateRange} onValueChange={(v) => { setDateRange(v); fetchLogs(); }}>
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="3">Last 3 days</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={(v) => { setFilter(v); fetchLogs(); }}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="auth">Authentication</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="vulnerability">Vulnerabilities</SelectItem>
              <SelectItem value="file">Files</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-20" />
              <p>No activity found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getIcon(log.category, log.resource_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm capitalize">
                        {formatAction(log.action)}
                      </span>
                      {log.success ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>
                    {log.resource_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {log.resource_name}
                      </p>
                    )}
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {log.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {log.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}