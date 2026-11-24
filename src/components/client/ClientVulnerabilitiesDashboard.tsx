import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bug, Filter, RefreshCw, Search, ShieldAlert, ShieldCheck, ShieldX, Shield, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ClientSelectedItem } from '@/pages/ClientDashboard';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ClientProject {
  id: string;
  name: string;
  description: string | null;
}

interface VulnerabilityItem {
  id: string;
  title: string;
  severity: string;
  status: string | null;
  retest_status: string | null;
  project_id: string;
  created_at: string;
}

interface ClientVulnerabilitiesDashboardProps {
  projects: ClientProject[];
  projectId?: string;
  onSelectItem: (item: ClientSelectedItem) => void;
}

const STATUS_ORDER = ['open', 'retest', 'validated', 'fixed', 'accepted', 'ignored'] as const;

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  retest: 'Re-test',
  validated: 'Validated',
  fixed: 'Fixed',
  accepted: 'Accepted',
  ignored: 'Ignored',
};

const STATUS_ICONS: Record<string, ReactNode> = {
  open: <ShieldAlert className="h-4 w-4 text-orange-500" />,
  retest: <RefreshCw className="h-4 w-4 text-blue-500" />,
  validated: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  fixed: <ShieldCheck className="h-4 w-4 text-green-500" />,
  accepted: <Shield className="h-4 w-4 text-indigo-500" />,
  ignored: <ShieldX className="h-4 w-4 text-gray-500" />,
};

export function ClientVulnerabilitiesDashboard({ projects, projectId, onSelectItem }: ClientVulnerabilitiesDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const loadVulnerabilities = useCallback(async () => {
    if (projects.length === 0) {
      setVulnerabilities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const projectIds = projectId ? [projectId] : projects.map((p) => p.id);
      const { data, error } = await supabase
        .from('vulnerabilities')
        .select('id, title, severity, status, retest_status, project_id, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVulnerabilities(data || []);
    } catch (error) {
      console.error('Error loading vulnerabilities:', error);
      toast({ title: 'Error loading vulnerabilities', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, projects, toast]);

  useEffect(() => {
    loadVulnerabilities();
  }, [loadVulnerabilities]);

  const normalizedVulnerabilities = useMemo(() => {
    return vulnerabilities.map((v) => ({
      ...v,
      normalized_status: v.status || 'open',
    }));
  }, [vulnerabilities]);

  const filtered = useMemo(() => {
    return normalizedVulnerabilities.filter((v) => {
      if (statusFilter !== 'all' && v.normalized_status !== statusFilter) return false;
      if (severityFilter !== 'all' && v.severity !== severityFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        const projectName = projectMap.get(v.project_id)?.toLowerCase() || '';
        if (!v.title.toLowerCase().includes(term) && !projectName.includes(term)) return false;
      }
      return true;
    });
  }, [normalizedVulnerabilities, projectMap, search, severityFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, VulnerabilityItem[]> = {};
    STATUS_ORDER.forEach((status) => (map[status] = []));
    filtered.forEach((v) => {
      const status = (v.status || 'open') as string;
      if (!map[status]) map[status] = [];
      map[status].push(v);
    });
    return map;
  }, [filtered]);

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const next = new Set(selectedIds);
    filtered.forEach((v) => next.add(v.id));
    setSelectedIds(next);
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  const handleRequestRetest = async () => {
    if (!user || selectedIds.size === 0) return;

    setWorking(true);
    try {
      const { data: changed, error } = await supabase.rpc('request_client_retests', {
        p_ids: Array.from(selectedIds),
      });
      if (error) throw error;
      if (!changed) {
        toast({ title: 'The selected findings are already awaiting re-test' });
        return;
      }

      toast({ title: 'Re-test requested for selected vulnerabilities' });
      handleClearSelection();
      loadVulnerabilities();
    } catch (error) {
      console.error('Error requesting retest:', error);
      toast({ title: 'Error requesting re-test', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      case 'info': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Bug className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {t.clientPortal.vulnerabilityOverview}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.clientPortal.vulnerabilityOverviewDesc}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={filtered.length === 0}>
              {t.clientPortal.selectAll}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearSelection} disabled={selectedIds.size === 0}>
              {t.clientPortal.clearSelection}
            </Button>
            <Button
              variant="cyber"
              size="sm"
              disabled={selectedIds.size === 0 || working}
              onClick={handleRequestRetest}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', working && 'animate-spin')} />
              {t.clientPortal.requestRetestBulk}
            </Button>
          </div>
        </div>

        {/* Stats summary row */}
        {vulnerabilities.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: vulnerabilities.length, color: 'text-foreground', border: 'border-l-4 border-l-muted-foreground' },
              { label: 'Critical / High', value: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length, color: 'text-red-500', border: 'border-l-4 border-l-red-500' },
              { label: 'Fixed', value: vulnerabilities.filter(v => v.status === 'fixed').length, color: 'text-green-500', border: 'border-l-4 border-l-green-500' },
              { label: 'Pending Retest', value: vulnerabilities.filter(v => v.retest_status === 'waiting' || v.status === 'retest').length, color: 'text-blue-500', border: 'border-l-4 border-l-blue-500' },
            ].map(({ label, value, color, border }) => (
              <Card key={label} className={cn('py-3 px-4', border)}>
                <div className={cn('text-2xl font-bold', color)}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t.clientPortal.filters}
            </CardTitle>
            <CardDescription>{t.clientPortal.filtersDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.clientPortal.status}</label>
              <div className="flex flex-nowrap gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                {['all', ...STATUS_ORDER].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? 'secondary' : 'outline'}
                    onClick={() => setStatusFilter(status)}
                    className="shrink-0 text-xs sm:text-sm"
                  >
                    {status === 'all' ? t.clientPortal.all : STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.clientPortal.severity}</label>
              <div className="flex flex-nowrap gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                {['all', 'critical', 'high', 'medium', 'low', 'info'].map((severity) => (
                  <Button
                    key={severity}
                    size="sm"
                    variant={severityFilter === severity ? 'secondary' : 'outline'}
                    onClick={() => setSeverityFilter(severity)}
                    className="shrink-0 text-xs sm:text-sm"
                  >
                    {severity === 'all' ? t.clientPortal.all : severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.clientPortal.search}</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.clientPortal.searchPlaceholder}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {STATUS_ORDER.map((status) => {
            const items = grouped[status] || [];
            if (items.length === 0) return null;
            return (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {STATUS_ICONS[status]}
                    {STATUS_LABELS[status]}
                    <Badge variant="secondary" className="ml-1">
                      {items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((vuln) => (
                    <div
                      key={vuln.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 transition"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedIds.has(vuln.id)}
                          onCheckedChange={(checked) => toggleSelection(vuln.id, Boolean(checked))}
                        />
                        <div className="space-y-1">
                          <button
                            onClick={() => onSelectItem({ type: 'vulnerability', id: vuln.id, name: vuln.title, projectId: vuln.project_id })}
                            className="text-left font-medium hover:underline"
                          >
                            {vuln.title}
                          </button>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{projectMap.get(vuln.project_id) || 'Project'}</span>
                            <span>•</span>
                            <span>{format(new Date(vuln.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[10px] px-2 py-0.5', getSeverityColor(vuln.severity))}>
                          {vuln.severity.toUpperCase()}
                        </Badge>
                        {vuln.retest_status === 'waiting' && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-orange-500 border-orange-500">
                            {t.clientPortal.retestRequested}
                          </Badge>
                        )}
                        {vuln.retest_status === 'completed' && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-green-500 border-green-500">
                            {t.clientPortal.retestCompleted}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bug className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>{t.clientPortal.noMatchingVulnerabilities}</p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
