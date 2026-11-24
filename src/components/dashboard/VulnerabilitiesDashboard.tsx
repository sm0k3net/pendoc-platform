import { useState, useEffect, useCallback } from 'react';
import { Bug, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Filter, Loader2, ChevronDown, ChevronUp, Check, Search, Trash2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { VulnerabilityViewer } from './VulnerabilityViewer';

interface Vulnerability {
  id: string;
  title: string;
  severity: string | null;
  status: string | null;
  project_id: string;
  project_name?: string;
  created_at: string;
  cvss_score: number | null;
  tool: string | null;
  status_reason: string | null;
}

interface VulnStats {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  fixed: '#22c55e',
  accepted: '#eab308',
  ignored: '#6b7280',
  retest: '#8b5cf6',
  false_positive: '#94a3b8',
  validated: '#10b981',
};

const PAGE_SIZE = 50;

interface VulnerabilitiesDashboardProps {
  projectId?: string | null;
}

export function VulnerabilitiesDashboard({ projectId }: VulnerabilitiesDashboardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [stats, setStats] = useState<VulnStats>({ total: 0, bySeverity: {}, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  // Status Reason Dialog State
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'open' | 'fixed' | 'accepted' | 'ignored' | 'retest' | 'false_positive' | 'validated' | null>(null);
  const [pendingVulnIds, setPendingVulnIds] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [viewingVulnId, setViewingVulnId] = useState<string | null>(null);

  const fetchVulnerabilities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('vulnerabilities')
        .select(`
          id,
          title,
          severity,
          status,
          project_id,
          created_at,
          cvss_score,
          tool,
          status_reason,
          projects!inner(name, user_id)
        `)
        .order('created_at', { ascending: false });

      if (projectId && projectId !== 'vulns') {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedVulns = (data || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        severity: v.severity,
        status: v.status || 'open',
        project_id: v.project_id,
        project_name: v.projects?.name,
        created_at: v.created_at,
        cvss_score: v.cvss_score,
        tool: v.tool,
        status_reason: v.status_reason,
      }));

      setVulnerabilities(formattedVulns);

      // Extract unique tools
      const tools = new Set<string>();
      formattedVulns.forEach(v => {
        if (v.tool) tools.add(v.tool);
      });
      setAvailableTools(Array.from(tools).sort());

      // Calculate stats
      const bySeverity: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const activeStatuses = ['open', 'retest', 'validated'];

      let activeTotal = 0;

      formattedVulns.forEach(vuln => {
        const sev = vuln.severity || 'info';
        const status = vuln.status || 'open';
        
        // Count statuses
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Count severity only for active items
        if (activeStatuses.includes(status)) {
          bySeverity[sev] = (bySeverity[sev] || 0) + 1;
          activeTotal++;
        }
      });

      setStats({
        total: activeTotal,
        bySeverity,
        byStatus,
      });
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
      toast({ title: 'Error fetching vulnerabilities', variant: 'destructive', description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchVulnerabilities();
  }, [fetchVulnerabilities]);

  const initiateStatusChange = (ids: string | string[], newStatus: 'open' | 'fixed' | 'accepted' | 'ignored' | 'retest' | 'false_positive' | 'validated') => {
    if (newStatus === 'false_positive' || newStatus === 'ignored' || newStatus === 'accepted') {
      setPendingVulnIds(Array.isArray(ids) ? ids : [ids]);
      setPendingStatus(newStatus);
      setStatusReason('');
      setReasonDialogOpen(true);
    } else {
      performStatusUpdate(Array.isArray(ids) ? ids : [ids], newStatus);
    }
  };

  const performStatusUpdate = async (ids: string[], newStatus: 'open' | 'fixed' | 'accepted' | 'ignored' | 'retest' | 'false_positive' | 'validated', reason?: string) => {
    setBulkUpdating(true);
    try {
      const { error } = await supabase
        .from('vulnerabilities')
        .update({ 
          status: newStatus, 
          status_updated_at: new Date().toISOString(),
          status_reason: reason || null 
        })
        .in('id', ids);

      if (error) throw error;

      toast({ title: `${ids.length > 1 ? `Updated ${ids.length} vulnerabilities` : `Status updated to ${newStatus}`}` });
      setSelectedIds(new Set());
      setReasonDialogOpen(false);
      fetchVulnerabilities();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error updating status', variant: 'destructive' });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleReasonSubmit = () => {
    if (pendingStatus && pendingVulnIds.length > 0) {
      performStatusUpdate(pendingVulnIds, pendingStatus, statusReason);
    }
  };


  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} vulnerabilities? This action cannot be undone.`)) return;

    setBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('vulnerabilities')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({ title: `Deleted ${ids.length} vulnerabilities` });
      setSelectedIds(new Set());
      fetchVulnerabilities();
    } catch (error) {
      console.error('Error deleting vulnerabilities:', error);
      toast({ title: 'Error deleting vulnerabilities', variant: 'destructive' });
    } finally {
      setBulkUpdating(false);
    }
  };

  const filteredVulnerabilities = vulnerabilities.filter(v => {
    if (severityFilter !== 'all' && v.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (toolFilter !== 'all' && v.tool !== toolFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        v.title.toLowerCase().includes(query) || 
        (v.project_name?.toLowerCase().includes(query)) ||
        (v.tool?.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const displayedVulnerabilities = filteredVulnerabilities.slice(0, displayCount);
  const hasMore = displayCount < filteredVulnerabilities.length;

  const toggleSelect = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedVulnerabilities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedVulnerabilities.map(v => v.id)));
    }
  };

  const loadMore = () => {
    setDisplayCount(prev => prev + PAGE_SIZE);
  };

  const getSeverityBadge = (severity: string | null) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      info: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[severity || 'info'] || colors.info;
  };

  const getStatusBadge = (status: string | null) => {
    const colors: Record<string, string> = {
      open: 'bg-red-500/20 text-red-400 border-red-500/30',
      fixed: 'bg-green-500/20 text-green-400 border-green-500/30',
      accepted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      ignored: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      retest: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      false_positive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[status || 'open'] || colors.open;
  };

  const severityData = Object.entries(stats.bySeverity).map(([name, value]) => ({ 
    name: name.charAt(0).toUpperCase() + name.slice(1), 
    value,
    fill: SEVERITY_COLORS[name] || '#6b7280'
  }));

  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({ 
    name: name.charAt(0).toUpperCase() + name.slice(1), 
    value,
    fill: STATUS_COLORS[name] || '#6b7280'
  }));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6 text-warning" />
            {t.ui?.allVulnerabilities || 'All Vulnerabilities'}
          </h1>
          <p className="text-muted-foreground text-sm">{t.ui?.vulnStats || 'Vulnerability Statistics'}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Bug className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{t.report?.total || 'Total'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(stats.bySeverity.critical || 0) + (stats.bySeverity.high || 0)}</p>
                  <p className="text-xs text-muted-foreground">Critical + High</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byStatus.fixed || 0}</p>
                  <p className="text-xs text-muted-foreground">{t.vulnerability?.fixed || 'Fixed'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byStatus.open || 0}</p>
                  <p className="text-xs text-muted-foreground">{t.vulnerability?.open || 'Open'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <CheckCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byStatus.accepted || 0}</p>
                  <p className="text-xs text-muted-foreground">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-500/10">
                  <XCircle className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byStatus.ignored || 0}</p>
                  <p className="text-xs text-muted-foreground">Ignored</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-500/10">
                  <Info className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byStatus.false_positive || 0}</p>
                  <p className="text-xs text-muted-foreground">False Positive</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Shield className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byStatus.validated || 0}</p>
                  <p className="text-xs text-muted-foreground">Validated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Severity Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.report?.severityDistribution || 'Severity Distribution'}</CardTitle>
            </CardHeader>
            <CardContent>
              {severityData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No vulnerabilities
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.vulnerability?.status || 'Status'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Bulk Actions */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2 text-muted-foreground" />
              <Input 
                className="pl-8 h-8 w-[200px]" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue placeholder={t.ui?.filterBySeverity || 'Severity'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.ui?.all || 'All'}</SelectItem>
                  <SelectItem value="critical">{t.vulnerability?.critical || 'Critical'}</SelectItem>
                  <SelectItem value="high">{t.vulnerability?.high || 'High'}</SelectItem>
                  <SelectItem value="medium">{t.vulnerability?.medium || 'Medium'}</SelectItem>
                  <SelectItem value="low">{t.vulnerability?.low || 'Low'}</SelectItem>
                  <SelectItem value="info">{t.vulnerability?.informational || 'Info'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue placeholder={t.ui?.filterByStatus || 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.ui?.all || 'All'}</SelectItem>
                <SelectItem value="open">{t.vulnerability?.open || 'Open'}</SelectItem>
                <SelectItem value="fixed">{t.vulnerability?.fixed || 'Fixed'}</SelectItem>
                <SelectItem value="accepted">{t.vulnerability?.accepted || 'Accepted'}</SelectItem>
                <SelectItem value="ignored">{t.vulnerability?.ignored || 'Ignored'}</SelectItem>
                <SelectItem value="false_positive">{t.ui?.falsePositive || 'False Positive'}</SelectItem>
                <SelectItem value="retest">{t.ui?.retest || 'Retest'}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={toolFilter} onValueChange={setToolFilter}>
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue placeholder="Tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tools</SelectItem>
                {availableTools.map(tool => (
                  <SelectItem key={tool} value={tool}>{tool}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} {t.ui?.selected || 'selected'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => initiateStatusChange(Array.from(selectedIds), 'fixed')}
                disabled={bulkUpdating}
                className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                {t.ui?.markAsFixed || 'Fixed'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => initiateStatusChange(Array.from(selectedIds), 'false_positive')}
                disabled={bulkUpdating}
                className="text-gray-500 hover:text-gray-400 hover:bg-gray-500/10"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                {t.ui?.markAsFalsePositive || 'False Positive'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => initiateStatusChange(Array.from(selectedIds), 'accepted')}
                disabled={bulkUpdating}
              >
                {t.vulnerability?.accepted || 'Accept Risk'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={bulkUpdating}
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                {t.common?.close || 'Clear'}
              </Button>
            </div>
          )}
        </div>

        {/* Vulnerabilities List with Quick Validation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t.ui?.quickValidation || 'Quick Validation'} ({filteredVulnerabilities.length})
              </div>
              {displayedVulnerabilities.length > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-6 text-xs">
                  {selectedIds.size === displayedVulnerabilities.length ? (
                    <>{t.ui?.deselectAll || 'Deselect All'}</>
                  ) : (
                    <>{t.ui?.selectAll || 'Select All'}</>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayedVulnerabilities.length > 0 ? (
              <div className="space-y-2">
                {displayedVulnerabilities.map((vuln) => (
                  <div
                    key={vuln.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedIds.has(vuln.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setViewingVulnId(vuln.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Checkbox
                        checked={selectedIds.has(vuln.id)}
                        onCheckedChange={() => toggleSelect(vuln.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{vuln.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{vuln.project_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${getSeverityBadge(vuln.severity)}`}>
                        {vuln.severity || 'info'}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${getStatusBadge(vuln.status)}`}>
                        {vuln.status || 'open'}
                      </Badge>
                      {vuln.tool && (
                        <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-500 border-slate-500/20">
                          {vuln.tool}
                        </Badge>
                      )}
                      {vuln.cvss_score && (
                        <span className="text-xs font-mono text-muted-foreground">{vuln.cvss_score.toFixed(1)}</span>
                      )}
                      {vuln.status_reason && (
                        <div className="group relative" onClick={(e) => e.stopPropagation()}>
                           <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                           <div className="absolute right-0 top-6 w-48 p-2 bg-popover text-popover-foreground text-xs rounded border shadow-md z-10 hidden group-hover:block">
                             {vuln.status_reason}
                           </div>
                        </div>
                      )}
                      {vuln.status === 'open' && (
                        <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            onClick={(e) => { e.stopPropagation(); initiateStatusChange(vuln.id, 'validated'); }}
                            title={t.ui?.markAsValidated || 'Mark as Validated'}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-gray-500 hover:text-gray-400 hover:bg-gray-500/10"
                            onClick={(e) => { e.stopPropagation(); initiateStatusChange(vuln.id, 'false_positive'); }}
                            title={t.ui?.markAsFalsePositive || 'Mark as False Positive'}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="pt-4 flex justify-center">
                    <Button variant="outline" onClick={loadMore} className="w-full max-w-xs">
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {t.ui?.loadMore || 'Load More'} ({filteredVulnerabilities.length - displayCount} {t.ui?.remaining || 'remaining'})
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bug className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No vulnerabilities found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.ui?.statusReason || 'Status Change Reason'}</DialogTitle>
            <DialogDescription>
              {t.ui?.statusReasonDesc || 'Please provide a reason for changing the status.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.common?.reason || 'Reason'}</Label>
              <Textarea 
                value={statusReason} 
                onChange={(e) => setStatusReason(e.target.value)} 
                placeholder="Enter justification..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
              {t.common?.cancel || 'Cancel'}
            </Button>
            <Button onClick={handleReasonSubmit} disabled={!statusReason.trim()}>
              {t.common?.confirm || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingVulnId} onOpenChange={(open) => !open && setViewingVulnId(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
           {viewingVulnId && <VulnerabilityViewer vulnerabilityId={viewingVulnId} onRefresh={() => { fetchVulnerabilities(); }} />}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
