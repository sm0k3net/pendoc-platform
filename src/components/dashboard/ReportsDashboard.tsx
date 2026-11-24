import { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Loader2, BarChart3, PieChart, Clock, Sparkles, GitCompare, Search, CheckCircle, ExternalLink, Archive, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface Report {
  id: string;
  name: string;
  project_id: string;
  report_type: string | null;
  created_at: string;
  file_size: number | null;
  project_name?: string;
  html_content?: string;
  is_archived?: boolean;
  client_visible?: boolean;
}

interface ReportStats {
  total: number;
  thisMonth: number;
  byType: Record<string, number>;
}

interface GapAnalysisData {
  htmlReport: string;
  reportName: string;
  generatedAt: string;
}

interface AnalysisResult {
  type: 'gap' | 'comparison';
  results: string;
  htmlReport: string;
  reportName?: string;
  report1Name?: string;
  report2Name?: string;
  loading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function ReportsDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats>({ total: 0, thisMonth: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  
  // AI Analysis state
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [selectedReport1, setSelectedReport1] = useState<string>('');
  const [selectedReport2, setSelectedReport2] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Per-report gap analysis storage
  const [gapAnalysisCache, setGapAnalysisCache] = useState<Record<string, GapAnalysisData>>({});
  const [activeGapReportId, setActiveGapReportId] = useState<string | null>(null);
  const [showGapResultDialog, setShowGapResultDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchReports();
      setGapAnalysisCache({});
    }
    localStorage.removeItem('pendoc_gap_analysis_cache');
  }, [user?.id]);

  const handleArchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_reports')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Report archived' });
      fetchReports();
    } catch (error) {
      toast({ title: 'Error archiving report', variant: 'destructive' });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_reports')
        .update({ is_archived: false })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Report restored' });
      fetchReports();
    } catch (error) {
      toast({ title: 'Error restoring report', variant: 'destructive' });
    }
  };

  const handleDownloadReport = (htmlContent: string, name: string) => {
    downloadHtmlReport(htmlContent, name);
  };

  const handleToggleClientVisibility = async (id: string, clientVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('project_reports')
        .update({ client_visible: clientVisible })
        .eq('id', id);

      if (error) throw error;

      setReports((current) => current.map((report) => (
        report.id === id ? { ...report, client_visible: clientVisible } : report
      )));
      toast({ title: clientVisible ? 'Report shared with client portal' : 'Report hidden from client portal' });
    } catch (error) {
      console.error('Error updating client visibility:', error);
      toast({ title: 'Error updating report visibility', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this report? This action cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('project_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Report permanently deleted' });
      fetchReports();
    } catch (error) {
      toast({ title: 'Error deleting report', variant: 'destructive' });
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error } = await supabase
        .from('project_reports')
        .select(`
          id,
          name,
          project_id,
          report_type,
          created_at,
          file_size,
          is_archived,
          client_visible,
          html_content,
          projects!inner(name, user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReports = (reportsData || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        project_id: r.project_id,
        report_type: r.report_type,
        created_at: r.created_at,
        file_size: r.file_size,
        is_archived: r.is_archived,
        client_visible: r.client_visible,
        html_content: r.html_content,
        project_name: r.projects?.name,
      }));

      setReports(formattedReports);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const byType: Record<string, number> = {};
      let thisMonth = 0;

      formattedReports.forEach(report => {
        const type = report.report_type || 'general';
        byType[type] = (byType[type] || 0) + 1;
        
        if (new Date(report.created_at) >= startOfMonth) {
          thisMonth++;
        }
      });

      setStats({
        total: formattedReports.length,
        thisMonth,
        byType,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const runGapAnalysis = async (reportId: string) => {
    if (!reportId) {
      toast({ title: 'Please select a report', variant: 'destructive' });
      return;
    }

    setAnalyzing(true);
    setActiveGapReportId(reportId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      // Use GET request with URL params only - avoids body stream issues on Edge Functions
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;
      
      const url = `${supabaseUrl}/functions/v1/ai-report-analysis?action=gap-analysis&reportId=${encodeURIComponent(reportId)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...(supabaseAnonKey ? { 'apikey': supabaseAnonKey } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Store gap analysis for this specific report
      const gapData: GapAnalysisData = {
        htmlReport: data.htmlReport || '',
        reportName: data.reportName || '',
        generatedAt: new Date().toISOString(),
      };

      const newCache = { ...gapAnalysisCache, [reportId]: gapData };
      setGapAnalysisCache(newCache);
      
      toast({ title: t.ui?.gapAnalysisComplete || 'Gap analysis complete' });
    } catch (error) {
      console.error('Gap analysis error:', error);
      toast({ title: error instanceof Error ? error.message : 'Gap analysis failed', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const viewGapAnalysis = (reportId: string) => {
    setActiveGapReportId(reportId);
    setShowGapResultDialog(true);
  };

  const compareReports = async () => {
    if (!selectedReport1 || !selectedReport2) {
      toast({ title: 'Please select two reports to compare', variant: 'destructive' });
      return;
    }

    if (selectedReport1 === selectedReport2) {
      toast({ title: 'Please select different reports', variant: 'destructive' });
      return;
    }

    setAnalyzing(true);
    setAnalysisResult({ type: 'comparison', results: '', htmlReport: '', loading: true });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      // Use GET request with URL params only - avoids body stream issues on Edge Functions
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;
      
      const url = `${supabaseUrl}/functions/v1/ai-report-analysis?action=compare&reportId1=${encodeURIComponent(selectedReport1)}&reportId2=${encodeURIComponent(selectedReport2)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...(supabaseAnonKey ? { 'apikey': supabaseAnonKey } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setAnalysisResult({
        type: 'comparison',
        results: data.analysis || 'No results',
        htmlReport: data.htmlReport || '',
        report1Name: data.report1Name,
        report2Name: data.report2Name,
        loading: false
      });
      
      toast({ title: t.ui?.comparisonComplete || 'Comparison complete' });
    } catch (error) {
      console.error('Comparison error:', error);
      toast({ title: error instanceof Error ? error.message : 'Comparison failed', variant: 'destructive' });
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadHtmlReport = (htmlContent: string, filename: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openHtmlReport = (htmlContent: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getTypeColor = (type: string | null) => {
    const colors: Record<string, string> = {
      pentest: 'bg-red-500/20 text-red-400 border-red-500/30',
      vulnerability: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      general: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return colors[type || 'general'] || colors.general;
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesFilters = (report: Report) => {
    const matchesSearch = !normalizedQuery || [report.name, report.project_name, report.report_type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    const matchesType = typeFilter === 'all' || (report.report_type || 'general') === typeFilter;
    return matchesSearch && matchesType;
  };

  const activeReports = reports.filter(r => !r.is_archived);
  const archivedReports = reports.filter(r => r.is_archived);
  const filteredActiveReports = activeReports.filter(matchesFilters);
  const filteredArchivedReports = archivedReports.filter(matchesFilters);
  const reportTypes = Array.from(new Set(reports.map((report) => report.report_type || 'general')));

  const pieData = Object.entries(stats.byType).map(([name, value]) => ({ name, value }));

  const getMonthlyData = () => {
    const months: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      months[key] = 0;
    }

    reports.forEach(report => {
      const date = new Date(report.created_at);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      if (months[key] !== undefined) {
        months[key]++;
      }
    });

    return Object.entries(months).map(([month, count]) => ({ month, count }));
  };

  const hasGapAnalysis = (reportId: string) => !!gapAnalysisCache[reportId];

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {t.ui?.reports || 'Reports'}
            </h1>
            <p className="text-muted-foreground text-sm">{t.ui?.reportsStats || 'Reports Statistics'}</p>
          </div>

          {/* AI Actions */}
          <div className="flex items-center gap-2">
            {/* Compare Reports Dialog */}
            <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <GitCompare className="h-4 w-4 mr-2" />
                  {t.ui?.aiComparison || 'AI Comparison'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <GitCompare className="h-5 w-5 text-primary" />
                    {t.ui?.compareReports || 'Compare Reports'}
                  </DialogTitle>
                  <DialogDescription>
                    {t.ui?.selectReportsToCompare || 'Select two reports to compare their differences'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t.ui?.selectReport || 'Report 1'}</label>
                      <Select value={selectedReport1} onValueChange={setSelectedReport1}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report..." />
                        </SelectTrigger>
                        <SelectContent>
                          {reports.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t.ui?.selectReport || 'Report 2'}</label>
                      <Select value={selectedReport2} onValueChange={setSelectedReport2}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report..." />
                        </SelectTrigger>
                        <SelectContent>
                          {reports.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={compareReports} 
                    disabled={analyzing || !selectedReport1 || !selectedReport2}
                    className="w-full"
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {analyzing ? (t.ui?.analyzing || 'Analyzing...') : (t.ui?.compareReports || 'Compare Reports')}
                  </Button>

                  {analysisResult?.type === 'comparison' && !analysisResult.loading && (
                    <Card className="mt-4">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm">{t.ui?.comparisonResults || 'Comparison Results'}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadHtmlReport(
                            analysisResult.htmlReport,
                            `comparison-${analysisResult.report1Name}-vs-${analysisResult.report2Name}`
                          )}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download HTML
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="rounded-lg border border-border overflow-hidden"
                          style={{ height: '400px' }}
                        >
                          <iframe
                            srcDoc={analysisResult.htmlReport}
                            className="w-full h-full border-0"
                            title="Comparison Report"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{t.ui?.totalReports || 'Total Reports'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                  <p className="text-xs text-muted-foreground">{t.ui?.thisMonth || 'This Month'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <PieChart className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(stats.byType).length}</p>
                  <p className="text-xs text-muted-foreground">{t.ui?.byType || 'By Type'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.ui?.byType || 'By Type'}</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  {t.ui?.noReports || 'No reports found'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t.ui?.thisMonth || 'Monthly'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyData()}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/40">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reports by name, project, or type"
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All report types</SelectItem>
                  {reportTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground md:text-right">
                {filteredActiveReports.length} active • {filteredArchivedReports.length} archived
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports List with AI Gap Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t.ui?.recentReports || 'Recent Reports'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredActiveReports.length > 0 ? (
              <div className="space-y-2">
                {filteredActiveReports.slice(0, 10).map((report) => {
                  const hasAnalysis = hasGapAnalysis(report.id);
                  const isAnalyzingThis = analyzing && activeGapReportId === report.id;
                  
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{report.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                  <span className="truncate">{report.project_name}</span>
                                  {report.client_visible ? (
                                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                                      Client portal: On
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] border-muted-foreground/20 text-muted-foreground">
                                      Client portal: Off
                                    </Badge>
                                  )}
                                </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1">
                                <span className="text-[10px] text-muted-foreground">Client portal</span>
                                <Switch
                                  checked={report.client_visible === true}
                                  onCheckedChange={(checked) => handleToggleClientVisibility(report.id, checked)}
                                  aria-label={`Toggle client visibility for ${report.name}`}
                                />
                              </div>
                        <Badge variant="outline" className={`text-[10px] ${getTypeColor(report.report_type)}`}>
                          {report.report_type || 'general'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                        <span className="text-xs text-muted-foreground">{formatSize(report.file_size)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openHtmlReport(report.html_content || '')}
                          disabled={!report.html_content}
                          title="Preview Report"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleDownloadReport(report.html_content || '', report.name)}
                          disabled={!report.html_content}
                          title="Download HTML"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openHtmlReport(report.html_content || '')}
                          disabled={!report.html_content}
                          title="Open in New Tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        
                        {/* Gap Analysis Button - changes based on whether analysis exists */}
                        {hasAnalysis ? (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-7 px-3 bg-green-600 hover:bg-green-700"
                            onClick={() => viewGapAnalysis(report.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Gap Analysis Report</span>
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-3"
                            onClick={() => runGapAnalysis(report.id)}
                            disabled={isAnalyzingThis}
                          >
                            {isAnalyzingThis ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Search className="h-3.5 w-3.5 mr-1" />
                            )}
                            <span className="text-xs">
                              {isAnalyzingThis ? 'Analyzing...' : 'AI Gap Analysis'}
                            </span>
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleArchive(report.id)}
                          title="Archive Report"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{searchQuery || typeFilter !== 'all' ? 'No reports match the current filters' : (t.ui?.noReports || 'No reports found')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Archived Reports */}
        {archivedReports.length > 0 && (
          <Card className="mt-6 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Archive className="h-4 w-4" />
                {t.ui?.archivedReports || 'Archived Reports'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredArchivedReports.slice(0, 10).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors opacity-80"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-muted-foreground">{report.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                          <span className="truncate">{report.project_name}</span>
                          {report.client_visible ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                              Client portal: On
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-muted-foreground/20 text-muted-foreground">
                              Client portal: Off
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1">
                        <span className="text-[10px] text-muted-foreground">Client portal</span>
                        <Switch
                          checked={report.client_visible === true}
                          onCheckedChange={(checked) => handleToggleClientVisibility(report.id, checked)}
                          aria-label={`Toggle client visibility for ${report.name}`}
                        />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/20">
                        {report.report_type || 'general'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => openHtmlReport(report.html_content || '')}
                        disabled={!report.html_content}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleDownloadReport(report.html_content || '', report.name)}
                        disabled={!report.html_content}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleRestore(report.id)}
                        title="Restore"
                      >
                       <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(report.id)}
                        title="Delete Permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

        {/* Gap Analysis Result Dialog */}
        <Dialog open={showGapResultDialog} onOpenChange={setShowGapResultDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Gap Analysis Report
              </DialogTitle>
              {activeGapReportId && gapAnalysisCache[activeGapReportId] && (
                <DialogDescription>
                  Report: {gapAnalysisCache[activeGapReportId].reportName} | 
                  Generated: {formatDate(gapAnalysisCache[activeGapReportId].generatedAt)}
                </DialogDescription>
              )}
            </DialogHeader>
            {activeGapReportId && gapAnalysisCache[activeGapReportId] && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadHtmlReport(
                      gapAnalysisCache[activeGapReportId].htmlReport,
                      `gap-analysis-${gapAnalysisCache[activeGapReportId].reportName}`
                    )}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download HTML
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      runGapAnalysis(activeGapReportId);
                    }}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Regenerate
                  </Button>
                </div>
                <div 
                  className="rounded-lg border border-border overflow-hidden"
                  style={{ height: '600px' }}
                >
                  <iframe
                    srcDoc={gapAnalysisCache[activeGapReportId].htmlReport}
                    className="w-full h-full border-0"
                    title="Gap Analysis Report"
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
