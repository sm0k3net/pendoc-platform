import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, RefreshCw, AlertTriangle, Clock, Wrench, Download, Trash2, Calendar, CheckCircle2, ListOrdered, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RemediationStrategyTabProps {
  projectId: string;
}

interface RemediationItem {
  priority: number;
  title: string;
  severity: string;
  effort: string;
  timeline: string;
  description: string;
  steps: string[];
  dependencies?: string[];
}

interface LongTermGoal {
  goal: string;
  category: string;
  timeframe: string;
  description: string;
  benefits: string[];
  implementation_steps: string[];
}

interface RemediationData {
  id?: string;
  client_visible?: boolean;
  executive_summary: string;
  items: RemediationItem[];
  total_effort: string;
  recommended_timeline: string;
  quick_wins: string[];
  long_term_goals: (string | LongTermGoal)[];
  updatedAt?: string;
}

function escapeReportHtml(value: string | undefined | null) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderRichTextParagraphs(value: string | undefined | null) {
  return (value || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeReportHtml(part)}</p>`)
    .join('');
}

function sanitizeMermaidLabel(value: string | undefined | null, maxLength = 34) {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/[\[\]{}<>|#]/g, '')
    .replace(/"/g, "'")
    .replace(/[:;]/g, '-')
    .trim()
    .slice(0, maxLength);
}

function getMermaidImageUrl(diagram: string) {
  return `https://mermaid.ink/img/${btoa(unescape(encodeURIComponent(diagram)))}`;
}

function buildRemediationDiagram(data: RemediationData) {
  const lines: string[] = ['flowchart LR'];
  lines.push('A["Remediation Program"]');

  const quickWins = data.quick_wins.slice(0, 3);
  if (quickWins.length > 0) {
    lines.push('B["Quick Wins"]');
    lines.push('A --> B');
    quickWins.forEach((item, index) => {
      const nodeId = `Q${index + 1}`;
      lines.push(`${nodeId}["${sanitizeMermaidLabel(item)}"]`);
      lines.push(`B --> ${nodeId}`);
    });
  }

  const phaseMap = new Map<string, string[]>();
  [...data.items]
    .sort((a, b) => a.priority - b.priority)
    .forEach((item) => {
      const key = item.timeline || 'Planned Remediation';
      if (!phaseMap.has(key)) phaseMap.set(key, []);
      phaseMap.get(key)?.push(item.title);
    });

  Array.from(phaseMap.entries()).slice(0, 4).forEach(([timeline, titles], index) => {
    const phaseId = `P${index + 1}`;
    lines.push(`${phaseId}["${sanitizeMermaidLabel(`Phase ${index + 1} - ${timeline}`, 38)}"]`);
    lines.push(`A --> ${phaseId}`);
    titles.slice(0, 3).forEach((title, itemIndex) => {
      const itemId = `${phaseId}I${itemIndex + 1}`;
      lines.push(`${itemId}["${sanitizeMermaidLabel(title)}"]`);
      lines.push(`${phaseId} --> ${itemId}`);
    });
  });

  const goals = data.long_term_goals
    .map((goal) => typeof goal === 'string' ? goal : goal.goal)
    .filter(Boolean)
    .slice(0, 3);

  if (goals.length > 0) {
    lines.push('Z["Strategic Outcomes"]');
    lines.push('A --> Z');
    goals.forEach((goal, index) => {
      const goalId = `G${index + 1}`;
      lines.push(`${goalId}["${sanitizeMermaidLabel(goal)}"]`);
      lines.push(`Z --> ${goalId}`);
    });
  }

  lines.push('style A fill:#0f172a,stroke:#111827,color:#fff');
  lines.push('style B fill:#10b981,stroke:#047857,color:#fff');
  lines.push('style Z fill:#7c3aed,stroke:#5b21b6,color:#fff');

  Array.from(phaseMap.keys()).slice(0, 4).forEach((_timeline, index) => {
    lines.push(`style P${index + 1} fill:#0ea5e9,stroke:#0369a1,color:#fff`);
  });
  Array.from(phaseMap.entries()).slice(0, 4).forEach(([, titles], index) => {
    titles.slice(0, 3).forEach((_title, itemIndex) => {
      lines.push(`style P${index + 1}I${itemIndex + 1} fill:#f8fafc,stroke:#cbd5e1,color:#0f172a`);
    });
  });

  return lines.join('\n');
}

export function RemediationStrategyTab({ projectId }: RemediationStrategyTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [data, setData] = useState<RemediationData | null>(null);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagramRenderError, setDiagramRenderError] = useState(false);

  useEffect(() => {
    loadExistingStrategy();
  }, [projectId]);

  const loadExistingStrategy = async () => {
    setInitialLoading(true);
    setError(null);

    try {
      // Load from database
      const { data: strategy, error: fetchError } = await supabase
        .from('remediation_strategies')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading remediation strategy:', fetchError);
      } else if (strategy) {
        setData({
          id: strategy.id,
          client_visible: strategy.client_visible ?? false,
          executive_summary: strategy.executive_summary,
          items: (strategy.items as unknown as RemediationItem[]) || [],
          total_effort: strategy.total_effort || '',
          recommended_timeline: strategy.recommended_timeline || '',
          quick_wins: (strategy.quick_wins as unknown as string[]) || [],
          long_term_goals: (strategy.long_term_goals as unknown as (string | LongTermGoal)[]) || [],
          updatedAt: strategy.updated_at,
        });
      }
    } catch (err) {
      console.error('Error loading remediation strategy:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const generateStrategy = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: funcError } = await supabase.functions.invoke('generate-remediation-strategy', {
        body: { projectId }
      });

      if (funcError) throw funcError;
      
      if (result.error) {
        throw new Error(result.error);
      }

      const strategyData: RemediationData = {
        id: result.id,
        client_visible: result.client_visible ?? data?.client_visible ?? false,
        executive_summary: result.executive_summary,
        items: result.items || [],
        total_effort: result.total_effort,
        recommended_timeline: result.recommended_timeline,
        quick_wins: result.quick_wins || [],
        long_term_goals: result.long_term_goals || [],
        updatedAt: result.savedAt,
      };

      setData(strategyData);
      toast({ title: t.ui?.remediationStrategyGenerated || 'Remediation strategy generated and saved' });
    } catch (err) {
      console.error('Error generating remediation strategy:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate remediation strategy';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, t]);

  const handleDelete = async () => {
    try {
      const { error: funcError } = await supabase.functions.invoke('generate-remediation-strategy', {
        body: { projectId, action: 'delete' }
      });

      if (funcError) throw funcError;

      setData(null);
      toast({ title: t.ui?.remediationStrategyDeleted || 'Remediation strategy deleted' });
    } catch (err) {
      console.error('Error deleting remediation strategy:', err);
      toast({ title: 'Failed to delete remediation strategy', variant: 'destructive' });
    }
  };

  const handleToggleClientVisibility = async (clientVisible: boolean) => {
    if (!data?.id) return;

    setUpdatingVisibility(true);
    try {
      const { error: updateError } = await supabase
        .from('remediation_strategies')
        .update({ client_visible: clientVisible })
        .eq('id', data.id);

      if (updateError) throw updateError;

      setData((current) => current ? { ...current, client_visible: clientVisible } : current);
      toast({ title: clientVisible ? 'Remediation strategy shared with client portal' : 'Remediation strategy hidden from client portal' });
    } catch (err) {
      console.error('Error updating remediation strategy visibility:', err);
      toast({ title: 'Failed to update remediation strategy visibility', variant: 'destructive' });
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleExportHTML = () => {
    if (!data) return;

    const html = generateHTMLReport(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remediation_strategy_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = (data: RemediationData): string => {
    const getCategoryColor = (category: string) => {
      const colors: Record<string, string> = {
        'Policy': '#3b82f6',
        'Process': '#8b5cf6',
        'Technology': '#10b981',
        'Training': '#f59e0b',
        'Monitoring': '#ef4444',
      };
      return colors[category] || '#6b7280';
    };

    const getSeverityHTMLColor = (severity: string) => {
      const colors: Record<string, { bg: string; text: string; border: string }> = {
        'critical': { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
        'high': { bg: '#fff7ed', text: '#ea580c', border: '#fdba74' },
        'medium': { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
        'low': { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },
      };
      return colors[severity.toLowerCase()] || { bg: '#f9fafb', text: '#6b7280', border: '#d1d5db' };
    };

    // Build timeline phases from items
    const phases: { name: string; items: string[]; timeline: string; color: string }[] = [];
    const phaseMap = new Map<string, string[]>();
    data.items.forEach(item => {
      const tl = item.timeline || 'Unplanned';
      if (!phaseMap.has(tl)) phaseMap.set(tl, []);
      phaseMap.get(tl)!.push(item.title);
    });
    const phaseColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
    let pi = 0;
    phaseMap.forEach((items, timeline) => {
      phases.push({ name: `Phase ${pi + 1}`, items, timeline, color: phaseColors[pi % phaseColors.length] });
      pi++;
    });

    const sortedItems = [...data.items].sort((a, b) => a.priority - b.priority);
    const criticalItems = sortedItems.filter((item) => item.severity.toLowerCase() === 'critical').length;
    const highItems = sortedItems.filter((item) => item.severity.toLowerCase() === 'high').length;
    const mediumItems = sortedItems.filter((item) => item.severity.toLowerCase() === 'medium').length;
    const immediateWindow = sortedItems.filter((item) => item.timeline.toLowerCase().includes('immediate') || item.timeline.toLowerCase().includes('0')).length;
    const remediationDiagram = buildRemediationDiagram(data);
    const remediationDiagramUrl = getMermaidImageUrl(remediationDiagram);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remediation Strategy Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --primary: #10b981; --ink: #0f172a; --muted: #475569; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Source Sans 3', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: var(--ink); line-height: 1.7; font-size: 11pt; }
    .container { max-width: 920px; margin: 0 auto; padding: 40px; }
    .cover { text-align: center; padding: 70px 40px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); color: white; margin: -40px -40px 40px -40px; border-radius: 0 0 24px 24px; position: relative; overflow: hidden; }
    .cover::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 50%, rgba(16,185,129,0.15) 0%, transparent 50%); }
    .cover-title { font-size: 32pt; font-weight: 800; margin-bottom: 8px; color: #10b981; position: relative; letter-spacing: -0.5px; }
    .cover-subtitle { font-size: 14pt; color: #94a3b8; margin-bottom: 28px; position: relative; }
    .cover-meta { font-size: 10pt; color: #64748b; position: relative; }
    .cover-badge { display: inline-block; padding: 6px 18px; border-radius: 20px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #10b981; font-size: 10pt; font-weight: 600; margin-bottom: 20px; position: relative; }
    h1, h2, h3, .cover-title, .item-title, .goal-title { font-family: 'Inter', 'Source Sans 3', sans-serif; }
    h1 { font-size: 22pt; color: #0f172a; margin: 40px 0 20px; border-bottom: 3px solid var(--primary); padding-bottom: 10px; }
    h2 { font-size: 16pt; color: #1e293b; margin: 30px 0 15px; }
    p { margin-bottom: 15px; text-align: justify; }
    .summary-box { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 16px; padding: 28px; margin: 20px 0; }
    .insight-band { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0 8px; }
    .insight-card { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; }
    .insight-label { font-size: 8.5pt; letter-spacing: 0.8px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .insight-value { font-size: 16pt; font-weight: 800; color: #0f172a; margin-top: 6px; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
    .meta-label { font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .meta-value { font-size: 16pt; font-weight: 700; color: #1e293b; margin-top: 6px; }
    .meta-value-sm { font-size: 12pt; font-weight: 600; color: #1e293b; margin-top: 6px; }
    .priority-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
    .priority-tile { border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; background: #fff; }
    .priority-tile-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.9px; color: #64748b; font-weight: 700; }
    .priority-tile-value { font-size: 18pt; font-weight: 800; margin-top: 6px; }

    /* Timeline */
    .timeline-section { margin: 30px 0; }
    .timeline-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
    .timeline-card { border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff; }
    .timeline-card-header { padding: 14px 18px; color: white; display: flex; align-items: center; justify-content: space-between; }
    .timeline-card-header h4 { font-size: 11pt; font-weight: 700; margin: 0; }
    .timeline-card-header .badge { background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 12px; font-size: 8pt; font-weight: 600; }
    .timeline-card-body { padding: 14px 18px; }
    .timeline-card-body ul { list-style: none; padding: 0; margin: 0; }
    .timeline-card-body li { padding: 6px 0; font-size: 9.5pt; color: #374151; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; gap: 8px; }
    .timeline-card-body li:last-child { border-bottom: none; }
    .timeline-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .timeline-progress { height: 6px; background: #e2e8f0; border-radius: 3px; margin: 10px 18px 14px; overflow: hidden; }
    .timeline-progress-bar { height: 100%; border-radius: 3px; }
    .diagram-shell { margin: 26px 0; padding: 22px; border: 1px solid #dbeafe; border-radius: 18px; background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%); }
    .diagram-shell img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    .diagram-caption { margin-top: 14px; font-size: 9.5pt; color: #475569; }

    .quick-wins { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 5px solid #f59e0b; border-radius: 0 14px 14px 0; padding: 22px; margin: 24px 0; }
    .quick-wins h3 { color: #92400e; margin-top: 0; font-size: 13pt; }
    .quick-wins ul { margin: 0; padding-left: 20px; }
    .quick-wins li { margin: 8px 0; color: #78350f; font-size: 10pt; }

    .item-card { border: 1px solid #e2e8f0; border-radius: 14px; margin: 18px 0; overflow: hidden; transition: box-shadow 0.2s; }
    .item-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .item-header { background: #f8fafc; padding: 16px 22px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #e2e8f0; }
    .item-priority { width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15pt; flex-shrink: 0; }
    .item-title { flex: 1; font-weight: 700; font-size: 12pt; }
    .item-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .item-body { padding: 22px; }
    .item-meta { display: flex; gap: 24px; margin-bottom: 16px; font-size: 10pt; color: #64748b; }
    .item-meta span { display: flex; align-items: center; gap: 4px; }
    .steps-list { background: #f8fafc; border-radius: 10px; padding: 16px 16px 16px 38px; margin-top: 16px; border: 1px solid #f1f5f9; }
    .steps-list li { margin: 10px 0; color: #374151; font-size: 10pt; line-height: 1.6; }
    .steps-list li::marker { color: var(--primary); font-weight: 700; }

    .goal-card { border: 1px solid #e2e8f0; border-radius: 14px; margin: 16px 0; overflow: hidden; }
    .goal-header { padding: 16px 22px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; }
    .goal-title { font-weight: 700; font-size: 11pt; }
    .goal-badges { display: flex; gap: 8px; }
    .goal-badge { padding: 4px 12px; border-radius: 15px; font-size: 9pt; font-weight: 600; }
    .goal-body { padding: 18px 22px; }
    .goal-benefits, .goal-steps { margin-top: 12px; padding-left: 20px; }
    .goal-benefits li, .goal-steps li { margin: 6px 0; font-size: 10pt; }

    .footer { text-align: center; padding: 36px; color: #64748b; font-size: 9pt; border-top: 2px solid #e5e7eb; margin-top: 50px; }
    .footer-logo { font-weight: 700; color: #10b981; font-size: 11pt; margin-bottom: 6px; }

    @media print { .container { padding: 20px; } .cover { margin: -20px -20px 30px -20px; padding: 50px 30px; } }
    @media (max-width: 860px) { .insight-band, .meta-grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <div class="cover-badge">SECURITY REMEDIATION PLAN</div>
      <div class="cover-title">Remediation Strategy</div>
      <div class="cover-subtitle">Security Improvement Roadmap & Action Plan</div>
      <div class="cover-meta">
        Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | ${data.items.length} Remediation Items
      </div>
    </div>

    <h1>Executive Summary</h1>
    <div class="summary-box">
      ${renderRichTextParagraphs(data.executive_summary)}
    </div>

    <div class="insight-band">
      <div class="insight-card">
        <div class="insight-label">Critical Items</div>
        <div class="insight-value">${criticalItems}</div>
      </div>
      <div class="insight-card">
        <div class="insight-label">High Items</div>
        <div class="insight-value">${highItems}</div>
      </div>
      <div class="insight-card">
        <div class="insight-label">Quick Wins</div>
        <div class="insight-value">${data.quick_wins.length}</div>
      </div>
      <div class="insight-card">
        <div class="insight-label">Long-term Goals</div>
        <div class="insight-value">${data.long_term_goals.length}</div>
      </div>
    </div>

    <div class="priority-overview">
      <div class="priority-tile">
        <div class="priority-tile-label">Immediate Window</div>
        <div class="priority-tile-value" style="color:#dc2626;">${immediateWindow}</div>
      </div>
      <div class="priority-tile">
        <div class="priority-tile-label">Critical</div>
        <div class="priority-tile-value" style="color:#dc2626;">${criticalItems}</div>
      </div>
      <div class="priority-tile">
        <div class="priority-tile-label">High</div>
        <div class="priority-tile-value" style="color:#ea580c;">${highItems}</div>
      </div>
      <div class="priority-tile">
        <div class="priority-tile-label">Medium</div>
        <div class="priority-tile-value" style="color:#d97706;">${mediumItems}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Total Effort</div>
        <div class="meta-value-sm">${escapeReportHtml(data.total_effort)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Timeline</div>
        <div class="meta-value-sm">${escapeReportHtml(data.recommended_timeline)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Items</div>
        <div class="meta-value">${data.items.length}</div>
      </div>
    </div>

    <h1>Remediation Program Map</h1>
    <div class="diagram-shell">
      <img src="${remediationDiagramUrl}" alt="Remediation Program Diagram" />
      <p class="diagram-caption">This visual summarizes the immediate quick wins, phased remediation workstreams, and long-term strategic outcomes derived from the prioritized remediation plan.</p>
    </div>

    ${phases.length > 0 ? `
    <h1>Remediation Timeline</h1>
    <div class="timeline-grid">
      ${phases.map((phase, idx) => `
      <div class="timeline-card">
        <div class="timeline-card-header" style="background: linear-gradient(135deg, ${phase.color}, ${phase.color}dd);">
          <h4>${phase.name}</h4>
          <span class="badge">${escapeReportHtml(phase.timeline)}</span>
        </div>
        <div class="timeline-card-body">
          <ul>
            ${phase.items.map(item => `<li><span class="timeline-dot" style="background: ${phase.color};"></span>${escapeReportHtml(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="timeline-progress">
          <div class="timeline-progress-bar" style="width: ${Math.round(((idx + 1) / phases.length) * 100)}%; background: ${phase.color};"></div>
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${data.quick_wins.length > 0 ? `
    <div class="quick-wins">
      <h3>Quick Wins — Immediate Impact</h3>
      <ul>
        ${data.quick_wins.map(win => `<li>${escapeReportHtml(win)}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <h1>Prioritized Remediation Items</h1>
    ${sortedItems.map(item => {
      const sc = getSeverityHTMLColor(item.severity);
      return `
    <div class="item-card">
      <div class="item-header">
        <div class="item-priority">${item.priority}</div>
        <div class="item-title">${escapeReportHtml(item.title)}</div>
        <span class="item-badge" style="background: ${sc.bg}; color: ${sc.text}; border: 1px solid ${sc.border};">${escapeReportHtml(item.severity)}</span>
      </div>
      <div class="item-body">
        <div class="item-meta">
          <span>Effort: <strong>${escapeReportHtml(item.effort)}</strong></span>
          <span>Timeline: <strong>${escapeReportHtml(item.timeline)}</strong></span>
        </div>
        ${renderRichTextParagraphs(item.description)}
        <ol class="steps-list">
          ${item.steps.map(step => `<li>${escapeReportHtml(step)}</li>`).join('')}
        </ol>
        ${item.dependencies?.length ? `
          <div style="margin-top: 16px; font-size: 10pt; color: #475569;">
            <strong style="color: #0f172a;">Dependencies:</strong> ${item.dependencies.map((dependency) => escapeReportHtml(dependency)).join(', ')}
          </div>` : ''}
      </div>
    </div>`;
    }).join('')}

    ${data.long_term_goals.length > 0 ? `
    <h1>Long-term Security Goals</h1>
    ${data.long_term_goals.map((goal, idx) => {
      if (typeof goal === 'string') {
        return `<div class="goal-card"><div class="goal-body"><p><strong>${idx + 1}.</strong> ${escapeReportHtml(goal)}</p></div></div>`;
      }
      return `
      <div class="goal-card">
        <div class="goal-header" style="background: ${getCategoryColor(goal.category)}08; border-left: 5px solid ${getCategoryColor(goal.category)};">
          <div class="goal-title">${escapeReportHtml(goal.goal)}</div>
          <div class="goal-badges">
            <span class="goal-badge" style="background: ${getCategoryColor(goal.category)}18; color: ${getCategoryColor(goal.category)};">${escapeReportHtml(goal.category)}</span>
            <span class="goal-badge" style="background: #f1f5f9; color: #64748b;">${escapeReportHtml(goal.timeframe)}</span>
          </div>
        </div>
        <div class="goal-body">
          ${renderRichTextParagraphs(goal.description)}
          ${goal.benefits?.length > 0 ? `
          <strong style="font-size: 10pt; color: #10b981;">✅ Benefits:</strong>
          <ul class="goal-benefits">
            ${goal.benefits.map(b => `<li>${escapeReportHtml(b)}</li>`).join('')}
          </ul>` : ''}
          ${goal.implementation_steps?.length > 0 ? `
          <strong style="font-size: 10pt; color: #3b82f6;">Implementation Steps:</strong>
          <ol class="goal-steps">
            ${goal.implementation_steps.map(s => `<li>${escapeReportHtml(s)}</li>`).join('')}
          </ol>` : ''}
        </div>
      </div>`;
    }).join('')}
    ` : ''}

    <div class="footer">
      <div class="footer-logo">Remediation Strategy Report</div>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>
</body>
</html>`;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      info: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[severity.toLowerCase()] || colors.info;
  };

  const getEffortColor = (effort: string) => {
    const e = effort.toLowerCase();
    if (e.includes('low') || e.includes('easy')) return 'bg-green-500/20 text-green-400';
    if (e.includes('medium') || e.includes('moderate')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Policy': 'bg-blue-500/20 text-blue-400',
      'Process': 'bg-purple-500/20 text-purple-400',
      'Technology': 'bg-green-500/20 text-green-400',
      'Training': 'bg-yellow-500/20 text-yellow-400',
      'Monitoring': 'bg-red-500/20 text-red-400',
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  const remediationDiagram = data ? buildRemediationDiagram(data) : null;
  const remediationDiagramUrl = remediationDiagram ? getMermaidImageUrl(remediationDiagram) : null;

  useEffect(() => {
    setDiagramRenderError(false);
  }, [remediationDiagram]);

  if (initialLoading) {
    return (
      <div className="space-y-6 mt-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p>{t.common?.loading || 'Loading...'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            {t.ui?.remediationStrategy || 'Remediation Strategy'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t.ui?.remediationStrategyDesc || 'AI-generated prioritized remediation plan with timeline'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.id && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <div className="leading-tight">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Client portal</p>
                <p className="text-xs text-muted-foreground">
                  {data.client_visible ? 'Shared with client' : 'Hidden from client'}
                </p>
              </div>
              <Switch
                checked={data.client_visible === true}
                disabled={updatingVisibility}
                onCheckedChange={handleToggleClientVisibility}
                aria-label="Toggle client visibility for remediation strategy"
              />
            </div>
          )}
          {data && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportHTML}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.ui?.delete || 'Delete'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.ui?.confirmDelete || 'Delete Remediation Strategy?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.ui?.deleteRemediationWarning || 'This will delete the remediation strategy. This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.common?.close || 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      {t.ui?.delete || 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button 
            onClick={generateStrategy} 
            disabled={loading}
            variant={data ? 'outline' : 'default'}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {data ? (t.ui?.regenerate || 'Regenerate') : (t.ui?.generate || 'Generate')}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">{t.ui?.generatingRemediation || 'Generating Remediation Strategy...'}</p>
                <p className="text-sm">{t.ui?.aiAnalyzing || 'AI is analyzing vulnerabilities and creating prioritized remediation plan'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!loading && !data && !error && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Wrench className="h-12 w-12 opacity-50" />
              <div className="text-center">
                <p className="font-medium">{t.ui?.noRemediationStrategy || 'No Remediation Strategy Generated'}</p>
                <p className="text-sm">{t.ui?.clickGenerateRemediation || 'Click "Generate" to create a prioritized remediation plan based on project vulnerabilities'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Display */}
      {!loading && data && (
        <>
          {/* Metadata */}
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" className="text-sm">
              {data.items.length} {t.ui?.remediationItems || 'remediation items'}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              {data.total_effort}
            </Badge>
            {data.updatedAt && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {t.ui?.lastGenerated || 'Last generated'}: {format(new Date(data.updatedAt), 'PPp')}
              </span>
            )}
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-primary" />
                {t.ui?.executiveSummary || 'Executive Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.executive_summary}</p>
              <div className="mt-4 pt-4 border-t flex gap-4 flex-wrap">
                <div>
                  <span className="text-xs text-muted-foreground">{t.ui?.totalEffort || 'Total Effort'}</span>
                  <p className="font-medium">{data.total_effort}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t.ui?.recommendedTimeline || 'Recommended Timeline'}</span>
                  <p className="font-medium">{data.recommended_timeline}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Wins */}
          {data.quick_wins.length > 0 && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  {t.ui?.quickWins || 'Quick Wins'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.quick_wins.map((win, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      {win}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {remediationDiagramUrl && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Remediation Program Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  {!diagramRenderError ? (
                    <img
                      src={remediationDiagramUrl}
                      alt="Remediation program diagram"
                      className="mx-auto h-auto max-w-full"
                      onError={() => setDiagramRenderError(true)}
                    />
                  ) : (
                    <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
                      <p className="text-sm font-medium">Diagram preview unavailable</p>
                      <p className="text-sm text-muted-foreground">
                        The visual preview could not be rendered, but the roadmap structure is still available below.
                      </p>
                      <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
                        {remediationDiagram}
                      </pre>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Visual summary of immediate quick wins, phased remediation workstreams, and strategic long-term outcomes.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Prioritized Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                {t.ui?.prioritizedRemediation || 'Prioritized Remediation Items'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[36rem] overflow-y-auto pr-2">
                <div className="space-y-4">
                  {data.items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {item.priority}
                          </div>
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] ${getSeverityColor(item.severity)}`}>
                                {item.severity}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${getEffortColor(item.effort)}`}>
                                {item.effort}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                <Clock className="h-3 w-3 mr-1" />
                                {item.timeline}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium mb-2">{t.ui?.steps || 'Steps'}:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {item.steps.map((step, stepIdx) => (
                            <li key={stepIdx} className="text-xs text-muted-foreground">{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Long-term Goals */}
          {data.long_term_goals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  {t.ui?.longTermGoals || 'Long-term Security Goals'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="max-h-[32rem] overflow-y-auto pr-2">
                    <div className="space-y-4">
                    {data.long_term_goals.map((goal, idx) => {
                      if (typeof goal === 'string') {
                        return (
                          <div key={idx} className="flex items-start gap-2 text-sm p-3 rounded-lg bg-muted/30">
                            <Target className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                            {goal}
                          </div>
                        );
                      }
                      
                      return (
                        <div key={idx} className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <Target className="h-5 w-5 text-purple-400" />
                              <div>
                                <h4 className="font-medium">{goal.goal}</h4>
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className={`text-[10px] ${getCategoryColor(goal.category)}`}>
                                    {goal.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px]">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {goal.timeframe}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                          
                          {goal.benefits?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-green-400 mb-1">Benefits:</p>
                              <ul className="space-y-1">
                                {goal.benefits.map((benefit, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {goal.implementation_steps?.length > 0 && (
                            <div className="bg-muted/30 rounded-lg p-3">
                              <p className="text-xs font-medium mb-2">Implementation Steps:</p>
                              <ol className="list-decimal list-inside space-y-1">
                                {goal.implementation_steps.map((step, sIdx) => (
                                  <li key={sIdx} className="text-xs text-muted-foreground">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}