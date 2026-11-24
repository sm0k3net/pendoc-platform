import { materializeNoteImages } from '@/lib/noteImages';
import { standaloneReport } from '@/lib/sanitize';
import { useState, useEffect, useCallback } from 'react';
import { Shield, Bug, FileText, Download, Loader2, Building2, FolderOpen, BarChart3, AlertTriangle, Target, Wrench, Lightbulb, Bell, Clock, Maximize2, Zap, TrendingUp, ChevronRight, Activity, ShieldCheck, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHtml } from '@/lib/sanitize';
import { ClientSelectedItem } from '@/pages/ClientDashboard';
import { ClientProjectDashboard } from './ClientProjectDashboard';
import { ClientVulnerabilityViewer } from './ClientVulnerabilityViewer';
import { ClientVulnerabilitiesDashboard } from './ClientVulnerabilitiesDashboard';
import { format, formatDistanceToNow } from 'date-fns';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

interface ClientProject {
  id: string;
  name: string;
  description: string | null;
}

interface ClientMainContentProps {
  selectedItem: ClientSelectedItem;
  clientId: string;
  clientName: string;
  clientInfo: any;
  projects: ClientProject[];
  notifications: Array<{ id: string; notification_type: string; message: string | null; vulnerability_id: string | null; project_id: string; is_read: boolean; created_at: string }>;
  onSelectItem: (item: ClientSelectedItem) => void;
}

interface FileData {
  id: string;
  name: string;
  content: string | null;
  storage_path: string | null;
  created_at: string;
}

interface ProjectReportData {
  id: string;
  name: string;
  html_content: string;
  created_at: string;
}

interface ClientAttackTimelinePhase {
  phase: string;
  mitreId?: string;
  duration?: string;
  description?: string;
  vulnerabilities?: string[];
  techniques?: string[];
  actions?: string[];
  tools?: string[];
}

interface ClientMitreMapping {
  vulnerability: string;
  tacticId: string;
  tacticName: string;
  techniqueId: string;
  techniqueName: string;
  techniqueUrl?: string;
  subTechnique?: string | null;
  subTechniqueUrl?: string | null;
  explanation: string;
  confidence?: number;
  evidence?: string;
  detection?: string;
  mitigation?: string;
  dataSources?: string[];
  platforms?: string[];
}

interface ClientSupplementaryDiagrams {
  architectureSchema?: string | null;
  accessSchema?: string | null;
  securityFindingsSchema?: string | null;
}

interface ClientRemediationItem {
  priority?: number;
  title?: string;
  severity?: string;
  effort?: string;
  timeline?: string;
  description?: string;
  steps?: string[];
  dependencies?: string[];
}

interface ClientLongTermGoal {
  goal?: string;
  category?: string;
  timeframe?: string;
  description?: string;
  benefits?: string[];
  implementation_steps?: string[];
}

const defaultClientSupplementaryDiagrams: ClientSupplementaryDiagrams = {
  architectureSchema: null,
  accessSchema: null,
  securityFindingsSchema: null,
};

function parseNestedJson(value: unknown, depth = 0): unknown {
  if (depth > 3 || typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return parseNestedJson(JSON.parse(trimmed), depth + 1);
    } catch {
      return value;
    }
  }

  return value;
}

function normalizeStringArray(value: unknown): string[] {
  const parsed = parseNestedJson(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter(Boolean);
}

function sanitizeMermaidNodeLabel(value: string | undefined | null, maxLength = 34) {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/[\[\]{}<>|#]/g, '')
    .replace(/"/g, "'")
    .replace(/[:;]/g, '-')
    .trim()
    .slice(0, maxLength);
}

function buildClientRemediationDiagram(
  items: ClientRemediationItem[],
  quickWins: string[],
  longTermGoals: Array<string | ClientLongTermGoal>,
) {
  const lines: string[] = ['flowchart LR', 'A["Remediation Program"]'];

  const normalizedQuickWins = quickWins.slice(0, 3);
  if (normalizedQuickWins.length > 0) {
    lines.push('B["Quick Wins"]');
    lines.push('A --> B');
    normalizedQuickWins.forEach((item, index) => {
      const nodeId = `Q${index + 1}`;
      lines.push(`${nodeId}["${sanitizeMermaidNodeLabel(item)}"]`);
      lines.push(`B --> ${nodeId}`);
    });
  }

  const timelineMap = new Map<string, ClientRemediationItem[]>();
  [...items]
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
    .forEach((item) => {
      const key = item.timeline?.trim() || 'Planned Workstream';
      if (!timelineMap.has(key)) timelineMap.set(key, []);
      timelineMap.get(key)?.push(item);
    });

  Array.from(timelineMap.entries()).slice(0, 4).forEach(([timeline, group], index) => {
    const phaseId = `P${index + 1}`;
    lines.push(`${phaseId}["${sanitizeMermaidNodeLabel(`Phase ${index + 1} - ${timeline}`, 38)}"]`);
    lines.push(`A --> ${phaseId}`);

    group.slice(0, 3).forEach((item, itemIndex) => {
      const itemId = `${phaseId}I${itemIndex + 1}`;
      lines.push(`${itemId}["${sanitizeMermaidNodeLabel(item.title || `Item ${itemIndex + 1}`)}"]`);
      lines.push(`${phaseId} --> ${itemId}`);
    });
  });

  const goals = longTermGoals
    .map((goal) => typeof goal === 'string' ? goal : goal.goal || '')
    .filter(Boolean)
    .slice(0, 3);

  if (goals.length > 0) {
    lines.push('Z["Strategic Outcomes"]');
    lines.push('A --> Z');
    goals.forEach((goal, index) => {
      const goalId = `G${index + 1}`;
      lines.push(`${goalId}["${sanitizeMermaidNodeLabel(goal)}"]`);
      lines.push(`Z --> ${goalId}`);
    });
  }

  lines.push('style A fill:#0f172a,stroke:#111827,color:#ffffff');
  lines.push('style B fill:#10b981,stroke:#047857,color:#ffffff');
  lines.push('style Z fill:#7c3aed,stroke:#5b21b6,color:#ffffff');

  Array.from(timelineMap.keys()).slice(0, 4).forEach((_timeline, index) => {
    lines.push(`style P${index + 1} fill:#2563eb,stroke:#1d4ed8,color:#ffffff`);
  });

  Array.from(timelineMap.entries()).slice(0, 4).forEach(([, group], index) => {
    group.slice(0, 3).forEach((_item, itemIndex) => {
      lines.push(`style P${index + 1}I${itemIndex + 1} fill:#f8fafc,stroke:#cbd5e1,color:#0f172a`);
    });
  });

  return lines.join('\n');
}

function parseClientAttackVectorPayload(raw: unknown) {
  if (!raw) {
    return {
      phases: [] as ClientAttackTimelinePhase[],
      mitreMapping: [] as ClientMitreMapping[],
      supplementaryDiagrams: defaultClientSupplementaryDiagrams,
    };
  }

  try {
    const parsed = parseNestedJson(raw);

    if (Array.isArray(parsed)) {
      return {
        phases: parsed.map((phase) => ({
          ...(typeof phase === 'object' && phase ? phase : {}),
          vulnerabilities: normalizeStringArray((phase as ClientAttackTimelinePhase)?.vulnerabilities),
          techniques: normalizeStringArray((phase as ClientAttackTimelinePhase)?.techniques),
          actions: normalizeStringArray((phase as ClientAttackTimelinePhase)?.actions),
          tools: normalizeStringArray((phase as ClientAttackTimelinePhase)?.tools),
        })) as ClientAttackTimelinePhase[],
        mitreMapping: [] as ClientMitreMapping[],
        supplementaryDiagrams: defaultClientSupplementaryDiagrams,
      };
    }

    if (typeof parsed === 'object') {
      const payload = parsed as {
        phases?: ClientAttackTimelinePhase[];
        mitreMapping?: ClientMitreMapping[];
        supplementaryDiagrams?: ClientSupplementaryDiagrams;
        timeline?: {
          phases?: ClientAttackTimelinePhase[] | string;
          mitreMapping?: ClientMitreMapping[] | string;
          supplementaryDiagrams?: ClientSupplementaryDiagrams | string;
        } | ClientAttackTimelinePhase[] | string;
      };

      const timelinePayload = parseNestedJson(payload.timeline);
      const phasesSource = payload.phases ?? (typeof timelinePayload === 'object' && !Array.isArray(timelinePayload)
        ? (timelinePayload as { phases?: ClientAttackTimelinePhase[] | string }).phases
        : Array.isArray(timelinePayload)
          ? timelinePayload
          : []);
      const mitreSource = payload.mitreMapping ?? (typeof timelinePayload === 'object' && !Array.isArray(timelinePayload)
        ? (timelinePayload as { mitreMapping?: ClientMitreMapping[] | string }).mitreMapping
        : []);
      const diagramsSource = payload.supplementaryDiagrams ?? (typeof timelinePayload === 'object' && !Array.isArray(timelinePayload)
        ? (timelinePayload as { supplementaryDiagrams?: ClientSupplementaryDiagrams | string }).supplementaryDiagrams
        : {});

      const parsedPhases = parseNestedJson(phasesSource);
      const parsedMitre = parseNestedJson(mitreSource);
      const parsedDiagrams = parseNestedJson(diagramsSource);

      return {
        phases: (Array.isArray(parsedPhases) ? parsedPhases : []).map((phase) => ({
          ...(typeof phase === 'object' && phase ? phase : {}),
          vulnerabilities: normalizeStringArray((phase as ClientAttackTimelinePhase)?.vulnerabilities),
          techniques: normalizeStringArray((phase as ClientAttackTimelinePhase)?.techniques),
          actions: normalizeStringArray((phase as ClientAttackTimelinePhase)?.actions),
          tools: normalizeStringArray((phase as ClientAttackTimelinePhase)?.tools),
        })) as ClientAttackTimelinePhase[],
        mitreMapping: (Array.isArray(parsedMitre) ? parsedMitre : []) as ClientMitreMapping[],
        supplementaryDiagrams: {
          ...defaultClientSupplementaryDiagrams,
          ...(typeof parsedDiagrams === 'object' && parsedDiagrams ? parsedDiagrams : {}),
        },
      };
    }
  } catch {
    return {
      phases: [] as ClientAttackTimelinePhase[],
      mitreMapping: [] as ClientMitreMapping[],
      supplementaryDiagrams: defaultClientSupplementaryDiagrams,
    };
  }

  return {
    phases: [] as ClientAttackTimelinePhase[],
    mitreMapping: [] as ClientMitreMapping[],
    supplementaryDiagrams: defaultClientSupplementaryDiagrams,
  };
}

// Component to view reports from storage
function ReportViewer({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isHtmlFile = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: downloadError } = await supabase.storage
          .from('files')
          .download(storagePath);

        if (downloadError) throw downloadError;

        const text = await data.text();
        setHtmlContent(await materializeNoteImages(text));
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    if (isHtmlFile) {
      fetchReport();
    } else {
      setLoading(false);
    }
  }, [storagePath, isHtmlFile]);

  if (!isHtmlFile) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>This report is stored as a file.</p>
        <p className="text-sm">Click Download to view the full report.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  if (htmlContent) {
    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none report-content"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
      />
    );
  }

  return null;
}

export function ClientMainContent({ selectedItem, clientId, clientName, clientInfo, projects, notifications, onSelectItem }: ClientMainContentProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [report, setReport] = useState<FileData | null>(null);
  const [projectReport, setProjectReport] = useState<ProjectReportData | null>(null);
  const [artifactData, setArtifactData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [activeDiagramSource, setActiveDiagramSource] = useState<string | null>(null);
  const [activeDiagramKey, setActiveDiagramKey] = useState<string | null>(null);
  const [diagramRenderErrors, setDiagramRenderErrors] = useState<Record<string, boolean>>({});
  const [overviewStats, setOverviewStats] = useState<{
    totalVulnerabilities: number;
    openVulnerabilities: number;
    bySeverity: Record<string, number>;
    byProject: { id: string; name: string; count: number; openCount: number }[];
  } | null>(null);
  const [recentVulnerabilities, setRecentVulnerabilities] = useState<Array<{ id: string; title: string; severity: string; status: string | null; project_id: string; created_at: string }>>([]);

  useEffect(() => {
    if (selectedItem.type === 'overview') {
      fetchOverviewStats();
    }
  }, [selectedItem.type, projects]);

  const fetchOverviewStats = async () => {
    if (projects.length === 0) return;

    try {
      const projectIds = projects.map(p => p.id);
      const { data: vulns, error } = await supabase
        .from('vulnerabilities')
        .select('id, title, severity, status, project_id, created_at')
        .in('project_id', projectIds);

      if (error) throw error;

      // Filter for open vulnerabilities only
      const openVulns = (vulns || []).filter(v => !v.status || ['open', 'retest', 'validated'].includes(v.status));

      const bySeverity: Record<string, number> = {};
      const byProjectMap: Record<string, { total: number; open: number }> = {};

      (vulns || []).forEach(v => {
        const isOpen = !v.status || ['open', 'retest', 'validated'].includes(v.status);
        if (isOpen) {
          bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
        }
        if (!byProjectMap[v.project_id]) {
          byProjectMap[v.project_id] = { total: 0, open: 0 };
        }
        byProjectMap[v.project_id].total++;
        if (isOpen) {
          byProjectMap[v.project_id].open++;
        }
      });

      const byProject = projects.map(p => ({
        id: p.id,
        name: p.name,
        count: byProjectMap[p.id]?.total || 0,
        openCount: byProjectMap[p.id]?.open || 0,
      })).sort((a, b) => b.openCount - a.openCount);

      setOverviewStats({
        totalVulnerabilities: vulns?.length || 0,
        openVulnerabilities: openVulns.length,
        bySeverity,
        byProject,
      });
      const recent = [...(vulns || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentVulnerabilities(recent);
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    }
  };

  useEffect(() => {
    if (selectedItem.type === 'report' && selectedItem.id) {
      fetchReport(selectedItem.id);
      setProjectReport(null);
      setArtifactData(null);
    } else if (selectedItem.type === 'project_report' && selectedItem.id) {
      fetchProjectReport(selectedItem.id);
      setReport(null);
      setArtifactData(null);
    } else if (selectedItem.type === 'artifact' && selectedItem.id && selectedItem.artifactType) {
      fetchArtifact(selectedItem.id, selectedItem.artifactType);
      setReport(null);
      setProjectReport(null);
    } else {
      setReport(null);
      setProjectReport(null);
      setArtifactData(null);
    }
  }, [selectedItem]);

  const fetchArtifact = async (id: string, type: string) => {
    setLoading(true);
    try {
      let data: any = null;
      let error: any = null;

      if (type === 'attack_vector') {
        const result = await supabase.from('attack_vectors').select('*').eq('id', id).eq('client_visible', true).maybeSingle();
        data = result.data;
        error = result.error;
      } else if (type === 'remediation_strategy') {
        const result = await supabase.from('remediation_strategies').select('*').eq('id', id).eq('client_visible', true).maybeSingle();
        data = result.data;
        error = result.error;
      } else if (type === 'recommendations') {
        const result = await supabase.from('recommendations').select('*').eq('id', id).eq('client_visible', true).maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      setArtifactData({ ...data, type });
      if (type === 'attack_vector') {
        setDiagramRenderErrors({});
        setShowDiagramModal(false);
        setActiveDiagramSource(null);
        setActiveDiagramKey(null);
      }
    } catch (error) {
      console.error('Error fetching artifact:', error);
      toast({ title: 'Error loading artifact', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (reportId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();

      if (error) throw error;
      setReport(data?.content ? { ...data, content: await materializeNoteImages(data.content, true) } : data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({ title: 'Error loading report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectReport = async (reportId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_reports')
        .select('*')
        .eq('id', reportId)
        .eq('client_visible', true)
        .maybeSingle();

      if (error) throw error;
      setProjectReport(data ? { ...data, html_content: await materializeNoteImages(data.html_content, true) } : null);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({ title: 'Error loading report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!report) return;

    try {
      if (report.storage_path) {
        const { data, error } = await supabase.storage
          .from('files')
          .download(report.storage_path);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = report.name;
        a.click();
        URL.revokeObjectURL(url);
      } else if (report.content) {
        const blob = new Blob([report.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = report.name;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: 'Report downloaded' });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({ title: 'Error downloading report', variant: 'destructive' });
    }
  };

  const handleDownloadProjectReport = () => {
    if (!projectReport) return;

    try {
      const blob = new Blob([standaloneReport(projectReport.html_content)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectReport.name.replace(/[^a-z0-9]/gi, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Report downloaded' });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({ title: 'Error downloading report', variant: 'destructive' });
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

  const formatDateSafe = (value?: string | null, fallback = 'N/A') => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return format(date, 'PPP');
  };

  const getEffortColor = (effort?: string) => {
    if (!effort) return 'border-muted-foreground/20 text-muted-foreground';
    const normalized = effort.toLowerCase();
    if (normalized.includes('low')) return 'border-emerald-500/40 text-emerald-500';
    if (normalized.includes('medium')) return 'border-amber-500/40 text-amber-500';
    if (normalized.includes('high')) return 'border-red-500/40 text-red-500';
    return 'border-muted-foreground/20 text-muted-foreground';
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'border-muted-foreground/20 text-muted-foreground';
    const normalized = priority.toLowerCase();
    if (normalized === 'high' || normalized === 'critical') return 'border-red-500/40 text-red-500';
    if (normalized === 'medium') return 'border-amber-500/40 text-amber-500';
    if (normalized === 'low') return 'border-emerald-500/40 text-emerald-500';
    return 'border-muted-foreground/20 text-muted-foreground';
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return 'border-muted-foreground/20 text-muted-foreground';
    const normalized = category.toLowerCase();
    if (normalized.includes('network')) return 'border-sky-500/40 text-sky-500';
    if (normalized.includes('application')) return 'border-purple-500/40 text-purple-500';
    if (normalized.includes('process')) return 'border-amber-500/40 text-amber-500';
    if (normalized.includes('people')) return 'border-emerald-500/40 text-emerald-500';
    return 'border-muted-foreground/20 text-muted-foreground';
  };

  const renderList = (items?: any[], emptyLabel = 'No items available') => {
    if (!items || items.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }

    return (
      <ul className="space-y-2 list-disc list-inside">
        {items.map((item, index) => {
          if (typeof item === 'string') {
            return <li key={`${item}-${index}`}>{item}</li>;
          }
          if (item?.title) {
            return (
              <li key={`${item.title}-${index}`}>
                <span className="font-medium">{item.title}</span>
                {item.description ? `: ${item.description}` : ''}
              </li>
            );
          }
          return <li key={index}>{JSON.stringify(item)}</li>;
        })}
      </ul>
    );
  };

  const toArray = (value: any) => (Array.isArray(value) ? value : []);

  const renderMermaidDiagram = (diagram: string, diagramKey: string, isModal = false) => {
    const encoded = btoa(unescape(encodeURIComponent(diagram)));
    const url = `https://mermaid.ink/svg/${encoded}`;
    const pngUrl = `https://mermaid.ink/img/${encoded}`;
    const hasRenderError = Boolean(diagramRenderErrors[diagramKey]);

    return (
      <div className={`relative w-full overflow-auto bg-muted/30 rounded-lg p-4 ${isModal ? '' : 'max-h-[400px]'}`}>
        {!hasRenderError ? (
          <img
            src={url}
            alt="Attack Scenario Diagram"
            className={`${isModal ? 'max-w-full' : 'max-w-full max-h-[350px]'} h-auto mx-auto`}
            onError={() => {
              console.error('Mermaid diagram failed to render');
              setDiagramRenderErrors((current) => ({ ...current, [diagramKey]: true }));
            }}
          />
        ) : (
          <div className="text-center text-destructive p-4">
            <p className="font-medium">Diagram Parse Error</p>
            <p className="text-sm text-muted-foreground mt-2">
              The diagram could not be rendered. Try regenerating the attack vector.
            </p>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          {!isModal && (
            <Button variant="outline" size="sm" onClick={() => {
              setActiveDiagramSource(diagram);
              setActiveDiagramKey(diagramKey);
              setShowDiagramModal(true);
            }}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Expand
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download SVG
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(pngUrl, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download PNG
          </Button>
        </div>
      </div>
    );
  };

  const getPhaseIcon = (phase: string) => {
    const lowerPhase = phase.toLowerCase();
    if (lowerPhase.includes('reconnaissance') || lowerPhase.includes('recon')) {
      return <Target className="h-4 w-4" />;
    }
    if (lowerPhase.includes('access') || lowerPhase.includes('entry')) {
      return <Zap className="h-4 w-4" />;
    }
    if (lowerPhase.includes('escalation') || lowerPhase.includes('privilege')) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getPhaseColor = (idx: number) => {
    const colors = [
      'border-l-blue-500 bg-blue-500/5',
      'border-l-yellow-500 bg-yellow-500/5',
      'border-l-orange-500 bg-orange-500/5',
      'border-l-red-500 bg-red-500/5',
      'border-l-purple-500 bg-purple-500/5',
    ];
    return colors[idx % colors.length];
  };

  const renderKeyValue = (data?: Record<string, any>) => {
    if (!data || Object.keys(data).length === 0) {
      return <p className="text-sm text-muted-foreground">No data available</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="p-3 rounded-lg bg-muted/40">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{key.replace(/_/g, ' ')}</p>
            <p className="text-sm font-medium mt-1">
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // Show client overview
  if (selectedItem.type === 'overview') {
    const severityChartData = overviewStats
      ? SEVERITY_ORDER.map(sev => ({
          name: sev.charAt(0).toUpperCase() + sev.slice(1),
          value: overviewStats.bySeverity[sev] || 0,
          color: SEVERITY_COLORS[sev],
        })).filter(d => d.value > 0)
      : [];

    const totalOpen = overviewStats?.openVulnerabilities || 0;
    const totalAll = overviewStats?.totalVulnerabilities || 0;
    const fixedCount = totalAll - totalOpen;
    const remediationPct = totalAll > 0 ? Math.round((fixedCount / totalAll) * 100) : 0;
    const criticalHighCount = (overviewStats?.bySeverity?.critical || 0) + (overviewStats?.bySeverity?.high || 0);

    return (
      <ScrollArea className="h-full">
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t.clientPortal.welcome}, {clientName}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t.clientPortal.overviewSubtitle.replace('{{count}}', String(projects.length))}
                  </p>
                </div>
              </div>
              {clientInfo?.contact_name && (
                <p className="text-xs text-muted-foreground mt-3 pl-15">
                  {t.clientPortal.contactPerson}: {clientInfo.contact_name}
                </p>
              )}
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer" onClick={() => onSelectItem({ type: 'vulnerabilities', id: clientId, name: 'All Vulnerabilities' })}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <Bug className="h-4.5 w-4.5 text-orange-500" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold tabular-nums">{totalOpen}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.clientPortal.openVulnerabilities}</div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-md hover:border-destructive/30 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                  </div>
                  {criticalHighCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t.clientPortal.urgent}</Badge>
                  )}
                </div>
                <div className="text-2xl sm:text-3xl font-bold tabular-nums text-red-500">{criticalHighCount}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.clientPortal.criticalHigh}</div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-md hover:border-green-500/30 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-4.5 w-4.5 text-green-500" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tabular-nums text-green-500">{remediationPct}%</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.clientPortal.remediated}</div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-md hover:border-cyan-500/30 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <FolderOpen className="h-4.5 w-4.5 text-cyan-500" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tabular-nums">{projects.length}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.clientPortal.activeProjects}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Severity Distribution Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  {t.clientPortal.severityDistribution}
                </CardTitle>
                <CardDescription>{t.clientPortal.severityDistributionDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {severityChartData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={severityChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="55%"
                            outerRadius="85%"
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {severityChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {SEVERITY_ORDER.map(sev => {
                        const count = overviewStats?.bySeverity[sev] || 0;
                        if (count === 0) return null;
                        return (
                          <div key={sev} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                              <span className="capitalize text-muted-foreground">{sev}</span>
                            </div>
                            <span className="font-semibold tabular-nums">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
                    <div className="text-center">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-20" />
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
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t.clientPortal.remediationProgress}
                </CardTitle>
                <CardDescription>{t.clientPortal.remediationProgressDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {/* Progress Ring */}
                  <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] flex-shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: fixedCount, color: '#22c55e' },
                            { value: totalOpen || (totalAll === 0 ? 1 : 0), color: 'hsl(var(--muted))' },
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
                        <div className="text-2xl font-bold">{remediationPct}%</div>
                        <div className="text-[10px] text-muted-foreground">{t.clientPortal.fixed}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">{t.clientPortal.fixedResolved}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{fixedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                        <span className="text-muted-foreground">{t.clientPortal.openRemaining}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{totalOpen}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                        <span className="text-muted-foreground">{t.clientPortal.totalFindings}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{totalAll}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Overview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    {t.clientPortal.projectsOverview}
                  </CardTitle>
                  <CardDescription>{t.clientPortal.projectsOverviewDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overviewStats?.byProject.map((project) => {
                  const pctFixed = project.count > 0 ? Math.round(((project.count - project.openCount) / project.count) * 100) : 100;
                  return (
                    <button
                      key={project.id}
                      onClick={() => onSelectItem({ type: 'project', id: project.id, name: project.name, projectId: project.id })}
                      className="group flex items-center gap-4 p-3 rounded-lg w-full text-left border border-transparent hover:border-primary/20 hover:bg-muted/40 transition-all"
                    >
                      <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="h-4 w-4 text-cyan-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{project.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {project.openCount > 0 ? (
                              <Badge variant="secondary" className="text-[10px]">{project.openCount} {t.clientPortal.open}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/40">{t.clientPortal.allClear}</Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        {/* Progress bar for this project */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctFixed}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{pctFixed}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {(!overviewStats || overviewStats.byProject.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{t.clientPortal.noProjects}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  {t.clientPortal.recentNotifications}
                </CardTitle>
                <CardDescription>{t.clientPortal.recentNotificationsDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() =>
                        notification.vulnerability_id &&
                        onSelectItem({
                          type: 'vulnerability',
                          id: notification.vulnerability_id,
                          name: notification.message || 'Notification',
                          projectId: notification.project_id,
                        })
                      }
                      className="w-full text-left p-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-muted/30 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            notification.notification_type === 'comment' ? 'bg-blue-500' : 'bg-orange-500'
                          }`} />
                          <span className="text-sm font-medium">
                            {notification.notification_type === 'comment' ? t.clientPortal.newComment : t.clientPortal.retestRequest}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-4">
                          {notification.message}
                        </p>
                      )}
                    </button>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">{t.clientPortal.noNotifications}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Latest Vulnerabilities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  {t.clientPortal.latestFindings}
                </CardTitle>
                <CardDescription>{t.clientPortal.latestFindingsDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentVulnerabilities.map((vuln) => (
                    <button
                      key={vuln.id}
                      onClick={() => onSelectItem({ type: 'vulnerability', id: vuln.id, name: vuln.title, projectId: vuln.project_id })}
                      className="w-full text-left p-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-muted/30 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium line-clamp-1 flex-1">{vuln.title}</span>
                        <Badge className={getSeverityColor(vuln.severity) + ' text-[10px] px-1.5'}>{vuln.severity.toUpperCase()}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                        <span>{projects.find((p) => p.id === vuln.project_id)?.name || 'Project'}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(vuln.created_at), { addSuffix: true })}</span>
                      </div>
                    </button>
                  ))}
                  {recentVulnerabilities.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">{t.clientPortal.noVulnerabilities}</p>
                    </div>
                  )}
                </div>
                {recentVulnerabilities.length > 0 && (
                  <div className="pt-3 mt-3 border-t">
                    <Button variant="ghost" className="w-full text-xs h-8" onClick={() => onSelectItem({ type: 'vulnerabilities', id: clientId, name: 'All Vulnerabilities' })}>
                      {t.clientPortal.viewAllVulnerabilities}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    );
  }

  // Show project dashboard when project is selected
  if (selectedItem.type === 'project' && selectedItem.projectId) {
    const project = projects.find(p => p.id === selectedItem.projectId);
    return (
      <ClientProjectDashboard 
        projectId={selectedItem.projectId} 
        projectName={project?.name || selectedItem.name || 'Project'}
        onSelectItem={onSelectItem}
      />
    );
  }

  if (selectedItem.type === 'vulnerabilities') {
    return (
      <ClientVulnerabilitiesDashboard
        projects={projects}
        projectId={selectedItem.projectId}
        onSelectItem={onSelectItem}
      />
    );
  }

  // Show vulnerability viewer
  if (selectedItem.type === 'vulnerability' && selectedItem.id) {
    return (
      <ClientVulnerabilityViewer 
        vulnerabilityId={selectedItem.id}
        projectId={selectedItem.projectId || ''}
      />
    );
  }

  // Show report viewer
  if (selectedItem.type === 'report' && selectedItem.id) {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!report) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Report not found</p>
          </div>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {report.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Generated: {new Date(report.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={handleDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Content</CardTitle>
            </CardHeader>
            <CardContent>
              {report.content ? (
                // Check if content looks like HTML
                report.content.trim().startsWith('<') || report.content.includes('<!DOCTYPE') ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(report.content) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                    {report.content}
                  </pre>
                )
              ) : report.storage_path ? (
                <ReportViewer storagePath={report.storage_path} fileName={report.name} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No content available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  // Show project report viewer (generated HTML reports)
  if (selectedItem.type === 'project_report' && selectedItem.id) {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!projectReport) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Report not found</p>
          </div>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                {projectReport.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Generated: {new Date(projectReport.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={handleDownloadProjectReport}>
              <Download className="h-4 w-4 mr-2" />
              Download HTML
            </Button>
          </div>

          {/* Render HTML report in iframe for proper styling */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <iframe
                srcDoc={standaloneReport(projectReport.html_content)}
                className="w-full min-h-[800px] border-0"
                title={projectReport.name}
                sandbox=""
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  // Show artifact viewer
  if (selectedItem.type === 'artifact' && artifactData) {
    const attackVectorPayload = artifactData.type === 'attack_vector'
      ? parseClientAttackVectorPayload(artifactData.timeline)
      : null;
    const remediationItems = artifactData.type === 'remediation_strategy'
      ? (toArray(artifactData.items) as ClientRemediationItem[])
      : [];
    const remediationQuickWins = artifactData.type === 'remediation_strategy'
      ? normalizeStringArray(artifactData.quick_wins)
      : [];
    const remediationLongTermGoals = artifactData.type === 'remediation_strategy'
      ? (toArray(artifactData.long_term_goals) as Array<string | ClientLongTermGoal>)
      : [];
    const remediationTimelineGroups = remediationItems.reduce<Array<{ timeline: string; items: ClientRemediationItem[] }>>((groups, item) => {
      const timeline = item.timeline?.trim() || 'Planned workstream';
      const existing = groups.find((group) => group.timeline === timeline);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ timeline, items: [item] });
      }
      return groups;
    }, []);
    const remediationDiagram = artifactData.type === 'remediation_strategy' && (remediationItems.length > 0 || remediationQuickWins.length > 0)
      ? buildClientRemediationDiagram(remediationItems, remediationQuickWins, remediationLongTermGoals)
      : null;
    const supplementaryDiagramSections = attackVectorPayload
      ? [
          { key: 'architectureSchema', title: 'Architecture Schema', description: 'Trust boundaries, key systems, and high-level relationships inferred from the engagement.', diagram: attackVectorPayload.supplementaryDiagrams.architectureSchema },
          { key: 'accessSchema', title: 'Access Schema', description: 'Likely paths from exposed access to privileged or sensitive resources.', diagram: attackVectorPayload.supplementaryDiagrams.accessSchema },
          { key: 'securityFindingsSchema', title: 'Security Findings Schema', description: 'How the findings cluster into broader exploitation and business-risk themes.', diagram: attackVectorPayload.supplementaryDiagrams.securityFindingsSchema },
        ].filter((section) => Boolean(section.diagram))
      : [];
    const uniqueMitreTactics = attackVectorPayload ? new Set(attackVectorPayload.mitreMapping.map((item) => item.tacticId)).size : 0;
    const uniqueMitreTechniques = attackVectorPayload ? new Set(attackVectorPayload.mitreMapping.map((item) => item.techniqueId)).size : 0;
    const mitreDetectionCoverage = attackVectorPayload && attackVectorPayload.mitreMapping.length > 0
      ? Math.round((attackVectorPayload.mitreMapping.filter((item) => Boolean(item.detection)).length / attackVectorPayload.mitreMapping.length) * 100)
      : 0;
    const mitreMitigationCoverage = attackVectorPayload && attackVectorPayload.mitreMapping.length > 0
      ? Math.round((attackVectorPayload.mitreMapping.filter((item) => Boolean(item.mitigation)).length / attackVectorPayload.mitreMapping.length) * 100)
      : 0;

    const getArtifactIcon = () => {
      switch (artifactData.type) {
        case 'attack_vector': return <Target className="h-5 w-5 text-red-400" />;
        case 'remediation_strategy': return <Wrench className="h-5 w-5 text-blue-400" />;
        case 'recommendations': return <Lightbulb className="h-5 w-5 text-yellow-400" />;
        default: return <FileText className="h-5 w-5 text-primary" />;
      }
    };

    const getArtifactTitle = () => {
      switch (artifactData.type) {
        case 'attack_vector': return 'Attack Vector Analysis';
        case 'remediation_strategy': return 'Remediation Strategy';
        case 'recommendations': return 'Recommendations';
        default: return 'Artifact';
      }
    };

    return (
      <ScrollArea className="h-full">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-3">
            {getArtifactIcon()}
            <div>
              <h1 className="text-xl font-bold">{getArtifactTitle()}</h1>
              <p className="text-sm text-muted-foreground">
                Last updated: {formatDateSafe(artifactData.updated_at)}
              </p>
            </div>
          </div>

          {artifactData.type === 'attack_vector' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Vulnerabilities Analyzed</div>
                    <div className="text-2xl font-bold mt-2">{artifactData.vulnerability_count ?? artifactData.vulnerabilityCount ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Timeline Phases</div>
                    <div className="text-2xl font-bold mt-2">{attackVectorPayload?.phases.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">MITRE Mappings</div>
                    <div className="text-2xl font-bold mt-2">{attackVectorPayload?.mitreMapping.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Mapped Tactics</div>
                    <div className="text-2xl font-bold mt-2">{uniqueMitreTactics}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Supporting Diagrams</div>
                    <div className="text-2xl font-bold mt-2">{supplementaryDiagramSections.length}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Unique Techniques</div>
                    <div className="text-2xl font-bold mt-2">{uniqueMitreTechniques}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Detection Coverage</div>
                    <div className="text-2xl font-bold mt-2">{mitreDetectionCoverage}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Mitigation Coverage</div>
                    <div className="text-2xl font-bold mt-2">{mitreMitigationCoverage}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Last Updated</div>
                    <div className="text-sm font-medium mt-2">{formatDateSafe(artifactData.updated_at)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Attack Scenario</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{artifactData.description || 'No description available.'}</p>
                </CardContent>
              </Card>

              {artifactData.diagram && (
                <Card>
                  <CardHeader>
                    <CardTitle>Attack Flow Diagram</CardTitle>
                    <CardDescription>
                      Node colors indicate severity: Red = Critical, Orange = High, Yellow = Medium, Green = Low, Blue = Info.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderMermaidDiagram(artifactData.diagram, 'attackFlow')}
                  </CardContent>
                </Card>
              )}

              {supplementaryDiagramSections.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {supplementaryDiagramSections.map((section) => (
                    <Card key={section.key}>
                      <CardHeader>
                        <CardTitle className="text-base">{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {section.diagram ? renderMermaidDiagram(section.diagram, section.key) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {attackVectorPayload && attackVectorPayload.phases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Attack Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {attackVectorPayload.phases.map((phase: ClientAttackTimelinePhase, index: number) => (
                        <div key={`${phase.phase}-${index}`} className={`p-4 rounded-lg border border-border/60 border-l-4 ${getPhaseColor(index)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{getPhaseIcon(phase.phase || '')}</span>
                              <h4 className="font-medium">{phase.phase || `Phase ${index + 1}`}</h4>
                            </div>
                            {phase.duration && (
                              <Badge variant="outline" className="text-xs">{phase.duration}</Badge>
                            )}
                          </div>
                          {phase.mitreId && (
                            <p className="text-xs text-muted-foreground mt-1">MITRE: {phase.mitreId}</p>
                          )}
                          {phase.description && (
                            <p className="text-sm text-muted-foreground mt-2">{phase.description}</p>
                          )}
                          {toArray(phase.vulnerabilities).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Exploited Vulnerabilities</p>
                              <ul className="space-y-1 text-sm">
                                {toArray(phase.vulnerabilities).map((vuln: any, vIndex: number) => (
                                  <li key={`${vuln}-${vIndex}`} className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    {vuln}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {toArray(phase.techniques).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Techniques</p>
                              <div className="flex flex-wrap gap-1.5">
                                {toArray(phase.techniques).map((technique: string, techniqueIndex: number) => (
                                  <Badge key={`${technique}-${techniqueIndex}`} variant="outline" className="text-[10px]">{technique}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {toArray(phase.actions).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Actions</p>
                              <ul className="space-y-1 text-sm">
                                {toArray(phase.actions).map((action: string, actionIndex: number) => (
                                  <li key={`${action}-${actionIndex}`} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {toArray(phase.tools).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Likely Tools / Tradecraft</p>
                              <div className="flex flex-wrap gap-1.5">
                                {toArray(phase.tools).map((tool: string, toolIndex: number) => (
                                  <Badge key={`${tool}-${toolIndex}`} variant="secondary" className="text-[10px]">{tool}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {attackVectorPayload && attackVectorPayload.mitreMapping.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>MITRE ATT&CK Mapping</CardTitle>
                    <CardDescription>
                      Technique mappings, detections, and mitigations derived from the modeled attack path.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="space-y-3">
                      {attackVectorPayload.mitreMapping.map((mapping: ClientMitreMapping, index: number) => (
                        <AccordionItem
                          key={`${mapping.techniqueId}-${mapping.vulnerability}-${index}`}
                          value={`${mapping.techniqueId}-${index}`}
                          className="rounded-lg border px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="text-left">
                              <p className="font-medium text-sm">{mapping.vulnerability}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-[10px]">{mapping.tacticId} · {mapping.tacticName}</Badge>
                                <Badge variant="outline" className="text-[10px]">{mapping.techniqueId} · {mapping.techniqueName}</Badge>
                                {mapping.confidence !== undefined && (
                                  <Badge variant="secondary" className="text-[10px]">Confidence {mapping.confidence}%</Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pb-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Attack explanation</p>
                              <p className="text-sm text-muted-foreground">{mapping.explanation}</p>
                            </div>
                            {mapping.detection && (
                              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                                <p className="text-xs uppercase tracking-wide text-blue-500 mb-1">Detection guidance</p>
                                <p className="text-sm text-muted-foreground">{mapping.detection}</p>
                              </div>
                            )}
                            {mapping.mitigation && (
                              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                                <p className="text-xs uppercase tracking-wide text-green-500 mb-1">Mitigation guidance</p>
                                <p className="text-sm text-muted-foreground">{mapping.mitigation}</p>
                              </div>
                            )}
                            {(toArray(mapping.dataSources).length > 0 || toArray(mapping.platforms).length > 0) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {toArray(mapping.dataSources).length > 0 && (
                                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Data sources</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {toArray(mapping.dataSources).map((source: string, sourceIndex: number) => (
                                        <Badge key={`${source}-${sourceIndex}`} variant="outline" className="text-[10px]">{source}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {toArray(mapping.platforms).length > 0 && (
                                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Platforms</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {toArray(mapping.platforms).map((platform: string, platformIndex: number) => (
                                        <Badge key={`${platform}-${platformIndex}`} variant="outline" className="text-[10px]">{platform}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}

            </div>
          )}

          {artifactData.type === 'remediation_strategy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Remediation Items</div>
                    <div className="text-2xl font-bold mt-2">{remediationItems.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Quick Wins</div>
                    <div className="text-2xl font-bold mt-2">{remediationQuickWins.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Timeline Phases</div>
                    <div className="text-2xl font-bold mt-2">{remediationTimelineGroups.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground">Strategic Goals</div>
                    <div className="text-2xl font-bold mt-2">{remediationLongTermGoals.length}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {artifactData.total_effort && (
                  <Badge variant="secondary" className="text-sm">
                    Total effort: {artifactData.total_effort}
                  </Badge>
                )}
                {artifactData.recommended_timeline && (
                  <Badge variant="secondary" className="text-sm">
                    Timeline: {artifactData.recommended_timeline}
                  </Badge>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{artifactData.executive_summary}</p>
                </CardContent>
              </Card>

              {remediationDiagram && (
                <Card>
                  <CardHeader>
                    <CardTitle>Remediation Program Map</CardTitle>
                    <CardDescription>
                      Visual summary of immediate actions, phased workstreams, and long-term security outcomes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderMermaidDiagram(remediationDiagram, 'clientRemediationProgramMap')}
                  </CardContent>
                </Card>
              )}

              {remediationTimelineGroups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Implementation Roadmap</CardTitle>
                    <CardDescription>
                      Recommended rollout order grouped by remediation timeline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {remediationTimelineGroups.map((group, index) => (
                        <div key={`${group.timeline}-${index}`} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <h4 className="font-medium">{group.timeline}</h4>
                            <Badge variant="outline" className="text-[10px]">{group.items.length} items</Badge>
                          </div>
                          <div className="space-y-2">
                            {group.items.slice(0, 4).map((item, itemIndex) => (
                              <div key={`${item.title || itemIndex}-${itemIndex}`} className="flex items-start gap-2 text-sm">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                <div>
                                  <p className="font-medium">{item.title || `Remediation item ${itemIndex + 1}`}</p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Wins</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList(remediationQuickWins, 'No quick wins provided')}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Long-term Goals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {remediationLongTermGoals.length > 0 ? (
                      <div className="space-y-3">
                        {remediationLongTermGoals.map((goal: any, index: number) => (
                          <div key={`${goal.goal || goal}-${index}`} className="p-3 rounded-lg border border-border/60">
                            <p className="font-medium">{goal.goal || goal}</p>
                            {goal.category && (
                              <p className="text-xs text-muted-foreground mt-1">Category: {goal.category}</p>
                            )}
                            {goal.timeframe && (
                              <p className="text-xs text-muted-foreground">Timeframe: {goal.timeframe}</p>
                            )}
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-2">{goal.description}</p>
                            )}
                            {toArray(goal.benefits).length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Benefits</p>
                                <ul className="text-sm space-y-1">
                                  {toArray(goal.benefits).map((benefit: string, bIndex: number) => (
                                    <li key={`${benefit}-${bIndex}`} className="flex items-center gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                      {benefit}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No long-term goals provided</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Prioritized Remediation Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {remediationItems.map((item: any, index: number) => (
                      <div key={`${item.title}-${index}`} className="p-4 rounded-lg border border-border/60">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {item.priority ?? index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium">{item.title}</h4>
                              {item.severity && (
                                <Badge variant="outline" className={`text-[10px] ${getSeverityColor(item.severity)}`}>
                                  {item.severity}
                                </Badge>
                              )}
                              {item.effort && (
                                <Badge variant="outline" className={`text-[10px] ${getEffortColor(item.effort)}`}>
                                  {item.effort}
                                </Badge>
                              )}
                              {item.timeline && (
                                <Badge variant="outline" className="text-[10px]">
                                  {item.timeline}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                            )}
                            {toArray(item.steps).length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Steps</p>
                                <ol className="list-decimal list-inside space-y-1 text-sm">
                                  {toArray(item.steps).map((step: string, stepIndex: number) => (
                                    <li key={`${step}-${stepIndex}`}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {toArray(item.dependencies).length > 0 && (
                              <div className="mt-3 text-xs text-muted-foreground">
                                <span className="font-semibold">Dependencies:</span> {toArray(item.dependencies).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {remediationItems.length === 0 && (
                      <p className="text-sm text-muted-foreground">No remediation items available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {artifactData.type === 'recommendations' && (
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{artifactData.summary}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Findings</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList(toArray(artifactData.key_findings), 'No findings available')}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Priority Matrix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {artifactData.priority_matrix ? (
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { key: 'immediate', label: 'Immediate', className: 'border-red-500/30 bg-red-500/5' },
                          { key: 'shortTerm', label: 'Short Term (1-3 months)', className: 'border-amber-500/30 bg-amber-500/5' },
                          { key: 'longTerm', label: 'Long Term (3-6+ months)', className: 'border-blue-500/30 bg-blue-500/5' },
                        ].map(({ key, label, className }) => (
                          <div key={key} className={`p-3 rounded-lg border ${className}`}>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                            <div className="text-sm mt-2">
                              {toArray(artifactData.priority_matrix?.[key]).length > 0
                                ? toArray(artifactData.priority_matrix?.[key]).map((id: string) => {
                                    const recMatch = toArray(artifactData.recommendations).find((rec: any) => rec.id === id);
                                    const label = recMatch?.title || id;
                                    return (
                                      <div key={id} className="flex items-center gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                      {label}
                                    </div>
                                    );
                                  })
                                : 'No items'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No priority matrix available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Estimated Investment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{artifactData.estimated_total_investment || 'Not specified'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Expected ROI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{artifactData.expected_roi || 'Not specified'}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  {toArray(artifactData.recommendations).length > 0 ? (
                    <Accordion type="multiple" className="space-y-3">
                      {toArray(artifactData.recommendations).map((rec: any, index: number) => (
                        <AccordionItem
                          key={rec.id || rec.title || index}
                          value={rec.id || `${index}`}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-start gap-3 text-left">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{rec.title}</div>
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  {rec.category && (
                                    <Badge variant="outline" className={`text-[10px] ${getCategoryColor(rec.category)}`}>
                                      {rec.category}
                                    </Badge>
                                  )}
                                  {rec.priority && (
                                    <Badge variant="outline" className={`text-[10px] ${getPriorityColor(rec.priority)}`}>
                                      {rec.priority.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <div className="space-y-4 pl-11">
                              {rec.description && (
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</h5>
                                  <p className="text-sm">{rec.description}</p>
                                </div>
                              )}
                              {rec.rationale && (
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rationale</h5>
                                  <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                                </div>
                              )}
                              {toArray(rec.expectedBenefits).length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Expected Benefits</h5>
                                  <ul className="space-y-1 text-sm">
                                    {toArray(rec.expectedBenefits).map((benefit: string, bIndex: number) => (
                                      <li key={`${benefit}-${bIndex}`} className="flex items-start gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1" />
                                        {benefit}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {toArray(rec.implementationSteps).length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Implementation Steps</h5>
                                  <ol className="list-decimal list-inside space-y-1 text-sm">
                                    {toArray(rec.implementationSteps).map((step: string, stepIndex: number) => (
                                      <li key={`${step}-${stepIndex}`}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                                {rec.estimatedEffort && <span><strong>Effort:</strong> {rec.estimatedEffort}</span>}
                                {rec.prerequisites && rec.prerequisites.length > 0 && (
                                  <span><strong>Prerequisites:</strong> {rec.prerequisites.join(', ')}</span>
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recommendations available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Context</CardTitle>
                </CardHeader>
                <CardContent>{renderKeyValue(artifactData.project_context)}</CardContent>
              </Card>
            </div>
          )}

          <Dialog open={showDiagramModal} onOpenChange={setShowDiagramModal}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-warning" />
                  Artifact Diagram
                </DialogTitle>
              </DialogHeader>
              {activeDiagramSource && renderMermaidDiagram(activeDiagramSource, activeDiagramKey || 'artifact-diagram-modal', true)}
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    );
  }

  // Default empty state
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>Select an item to view</p>
      </div>
    </div>
  );
}
