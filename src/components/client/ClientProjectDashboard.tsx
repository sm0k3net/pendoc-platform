import { useState, useEffect, useCallback } from 'react';
import { Shield, Bug, FileText, CheckCircle, Clock, RefreshCw, MessageSquare, Calendar, Activity, Package, Target, Wrench, Lightbulb, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ClientSelectedItem } from '@/pages/ClientDashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

interface ClientProjectDashboardProps {
  projectId: string;
  projectName: string;
  onSelectItem: (item: ClientSelectedItem) => void;
}

interface VulnStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface StatusStats {
  open: number;
  fixed: number;
  accepted: number;
  ignored: number;
}

interface RetestStats {
  waiting: number;
  completed: number;
  no_retest: number;
}

interface ProjectDetails {
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface LatestComment {
  id: string;
  content: string;
  created_at: string;
  vulnerability_id: string;
  vulnerability_title: string;
}

interface ArtifactStats {
  total: number;
  attack_vector: number;
  remediation_strategy: number;
  recommendations: number;
}

interface SharedDeliverable {
  id: string;
  type: 'project_report' | 'artifact';
  label: string;
  updated_at: string;
  artifactType?: 'attack_vector' | 'remediation_strategy' | 'recommendations';
}

export function ClientProjectDashboard({ projectId, projectName, onSelectItem }: ClientProjectDashboardProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [vulnStats, setVulnStats] = useState<VulnStats>({ total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  const [statusStats, setStatusStats] = useState<StatusStats>({ open: 0, fixed: 0, accepted: 0, ignored: 0 });
  const [retestStats, setRetestStats] = useState<RetestStats>({ waiting: 0, completed: 0, no_retest: 0 });
  const [reportCount, setReportCount] = useState(0);
  const [artifactStats, setArtifactStats] = useState<ArtifactStats>({ total: 0, attack_vector: 0, remediation_strategy: 0, recommendations: 0 });
  const [sharedDeliverables, setSharedDeliverables] = useState<SharedDeliverable[]>([]);
  const [latestComments, setLatestComments] = useState<LatestComment[]>([]);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('description, start_date, end_date')
        .eq('id', projectId)
        .maybeSingle();

      if (!projectError && projectData) {
        setProject(projectData);
      }

      // Fetch vulnerability statistics
      const { data: vulns, error: vulnsError } = await supabase
        .from('vulnerabilities')
        .select('severity, status, retest_status')
        .eq('project_id', projectId);

      if (!vulnsError && vulns) {
        // Filter for open/active vulnerabilities only for severity stats
        const openVulns = vulns.filter(v => !v.status || ['open', 'retest', 'validated'].includes(v.status));
        const sevStats: VulnStats = { total: openVulns.length, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        const statStats: StatusStats = { open: 0, fixed: 0, accepted: 0, ignored: 0 };
        const retStats: RetestStats = { waiting: 0, completed: 0, no_retest: 0 };
        
        vulns.forEach(v => {
          const status = v.status || 'open';
          if (status in statStats) {
            statStats[status as keyof StatusStats]++;
          }
          const retest = v.retest_status || 'no_retest';
          if (retest in retStats) {
            retStats[retest as keyof RetestStats]++;
          }
        });
        
        // Count severity only for open vulnerabilities
        openVulns.forEach(v => {
          if (v.severity in sevStats) {
            sevStats[v.severity as keyof Omit<VulnStats, 'total'>]++;
          }
        });
        
        setVulnStats(sevStats);
        setStatusStats(statStats);
        setRetestStats(retStats);
      }

      // Fetch report counts and shared deliverables
      const [
        { count: rawCount, error: reportsError },
        { count: generatedCount, error: generatedError },
        { data: sharedReports, error: sharedReportsError },
        { data: attackVector, error: attackVectorError },
        { data: remediationStrategy, error: remediationError },
        { data: recommendations, error: recommendationsError },
      ] = await Promise.all([
        supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('file_type', 'report'),
        supabase
          .from('project_reports')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('client_visible', true),
        supabase
          .from('project_reports')
          .select('id, name, created_at')
          .eq('project_id', projectId)
          .eq('client_visible', true)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('attack_vectors')
          .select('id, updated_at')
          .eq('project_id', projectId)
          .eq('client_visible', true)
          .maybeSingle(),
        supabase
          .from('remediation_strategies')
          .select('id, updated_at')
          .eq('project_id', projectId)
          .eq('client_visible', true)
          .maybeSingle(),
        supabase
          .from('recommendations')
          .select('id, updated_at')
          .eq('project_id', projectId)
          .eq('client_visible', true)
          .maybeSingle(),
      ]);

      if (!reportsError && !generatedError) {
        setReportCount((rawCount || 0) + (generatedCount || 0));
      }

      if (!sharedReportsError && !attackVectorError && !remediationError && !recommendationsError) {
        const nextArtifactStats: ArtifactStats = {
          total: 0,
          attack_vector: attackVector ? 1 : 0,
          remediation_strategy: remediationStrategy ? 1 : 0,
          recommendations: recommendations ? 1 : 0,
        };
        nextArtifactStats.total = nextArtifactStats.attack_vector + nextArtifactStats.remediation_strategy + nextArtifactStats.recommendations;
        setArtifactStats(nextArtifactStats);

        const deliverables: SharedDeliverable[] = [
          ...((sharedReports || []).map((item) => ({
            id: item.id,
            type: 'project_report' as const,
            label: item.name,
            updated_at: item.created_at,
          }))),
          ...(attackVector ? [{ id: attackVector.id, type: 'artifact' as const, label: 'Attack Vector Analysis', updated_at: attackVector.updated_at, artifactType: 'attack_vector' as const }] : []),
          ...(remediationStrategy ? [{ id: remediationStrategy.id, type: 'artifact' as const, label: 'Remediation Strategy', updated_at: remediationStrategy.updated_at, artifactType: 'remediation_strategy' as const }] : []),
          ...(recommendations ? [{ id: recommendations.id, type: 'artifact' as const, label: 'Recommendations', updated_at: recommendations.updated_at, artifactType: 'recommendations' as const }] : []),
        ]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5);

        setSharedDeliverables(deliverables);
      }

      // Fetch latest comments
      const { data: comments, error: commentsError } = await supabase
        .from('vulnerability_comments')
        .select('id, content, created_at, vulnerability_id, vulnerabilities!inner(title, project_id)')
        .eq('vulnerabilities.project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!commentsError && comments) {
        const mapped = comments.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          vulnerability_id: comment.vulnerability_id,
          vulnerability_title: comment.vulnerabilities?.title || 'Vulnerability',
        }));
        setLatestComments(mapped);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  if (loading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-52 rounded-lg" />
          </div>
        </div>
      </ScrollArea>
    );
  }

  const sevChartData = SEVERITY_ORDER.map(sev => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: vulnStats[sev],
    color: SEVERITY_COLORS[sev],
  })).filter(d => d.value > 0);

  const totalAllStatuses = statusStats.open + statusStats.fixed + statusStats.accepted + statusStats.ignored;
  const remediationPct = totalAllStatuses > 0 ? Math.round(((statusStats.fixed + statusStats.accepted) / totalAllStatuses) * 100) : 0;
  const openCriticalHigh = vulnStats.critical + vulnStats.high;

  const getDeliverableIcon = (deliverable: SharedDeliverable) => {
    if (deliverable.type === 'project_report') return <FileText className="h-4 w-4 text-cyan-500" />;
    if (deliverable.artifactType === 'attack_vector') return <Target className="h-4 w-4 text-red-400" />;
    if (deliverable.artifactType === 'remediation_strategy') return <Wrench className="h-4 w-4 text-blue-400" />;
    return <Lightbulb className="h-4 w-4 text-yellow-400" />;
  };

  const openDeliverable = (deliverable: SharedDeliverable) => {
    if (deliverable.type === 'project_report') {
      onSelectItem({ type: 'project_report', id: deliverable.id, name: deliverable.label, projectId });
      return;
    }

    onSelectItem({
      type: 'artifact',
      id: deliverable.id,
      name: deliverable.label,
      projectId,
      artifactType: deliverable.artifactType,
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {projectName}
          </h1>
          {project?.description && (
            <p className="text-muted-foreground mt-1 text-sm">{project.description}</p>
          )}
          {(project?.start_date || project?.end_date) && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t.clientPortal.projectStart}: {project.start_date ? format(new Date(project.start_date), 'PPP') : 'N/A'}</span>
              </div>
              <span>→</span>
              <span>{t.clientPortal.projectEnd}: {project.end_date ? format(new Date(project.end_date), 'PPP') : 'N/A'}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
          <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bug className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums">{vulnStats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.clientPortal.openVulnerabilities}</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md hover:border-red-500/30 transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums text-red-500">{openCriticalHigh}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Critical + high open</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md hover:border-green-500/30 transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums text-green-500">{statusStats.fixed}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.clientPortal.fixed}</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md hover:border-orange-500/30 transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums text-orange-500">{statusStats.open}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.clientPortal.openStatus}</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md hover:border-cyan-500/30 transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-cyan-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums">{reportCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.clientPortal.reports}</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md hover:border-purple-500/30 transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-purple-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums">{artifactStats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Shared artifacts</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row: Severity + Remediation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Severity Donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {t.clientPortal.severityDistribution}
              </CardTitle>
              <CardDescription>{t.clientPortal.openBySeverity}</CardDescription>
            </CardHeader>
            <CardContent>
              {sevChartData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sevChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {sevChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {SEVERITY_ORDER.map(sev => {
                      const count = vulnStats[sev];
                      if (count === 0) return null;
                      return (
                        <div key={sev} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                            <span className="capitalize text-muted-foreground text-xs">{sev}</span>
                          </div>
                          <span className="font-semibold tabular-nums text-xs">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>{t.clientPortal.noOpenVulnerabilities}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Remediation Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                {t.clientPortal.remediationProgress}
              </CardTitle>
              <CardDescription>{t.clientPortal.fixedVsTotal}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] flex-shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: statusStats.fixed + statusStats.accepted, color: '#22c55e' },
                          { value: statusStats.open + (totalAllStatuses === 0 ? 1 : 0), color: 'hsl(var(--muted))' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="85%"
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-bold">{remediationPct}%</div>
                      <div className="text-[10px] text-muted-foreground">{t.clientPortal.resolved}</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { label: t.clientPortal.openStatus, count: statusStats.open, color: 'bg-orange-500' },
                    { label: t.clientPortal.fixed, count: statusStats.fixed, color: 'bg-green-500' },
                    { label: t.clientPortal.accepted, count: statusStats.accepted, color: 'bg-blue-500' },
                    { label: t.clientPortal.ignored, count: statusStats.ignored, color: 'bg-gray-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.color}`} />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Retest & Comments Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                {t.clientPortal.retestStatus}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: t.clientPortal.waiting, count: retestStats.waiting, color: 'bg-orange-500' },
                  { label: t.clientPortal.retestCompleted, count: retestStats.completed, color: 'bg-green-500' },
                  { label: t.clientPortal.noRetest, count: retestStats.no_retest, color: 'bg-gray-400' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-semibold text-xs tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                {t.clientPortal.latestComments}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {latestComments.map((comment) => (
                  <button
                    key={comment.id}
                    onClick={() => onSelectItem({ type: 'vulnerability', id: comment.vulnerability_id, name: comment.vulnerability_title, projectId })}
                    className="w-full text-left p-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium line-clamp-1">{comment.vulnerability_title}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(comment.created_at), 'MMM d')}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                      {comment.content}
                    </p>
                  </button>
                ))}
                {latestComments.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">{t.clientPortal.noComments}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Shared deliverables
              </CardTitle>
              <CardDescription>Reports and artifacts currently available in the client portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Reports</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{reportCount}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Attack vector</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{artifactStats.attack_vector}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Strategy + recs</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{artifactStats.remediation_strategy + artifactStats.recommendations}</p>
                </div>
              </div>

              <div className="space-y-2">
                {sharedDeliverables.length > 0 ? sharedDeliverables.map((deliverable) => (
                  <button
                    key={`${deliverable.type}-${deliverable.id}`}
                    onClick={() => openDeliverable(deliverable)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 text-left transition-all hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/30">
                      {getDeliverableIcon(deliverable)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{deliverable.label}</p>
                      <p className="text-[11px] text-muted-foreground">Updated {format(new Date(deliverable.updated_at), 'PPP')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
                  </button>
                )) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                    No shared reports or artifacts are available for this project yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Engagement snapshot
              </CardTitle>
              <CardDescription>High-level view of active risk and remediation readiness.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-xs uppercase tracking-wide text-red-500">Priority exposure</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {openCriticalHigh > 0
                    ? `${openCriticalHigh} critical/high findings remain open and should stay at the top of the remediation queue.`
                    : 'No critical or high open findings remain in this project.'}
                </p>
              </div>
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-xs uppercase tracking-wide text-green-500">Remediation progress</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {remediationPct}% of tracked findings are fixed or accepted. Use the shared reports and artifacts to align follow-up actions.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-500">Client-ready outputs</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reportCount + artifactStats.total} deliverable{reportCount + artifactStats.total !== 1 ? 's are' : ' is'} available in the portal for this project.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
