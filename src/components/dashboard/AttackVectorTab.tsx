import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, AlertTriangle, Clock, Target, Zap, Download, Trash2, History, Calendar, Shield, ExternalLink, FileText, Search, Filter, Maximize2, X, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { MitreAttackCoverage } from './MitreAttackCoverage';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AttackVectorTabProps {
  projectId: string;
}

interface TimelinePhase {
  phase: string;
  mitreId?: string;
  duration?: string;
  description?: string;
  vulnerabilities?: string[];
  techniques?: string[];
  actions?: string[];
  tools?: string[];
}

interface MitreMapping {
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

interface SupplementaryDiagrams {
  architectureSchema?: string | null;
  accessSchema?: string | null;
  securityFindingsSchema?: string | null;
}

interface ParsedAttackVectorPayload {
  phases: TimelinePhase[];
  mitreMapping: MitreMapping[];
  supplementaryDiagrams: SupplementaryDiagrams;
}

interface AttackVectorData {
  id?: string;
  client_visible?: boolean;
  diagram: string | null;
  description: string;
  timeline: TimelinePhase[];
  mitreMapping: MitreMapping[];
  supplementaryDiagrams: SupplementaryDiagrams;
  vulnerabilityCount: number;
  updatedAt?: string;
}

interface AttackVectorVersion {
  id: string;
  version_number: number;
  diagram: string | null;
  description: string;
  timeline: TimelinePhase[];
  mitreMapping: MitreMapping[];
  supplementaryDiagrams: SupplementaryDiagrams;
  vulnerability_count: number;
  created_at: string;
}

type DiagramKey = 'attackFlow' | 'architectureSchema' | 'accessSchema' | 'securityFindingsSchema';

const defaultSupplementaryDiagrams: SupplementaryDiagrams = {
  architectureSchema: null,
  accessSchema: null,
  securityFindingsSchema: null,
};

function escapeAttackVectorHtml(value: string | undefined | null) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAttackVectorParagraphs(value: string | undefined | null) {
  return (value || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeAttackVectorHtml(part)}</p>`)
    .join('');
}

function parseAttackVectorPayload(raw: unknown): ParsedAttackVectorPayload {
  if (!raw) {
    return {
      phases: [],
      mitreMapping: [],
      supplementaryDiagrams: defaultSupplementaryDiagrams,
    };
  }

  try {
    const parsedRaw = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (Array.isArray(parsedRaw)) {
      return {
        phases: parsedRaw as TimelinePhase[],
        mitreMapping: [],
        supplementaryDiagrams: defaultSupplementaryDiagrams,
      };
    }

    if (typeof parsedRaw === 'object') {
      const payload = parsedRaw as {
        phases?: TimelinePhase[];
        mitreMapping?: MitreMapping[];
        supplementaryDiagrams?: SupplementaryDiagrams;
      };

      return {
        phases: payload.phases || [],
        mitreMapping: payload.mitreMapping || [],
        supplementaryDiagrams: {
          ...defaultSupplementaryDiagrams,
          ...(payload.supplementaryDiagrams || {}),
        },
      };
    }
  } catch {
    return {
      phases: [],
      mitreMapping: [],
      supplementaryDiagrams: defaultSupplementaryDiagrams,
    };
  }

  return {
    phases: [],
    mitreMapping: [],
    supplementaryDiagrams: defaultSupplementaryDiagrams,
  };
}

export function AttackVectorTab({ projectId }: AttackVectorTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [data, setData] = useState<AttackVectorData | null>(null);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<AttackVectorVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [activeDiagramTab, setActiveDiagramTab] = useState<DiagramKey>('attackFlow');
  const [activeDiagramModal, setActiveDiagramModal] = useState<DiagramKey>('attackFlow');
  const [diagramRenderErrors, setDiagramRenderErrors] = useState<Record<string, boolean>>({});
  const [diagramZooms, setDiagramZooms] = useState<Record<string, number>>({
    attackFlow: 1,
    architectureSchema: 1,
    accessSchema: 1,
    securityFindingsSchema: 1,
  });
  
  // MITRE filtering state
  const [mitreSearchQuery, setMitreSearchQuery] = useState('');
  const [mitreTacticFilter, setMitreTacticFilter] = useState<string>('all');
  const [mitreDetectionFilter, setMitreDetectionFilter] = useState<string>('all');
  const [mitreMitigationFilter, setMitreMitigationFilter] = useState<string>('all');
  const [mitreSort, setMitreSort] = useState<'confidence' | 'tactic' | 'technique' | 'vulnerability'>('confidence');

  // Load existing attack vector on mount
  useEffect(() => {
    loadExistingAttackVector();
  }, [projectId]);

  // Reset diagram state when the generated content changes
  useEffect(() => {
    setDiagramRenderErrors({});
    setDiagramZooms({
      attackFlow: 1,
      architectureSchema: 1,
      accessSchema: 1,
      securityFindingsSchema: 1,
    });
    setActiveDiagramTab('attackFlow');
    setActiveDiagramModal('attackFlow');
  }, [data?.diagram, data?.supplementaryDiagrams?.architectureSchema, data?.supplementaryDiagrams?.accessSchema, data?.supplementaryDiagrams?.securityFindingsSchema]);

  const loadExistingAttackVector = async () => {
    setInitialLoading(true);
    setError(null);

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('attack_vectors')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading attack vector:', fetchError);
        setError(fetchError.message);
      } else if (existing) {
        const payload = parseAttackVectorPayload(existing.timeline);

        setData({
          id: existing.id,
          client_visible: existing.client_visible ?? false,
          diagram: existing.diagram,
          description: existing.description,
          timeline: payload.phases,
          mitreMapping: payload.mitreMapping,
          supplementaryDiagrams: payload.supplementaryDiagrams,
          vulnerabilityCount: existing.vulnerability_count || 0,
          updatedAt: existing.updated_at,
        });

        // Load versions
        loadVersions(existing.id);
      }
    } catch (err) {
      console.error('Error loading attack vector:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadVersions = async (attackVectorId: string) => {
    const { data: versionData, error } = await supabase
      .from('attack_vector_versions')
      .select('*')
      .eq('attack_vector_id', attackVectorId)
      .order('version_number', { ascending: false });

    if (!error && versionData) {
      const parsedVersions = versionData.map(v => {
        const payload = parseAttackVectorPayload(v.timeline);
        return {
          ...v,
          timeline: payload.phases,
          mitreMapping: payload.mitreMapping,
          supplementaryDiagrams: payload.supplementaryDiagrams,
        };
      });
      setVersions(parsedVersions as AttackVectorVersion[]);
    }
  };

  const generateAttackVector = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: funcError } = await supabase.functions.invoke('generate-attack-vector', {
        body: { projectId }
      });

      if (funcError) throw funcError;
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData({
        id: result.id,
        client_visible: result.client_visible ?? data?.client_visible ?? false,
        diagram: result.diagram,
        description: result.description,
        timeline: result.timeline || [],
        mitreMapping: result.mitreMapping || [],
        supplementaryDiagrams: {
          ...defaultSupplementaryDiagrams,
          ...(result.supplementaryDiagrams || {}),
        },
        vulnerabilityCount: result.vulnerabilityCount,
        updatedAt: result.savedAt,
      });

      // Reload versions if we have an ID
      if (result.id) {
        loadVersions(result.id);
      }

      toast({ title: t.ui?.attackVectorGenerated || 'Attack vector generated and saved' });
    } catch (err) {
      console.error('Error generating attack vector:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate attack vector';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, t]);

  const handleDelete = async () => {
    try {
      const { error: funcError } = await supabase.functions.invoke('generate-attack-vector', {
        body: { projectId, action: 'delete' }
      });

      if (funcError) throw funcError;

      setData(null);
      setVersions([]);
      toast({ title: t.ui?.attackVectorDeleted || 'Attack vector deleted' });
    } catch (err) {
      console.error('Error deleting attack vector:', err);
      toast({ title: 'Failed to delete attack vector', variant: 'destructive' });
    }
  };

  const handleToggleClientVisibility = async (clientVisible: boolean) => {
    if (!data?.id) return;

    setUpdatingVisibility(true);
    try {
      const { error: updateError } = await supabase
        .from('attack_vectors')
        .update({ client_visible: clientVisible })
        .eq('id', data.id);

      if (updateError) throw updateError;

      setData((current) => current ? { ...current, client_visible: clientVisible } : current);
      toast({ title: clientVisible ? 'Attack vector shared with client portal' : 'Attack vector hidden from client portal' });
    } catch (err) {
      console.error('Error updating attack vector visibility:', err);
      toast({ title: 'Failed to update attack vector visibility', variant: 'destructive' });
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleRestoreVersion = (version: AttackVectorVersion) => {
    setData({
      id: data?.id,
      diagram: version.diagram,
      description: version.description,
      timeline: version.timeline,
      mitreMapping: version.mitreMapping || data?.mitreMapping || [],
      supplementaryDiagrams: version.supplementaryDiagrams || data?.supplementaryDiagrams || defaultSupplementaryDiagrams,
      vulnerabilityCount: version.vulnerability_count,
      updatedAt: version.created_at,
    });
    setShowVersionHistory(false);
    toast({ title: t.ui?.versionRestored || 'Version restored (view only - regenerate to save)' });
  };

  const handleExportHTML = () => {
    if (!data) return;

    const html = generateHTMLReport(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack_vector_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = (data: AttackVectorData): string => {
    const diagramEncoded = data.diagram ? btoa(unescape(encodeURIComponent(data.diagram))) : null;
    const diagramUrl = diagramEncoded ? `https://mermaid.ink/svg/${diagramEncoded}` : null;
    const uniqueTactics = Array.from(new Set((data.mitreMapping || []).map((item) => item.tacticId))).length;
    const uniqueTechniques = Array.from(new Set((data.mitreMapping || []).map((item) => item.techniqueId))).length;
    const detectionCoverage = data.mitreMapping.length > 0
      ? Math.round((data.mitreMapping.filter((item) => Boolean(item.detection)).length / data.mitreMapping.length) * 100)
      : 0;
    const mitigationCoverage = data.mitreMapping.length > 0
      ? Math.round((data.mitreMapping.filter((item) => Boolean(item.mitigation)).length / data.mitreMapping.length) * 100)
      : 0;
    const supplementarySections = [
      {
        title: 'Architecture Schema',
        description: 'High-level representation of trust boundaries, system components, and likely attack entry points.',
        diagram: data.supplementaryDiagrams?.architectureSchema,
      },
      {
        title: 'Access Schema',
        description: 'Identity, privilege, and access relationships relevant to the modeled attack path.',
        diagram: data.supplementaryDiagrams?.accessSchema,
      },
      {
        title: 'Security Findings Schema',
        description: 'Relationship map between findings, affected assets, and the likely exploitation sequence.',
        diagram: data.supplementaryDiagrams?.securityFindingsSchema,
      },
    ].filter((section) => Boolean(section.diagram)).map((section) => ({
      ...section,
      diagramUrl: section.diagram ? `https://mermaid.ink/svg/${btoa(unescape(encodeURIComponent(section.diagram)))}` : null,
    }));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attack Vector Analysis Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Source Sans 3', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: #1f2937; line-height: 1.7; font-size: 11pt; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px; }
    .cover { padding: 64px 44px; background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 55%, #111827 100%); color: white; margin: -40px -40px 40px -40px; border-radius: 0 0 24px 24px; position: relative; overflow: hidden; }
    .cover::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 28%); }
    .cover > * { position: relative; }
    .cover-badge { display: inline-flex; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); font-size: 9pt; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; margin-bottom: 20px; }
    .cover-title { font-size: 30pt; font-weight: 800; margin-bottom: 10px; color: #fee2e2; }
    .cover-subtitle { font-size: 14pt; color: #fecaca; margin-bottom: 26px; }
    .cover-meta { font-size: 10pt; color: #fde68a; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 0 0 28px; }
    .summary-card { border: 1px solid #e2e8f0; border-radius: 14px; background: linear-gradient(180deg, #fff 0%, #f8fafc 100%); padding: 18px; }
    .summary-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; }
    .summary-value { font-size: 18pt; font-weight: 800; color: #0f172a; margin-top: 8px; }
    .insight-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 0 0 28px; }
    .insight-card { border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; padding: 18px; }
    .insight-value { font-size: 16pt; font-weight: 800; color: #7f1d1d; margin-top: 6px; }
    h1 { font-size: 22pt; color: #0f172a; margin: 40px 0 20px; border-bottom: 3px solid #dc2626; padding-bottom: 10px; }
    h2 { font-size: 16pt; color: #1e293b; margin: 30px 0 15px; }
    h3 { font-size: 13pt; color: #374151; margin: 20px 0 10px; }
    p { margin-bottom: 15px; text-align: justify; }
    .diagram-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .diagram-container img { max-width: 100%; height: auto; }
    .scenario-box { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fecaca; border-radius: 12px; padding: 25px; margin: 20px 0; }
    .timeline-item { border-left: 4px solid; padding: 15px 20px; margin: 15px 0; border-radius: 0 10px 10px 0; }
    .timeline-phase-0 { border-color: #3b82f6; background: #eff6ff; }
    .timeline-phase-1 { border-color: #eab308; background: #fefce8; }
    .timeline-phase-2 { border-color: #f97316; background: #fff7ed; }
    .timeline-phase-3 { border-color: #ef4444; background: #fef2f2; }
    .timeline-phase-4 { border-color: #8b5cf6; background: #f5f3ff; }
    .timeline-title { font-weight: 600; font-size: 12pt; margin-bottom: 5px; }
    .timeline-meta { font-size: 9pt; color: #64748b; margin-bottom: 10px; }
    .timeline-desc { font-size: 10pt; }
    .mitre-card { border: 1px solid #e2e8f0; border-radius: 12px; margin: 15px 0; overflow: hidden; page-break-inside: avoid; }
    .mitre-header { padding: 15px; background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%); border-bottom: 1px solid #e2e8f0; }
    .mitre-vuln { font-weight: 600; font-size: 11pt; }
    .mitre-badges { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .mitre-badge { padding: 3px 10px; border-radius: 15px; font-size: 9pt; font-weight: 500; }
    .badge-tactic { background: #8b5cf6; color: white; }
    .badge-technique { background: #e2e8f0; color: #374151; }
    .mitre-body { padding: 15px; }
    .mitre-section { margin-bottom: 12px; }
    .mitre-section-title { font-size: 9pt; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
    .detection-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin: 8px 0; }
    .mitigation-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 8px 0; }
    .footer { text-align: center; padding: 30px; color: #64748b; font-size: 9pt; border-top: 1px solid #e5e7eb; margin-top: 40px; }
    @media print { .cover { page-break-after: always; } .mitre-card { page-break-inside: avoid; } }
    @media (max-width: 820px) { .summary-grid, .insight-grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <div class="cover-badge">Threat Path Modeling</div>
      <div class="cover-title">Attack Vector Analysis</div>
      <div class="cover-subtitle">Threat Modeling & MITRE ATT&CK Mapping</div>
      <div class="cover-meta">
        ${data.vulnerabilityCount} Vulnerabilities Analyzed<br>
        Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Findings Modeled</div>
        <div class="summary-value">${data.vulnerabilityCount}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Timeline Phases</div>
        <div class="summary-value">${data.timeline?.length || 0}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">MITRE Mappings</div>
        <div class="summary-value">${data.mitreMapping?.length || 0}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Supplementary Diagrams</div>
        <div class="summary-value">${supplementarySections.length}</div>
      </div>
    </div>

    <div class="insight-grid">
      <div class="insight-card">
        <div class="summary-label">Mapped Tactics</div>
        <div class="insight-value">${uniqueTactics}</div>
      </div>
      <div class="insight-card">
        <div class="summary-label">Unique Techniques</div>
        <div class="insight-value">${uniqueTechniques}</div>
      </div>
      <div class="insight-card">
        <div class="summary-label">Detection Coverage</div>
        <div class="insight-value">${detectionCoverage}%</div>
      </div>
      <div class="insight-card">
        <div class="summary-label">Mitigation Coverage</div>
        <div class="insight-value">${mitigationCoverage}%</div>
      </div>
    </div>

    ${diagramUrl ? `
    <h1>Attack Flow Diagram</h1>
    <div class="diagram-container">
      <img src="${diagramUrl}" alt="Attack Flow Diagram" />
      <p style="margin-top: 15px; font-size: 9pt; color: #64748b;">Node colors indicate severity: Red = Critical, Orange = High, Yellow = Medium, Green = Low, Blue = Info</p>
    </div>
    ` : ''}

    <h1>Attack Scenario Description</h1>
    <div class="scenario-box">
      ${renderAttackVectorParagraphs(data.description)}
    </div>

    ${supplementarySections.length > 0 ? `
    <h1>Supporting Schemas</h1>
    ${supplementarySections.map((section) => `
      <h2>${escapeAttackVectorHtml(section.title)}</h2>
      <p style="color: #475569; margin-bottom: 12px;">${escapeAttackVectorHtml(section.description)}</p>
      <div class="diagram-container">
        <img src="${section.diagramUrl}" alt="${escapeAttackVectorHtml(section.title)}" />
      </div>
    `).join('')}
    ` : ''}

    ${data.timeline && data.timeline.length > 0 ? `
    <h1>Attack Timeline</h1>
    ${data.timeline.map((phase, idx) => `
    <div class="timeline-item timeline-phase-${idx % 5}">
      <div class="timeline-title">${escapeAttackVectorHtml(phase.phase)}</div>
      <div class="timeline-meta">
        Duration: ${escapeAttackVectorHtml(phase.duration || 'Not specified')} ${phase.mitreId ? `| MITRE: ${escapeAttackVectorHtml(phase.mitreId)}` : ''}
      </div>
      <div class="timeline-desc">${escapeAttackVectorHtml(phase.description || '')}</div>
      ${phase.vulnerabilities && phase.vulnerabilities.length > 0 ? `
      <div style="margin-top: 10px;">
        <strong style="font-size: 9pt;">Exploited Vulnerabilities:</strong>
        <ul style="font-size: 9pt; padding-left: 20px; margin-top: 5px;">
          ${phase.vulnerabilities.map(v => `<li>${escapeAttackVectorHtml(v)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    `).join('')}
    ` : `
    <h1>Attack Timeline</h1>
    <div class="scenario-box">
      <p>No detailed attack timeline was available in the generated payload. Regenerate the attack vector to refresh the modeled sequence.</p>
    </div>
    `}

    ${data.mitreMapping && data.mitreMapping.length > 0 ? `
    <h1>MITRE ATT&CK Mapping</h1>
    ${data.mitreMapping.map(mapping => `
    <div class="mitre-card">
      <div class="mitre-header">
        <div class="mitre-vuln">${escapeAttackVectorHtml(mapping.vulnerability)}</div>
        <div class="mitre-badges">
          <span class="mitre-badge badge-tactic">${escapeAttackVectorHtml(mapping.tacticId)} - ${escapeAttackVectorHtml(mapping.tacticName)}</span>
          <span class="mitre-badge badge-technique">${escapeAttackVectorHtml(mapping.techniqueId)} - ${escapeAttackVectorHtml(mapping.techniqueName)}</span>
          ${mapping.subTechnique ? `<span class="mitre-badge badge-technique">${escapeAttackVectorHtml(mapping.subTechnique)}</span>` : ''}
        </div>
      </div>
      <div class="mitre-body">
        <div class="mitre-section">
          <div class="mitre-section-title">Attack Vector Explanation</div>
          <p style="font-size: 10pt; margin: 0;">${escapeAttackVectorHtml(mapping.explanation)}</p>
        </div>
        ${mapping.detection ? `
        <div class="detection-box">
          <div class="mitre-section-title" style="color: #2563eb;">Detection Guidance</div>
          <p style="font-size: 10pt; margin: 0;">${escapeAttackVectorHtml(mapping.detection)}</p>
        </div>
        ` : ''}
        ${mapping.mitigation ? `
        <div class="mitigation-box">
          <div class="mitre-section-title" style="color: #16a34a;">Mitigation Strategy</div>
          <p style="font-size: 10pt; margin: 0;">${escapeAttackVectorHtml(mapping.mitigation)}</p>
        </div>
        ` : ''}
        ${mapping.dataSources && mapping.dataSources.length > 0 ? `
        <div class="mitre-section">
          <div class="mitre-section-title">Data Sources</div>
          <p style="font-size: 9pt; margin: 0;">${mapping.dataSources.map((source) => escapeAttackVectorHtml(source)).join(', ')}</p>
        </div>
        ` : ''}
        ${mapping.platforms && mapping.platforms.length > 0 ? `
        <div class="mitre-section">
          <div class="mitre-section-title">Affected Platforms</div>
          <p style="font-size: 9pt; margin: 0;">${mapping.platforms.map((platform) => escapeAttackVectorHtml(platform)).join(', ')}</p>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
    ` : `
    <h1>MITRE ATT&CK Mapping</h1>
    <div class="scenario-box">
      <p>No MITRE ATT&CK mappings were available in this version of the analysis. Regenerate the attack vector to improve coverage and technique detail.</p>
    </div>
    `}

    <div class="footer">
      <p>Attack vector report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Render Mermaid diagram with severity colors
  const renderMermaidDiagram = (diagram: string, diagramKey: DiagramKey, isModal = false) => {
    // Encode the diagram for the Mermaid.ink service
    const encoded = btoa(unescape(encodeURIComponent(diagram)));
    const url = `https://mermaid.ink/svg/${encoded}`;
    const pngUrl = `https://mermaid.ink/img/${encoded}`;
    const zoom = diagramZooms[diagramKey] ?? 1;
    const hasRenderError = Boolean(diagramRenderErrors[diagramKey]);
    
    const diagramHeightClass = isModal ? 'min-h-[65vh]' : 'min-h-[420px] max-h-[520px]';

    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Recon</Badge>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Exploit</Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Impact</Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Low-risk nodes</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDiagramZooms((prev) => ({ ...prev, [diagramKey]: Math.max(0.6, Number(((prev[diagramKey] ?? 1) - 0.1).toFixed(2))) }))}>
                <ZoomOut className="h-4 w-4 mr-2" />
                Zoom out
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDiagramZooms((prev) => ({ ...prev, [diagramKey]: 1 }))}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDiagramZooms((prev) => ({ ...prev, [diagramKey]: Math.min(2, Number(((prev[diagramKey] ?? 1) + 0.1).toFixed(2))) }))}>
                <ZoomIn className="h-4 w-4 mr-2" />
                Zoom in
              </Button>
              {!isModal && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setActiveDiagramModal(diagramKey);
                    setShowDiagramModal(true);
                  }}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Expand
                </Button>
              )}
            </div>
          </div>

          <div className={`relative w-full overflow-auto rounded-lg border border-border/60 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:24px_24px] ${diagramHeightClass}`}>
            <div className="min-w-max p-4 sm:p-6">
              {!hasRenderError ? (
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="transition-transform duration-200">
                  <img 
                    src={url} 
                    alt="Attack Scenario Diagram"
                    className={`${isModal ? 'max-w-full' : 'max-w-full max-h-none'} h-auto mx-auto rounded-md`}
                    onError={() => {
                      console.error('Mermaid diagram failed to render');
                      setDiagramRenderErrors((prev) => ({ ...prev, [diagramKey]: true }));
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-destructive p-8">
                  <p className="font-medium">Diagram Parse Error</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    The diagram could not be rendered. Try regenerating the attack vector.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              Use zoom controls for dense diagrams. Horizontal scroll is enabled for wide attack paths.
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                {t.ui?.downloadSvg || 'Download SVG'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(pngUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                {t.ui?.downloadPng || 'Download PNG'}
              </Button>
            </div>
          </div>
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

  // Get unique tactics for filter
  const uniqueTactics = data?.mitreMapping 
    ? [...new Set(data.mitreMapping.map(m => m.tacticName))].sort()
    : [];

  const uniqueTechniqueCount = data?.mitreMapping
    ? new Set(data.mitreMapping.map((m) => m.techniqueId)).size
    : 0;

  const diagramSections: Array<{ key: DiagramKey; title: string; shortTitle: string; description: string; diagram: string | null }> = data
    ? ([
        {
          key: 'attackFlow',
          title: t.ui?.attackFlowDiagram || 'Attack Flow Diagram',
          shortTitle: 'Attack Flow',
          description: 'Primary exploitation path across the identified findings.',
          diagram: data.diagram,
        },
        {
          key: 'architectureSchema',
          title: 'Architecture Schema',
          shortTitle: 'Architecture',
          description: 'High-level trust boundaries and likely asset relationships inferred from the findings.',
          diagram: data.supplementaryDiagrams.architectureSchema || null,
        },
        {
          key: 'accessSchema',
          title: 'Access Schema',
          shortTitle: 'Access',
          description: 'How an attacker likely moves from exposed entry points to sensitive access.',
          diagram: data.supplementaryDiagrams.accessSchema || null,
        },
        {
          key: 'securityFindingsSchema',
          title: 'Security Findings Schema',
          shortTitle: 'Findings',
          description: 'How the current findings cluster into broader risk themes and severity groups.',
          diagram: data.supplementaryDiagrams.securityFindingsSchema || null,
        },
      ] satisfies Array<{ key: DiagramKey; title: string; shortTitle: string; description: string; diagram: string | null }>).filter((section) => Boolean(section.diagram))
    : [];

  const activeDiagramSection = diagramSections.find((section) => section.key === activeDiagramTab) || diagramSections[0];

  // Filter MITRE mappings
  const filteredMitreMapping = data?.mitreMapping?.filter(mapping => {
    // Search filter
    if (mitreSearchQuery) {
      const query = mitreSearchQuery.toLowerCase();
      const matchesSearch = 
        mapping.vulnerability.toLowerCase().includes(query) ||
        mapping.tacticName.toLowerCase().includes(query) ||
        mapping.techniqueName.toLowerCase().includes(query) ||
        mapping.techniqueId.toLowerCase().includes(query) ||
        mapping.explanation.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Tactic filter
    if (mitreTacticFilter !== 'all' && mapping.tacticName !== mitreTacticFilter) {
      return false;
    }
    
    // Detection filter
    if (mitreDetectionFilter === 'with' && (!mapping.detection || mapping.detection.length === 0)) {
      return false;
    }
    if (mitreDetectionFilter === 'without' && mapping.detection && mapping.detection.length > 0) {
      return false;
    }
    
    // Mitigation filter
    if (mitreMitigationFilter === 'with' && (!mapping.mitigation || mapping.mitigation.length === 0)) {
      return false;
    }
    if (mitreMitigationFilter === 'without' && mapping.mitigation && mapping.mitigation.length > 0) {
      return false;
    }
    
    return true;
  }) || [];

  const sortedMitreMapping = [...filteredMitreMapping].sort((a, b) => {
    switch (mitreSort) {
      case 'tactic':
        return a.tacticName.localeCompare(b.tacticName) || a.techniqueId.localeCompare(b.techniqueId);
      case 'technique':
        return a.techniqueId.localeCompare(b.techniqueId);
      case 'vulnerability':
        return a.vulnerability.localeCompare(b.vulnerability);
      case 'confidence':
      default:
        return (b.confidence || 0) - (a.confidence || 0);
    }
  });

  const mitreSummary = {
    withDetection: filteredMitreMapping.filter((mapping) => Boolean(mapping.detection)).length,
    withMitigation: filteredMitreMapping.filter((mapping) => Boolean(mapping.mitigation)).length,
    averageConfidence: filteredMitreMapping.length > 0
      ? Math.round(filteredMitreMapping.reduce((sum, mapping) => sum + (mapping.confidence || 0), 0) / filteredMitreMapping.length)
      : 0,
  };

  // Initial loading state
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
            <Target className="h-5 w-5 text-primary" />
            {t.ui?.attackScenario || 'Attack Scenario Analysis'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t.ui?.attackScenarioDesc || 'AI-generated attack path based on discovered vulnerabilities'}
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
                aria-label="Toggle client visibility for attack vector"
              />
            </div>
          )}
          {data && versions.length > 0 && (
            <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  {t.ui?.history || 'History'} ({versions.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.ui?.versionHistory || 'Version History'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {versions.map((version) => (
                    <div 
                      key={version.id} 
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">v{version.version_number}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(version.created_at), 'PPp')}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRestoreVersion(version)}
                        >
                          {t.ui?.restore || 'View'}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {version.description.substring(0, 150)}...
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {version.vulnerability_count} vulnerabilities
                      </Badge>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {data && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportHTML}>
                <FileText className="h-4 w-4 mr-2" />
                HTML Report
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
                  <AlertDialogTitle>{t.ui?.confirmDelete || 'Delete Attack Vector?'}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.ui?.deleteAttackVectorWarning || 'This will delete the attack vector and all version history. This action cannot be undone.'}
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
            onClick={generateAttackVector} 
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

      {/* Diagram Modal */}
      <Dialog open={showDiagramModal} onOpenChange={setShowDiagramModal}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              {diagramSections.find((section) => section.key === activeDiagramModal)?.title || 'Diagram'}
            </DialogTitle>
          </DialogHeader>
          {diagramSections.find((section) => section.key === activeDiagramModal)?.diagram &&
            renderMermaidDiagram(
              diagramSections.find((section) => section.key === activeDiagramModal)?.diagram || '',
              activeDiagramModal,
              true
            )}
        </DialogContent>
      </Dialog>

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
                <p className="font-medium">{t.ui?.generatingAttackVector || 'Generating Attack Vector...'}</p>
                <p className="text-sm">{t.ui?.aiAnalyzing || 'AI is analyzing vulnerabilities and creating attack scenarios'}</p>
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
              <Target className="h-12 w-12 opacity-50" />
              <div className="text-center">
                <p className="font-medium">{t.ui?.noAttackVector || 'No Attack Vector Generated'}</p>
                <p className="text-sm">{t.ui?.clickGenerate || 'Click "Generate" to create an attack scenario based on project vulnerabilities'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Display */}
      {!loading && data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Coverage</p>
                <p className="text-2xl font-bold">{data.vulnerabilityCount}</p>
                <p className="text-sm text-muted-foreground">{t.ui?.vulnerabilitiesAnalyzed || 'vulnerabilities analyzed'}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Timeline</p>
                <p className="text-2xl font-bold">{data.timeline?.length || 0}</p>
                <p className="text-sm text-muted-foreground">phases modeled</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">MITRE</p>
                <p className="text-2xl font-bold">{uniqueTechniqueCount}</p>
                <p className="text-sm text-muted-foreground">techniques linked</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Last generated</p>
                <p className="text-sm font-semibold leading-6 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {data.updatedAt ? format(new Date(data.updatedAt), 'PPp') : '—'}
                </p>
                <p className="text-sm text-muted-foreground">{uniqueTactics.length} tactics represented</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-warning" />
                  {activeDiagramSection?.title || (t.ui?.attackFlowDiagram || 'Attack Flow Diagram')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {activeDiagramSection?.description || t.ui?.diagramColorLegend || 'Node colors indicate severity and path intensity across the modeled attack chain.'}
                </p>
              </CardHeader>
              <CardContent>
                {diagramSections.length > 0 ? (
                  <Tabs value={activeDiagramTab} onValueChange={(value) => setActiveDiagramTab(value as DiagramKey)} className="space-y-4">
                    <TabsList className="grid w-full h-auto grid-cols-2 lg:grid-cols-4">
                      {diagramSections.map((section) => (
                        <TabsTrigger key={section.key} value={section.key} className="text-xs sm:text-sm px-2 py-2">
                          <span className="hidden sm:inline">{section.title}</span>
                          <span className="sm:hidden">{section.shortTitle}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {diagramSections.map((section) => (
                      <TabsContent key={section.key} value={section.key} className="mt-0">
                        {section.diagram ? renderMermaidDiagram(section.diagram, section.key) : null}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    No diagram was generated for this attack vector yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attack Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {t.ui?.attackDescription || 'Attack Scenario Description'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 mb-4 text-xs text-muted-foreground">
                  Use this narrative to explain attacker intent, pivot opportunities, and likely business impact before walking stakeholders through the diagram.
                </div>
                <ScrollArea className="h-[360px]">
                  <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {data.description}
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Attack Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {t.ui?.attackTimeline || 'Attack Timeline'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.timeline && data.timeline.length > 0 ? (
                <div className="space-y-4">
                  {data.timeline.map((phase, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-lg border border-border/60 p-4 ${getPhaseColor(idx)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {getPhaseIcon(phase.phase)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{phase.phase || `Phase ${idx + 1}`}</span>
                              {phase.mitreId && (
                                <Badge variant="outline" className="text-xs">{phase.mitreId}</Badge>
                              )}
                            </div>
                            {phase.techniques && phase.techniques.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {phase.techniques.map((technique, tIdx) => (
                                  <Badge key={tIdx} variant="secondary" className="text-[10px]">
                                    {technique}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {phase.duration || 'Estimated'}
                        </Badge>
                      </div>

                      {phase.description && (
                        <p className="text-sm text-muted-foreground mt-3">
                          {phase.description}
                        </p>
                      )}

                      {phase.actions && phase.actions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Actions</p>
                          <ul className="space-y-1 text-sm">
                            {phase.actions.map((action, aIdx) => (
                              <li key={aIdx} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {phase.tools && phase.tools.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Likely Tools / Tradecraft</p>
                          <div className="flex flex-wrap gap-1">
                            {phase.tools.map((tool, toolIdx) => (
                              <Badge key={toolIdx} variant="outline" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {phase.vulnerabilities && phase.vulnerabilities.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Exploited Vulnerabilities</p>
                          <div className="flex flex-wrap gap-1">
                            {phase.vulnerabilities.map((vuln, vidx) => (
                              <Badge key={vidx} variant="outline" className="text-xs">
                                {vuln}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  No attack timeline is available for this version. Regenerate the attack vector to rebuild the phased sequence.
                </div>
              )}
            </CardContent>
          </Card>

          {/* MITRE ATT&CK Coverage Statistics */}
          {data.mitreMapping && data.mitreMapping.length > 0 ? (
            <MitreAttackCoverage mitreMapping={data.mitreMapping} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  MITRE ATT&CK Coverage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  MITRE ATT&CK coverage data is unavailable for this version. Regenerate the attack vector to restore tactic and technique coverage details.
                </div>
              </CardContent>
            </Card>
          )}

          {/* MITRE ATT&CK Mapping - Enhanced with Filtering */}
          <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      MITRE ATT&CK Technique Details
                      <Badge variant="outline" className="ml-2 text-xs">
                        {filteredMitreMapping.length} / {data.mitreMapping.length} techniques
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Review mapped tactics, detection guidance, and mitigation coverage across the generated attack path.
                    </p>
                  </div>
                  <a href="https://attack.mitre.org/" target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      ATT&CK Framework
                    </Button>
                  </a>
                </div>

                {data.mitreMapping && data.mitreMapping.length > 0 ? (
                  <>
                <div className="grid gap-3 sm:grid-cols-3 mt-4">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Average confidence</p>
                    <p className="text-xl font-bold">{mitreSummary.averageConfidence}%</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Detection coverage</p>
                    <p className="text-xl font-bold">{mitreSummary.withDetection}</p>
                    <p className="text-xs text-muted-foreground">techniques with guidance</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Mitigation coverage</p>
                    <p className="text-xl font-bold">{mitreSummary.withMitigation}</p>
                    <p className="text-xs text-muted-foreground">techniques with actions</p>
                  </div>
                </div>
                
                {/* Filter Controls */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vulnerabilities, tactics, techniques..."
                      value={mitreSearchQuery}
                      onChange={(e) => setMitreSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={mitreTacticFilter} onValueChange={setMitreTacticFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by Tactic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tactics</SelectItem>
                      {uniqueTactics.map(tactic => (
                        <SelectItem key={tactic} value={tactic}>{tactic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={mitreDetectionFilter} onValueChange={setMitreDetectionFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Detection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Detection</SelectItem>
                      <SelectItem value="with">With Detection</SelectItem>
                      <SelectItem value="without">Without Detection</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={mitreMitigationFilter} onValueChange={setMitreMitigationFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Mitigation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Mitigation</SelectItem>
                      <SelectItem value="with">With Mitigation</SelectItem>
                      <SelectItem value="without">Without Mitigation</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={mitreSort} onValueChange={(value) => setMitreSort(value as typeof mitreSort)}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confidence">Sort: Confidence</SelectItem>
                      <SelectItem value="tactic">Sort: Tactic</SelectItem>
                      <SelectItem value="technique">Sort: Technique</SelectItem>
                      <SelectItem value="vulnerability">Sort: Vulnerability</SelectItem>
                    </SelectContent>
                  </Select>
                  {(mitreSearchQuery || mitreTacticFilter !== 'all' || mitreDetectionFilter !== 'all' || mitreMitigationFilter !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setMitreSearchQuery('');
                        setMitreTacticFilter('all');
                        setMitreDetectionFilter('all');
                        setMitreMitigationFilter('all');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                  </>
                ) : null}
              </CardHeader>
              <CardContent>
                {data.mitreMapping && data.mitreMapping.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4 pr-4">
                    {filteredMitreMapping.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No techniques match the current filters</p>
                      </div>
                    ) : (
                      sortedMitreMapping.map((mapping, idx) => (
                        <div key={idx} className="rounded-lg border bg-card overflow-hidden">
                          {/* Header */}
                          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              <div className="flex-1">
                                <span className="font-semibold text-sm">{mapping.vulnerability}</span>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                                  <span className="font-medium text-purple-600">{mapping.tacticName}</span>
                                  <span>→</span>
                                  <span className="font-medium">{mapping.techniqueName}</span>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                                <a 
                                  href={`https://attack.mitre.org/tactics/${mapping.tacticId}/`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-600 hover:bg-purple-500/30 cursor-pointer">
                                    {mapping.tacticId}
                                  </Badge>
                                </a>
                                <a 
                                  href={mapping.techniqueUrl || `https://attack.mitre.org/techniques/${mapping.techniqueId}/`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                                    {mapping.techniqueId}
                                  </Badge>
                                </a>
                                {mapping.subTechnique && (
                                  <a 
                                    href={mapping.subTechniqueUrl || `https://attack.mitre.org/techniques/${mapping.techniqueId}/${mapping.subTechnique.split('.')[1]}/`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/50 hover:bg-orange-500/10 cursor-pointer">
                                      {mapping.subTechnique}
                                    </Badge>
                                  </a>
                                )}
                                {typeof mapping.confidence === 'number' && (
                                  <Badge variant="secondary" className="text-xs">
                                    Confidence {Math.round(mapping.confidence)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="p-4 space-y-4">
                            {/* Explanation */}
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                Attack Vector
                              </h5>
                              <p className="text-sm">{mapping.explanation}</p>
                            </div>

                            {mapping.evidence && (
                              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                <h5 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                                  Evidence
                                </h5>
                                <p className="text-sm text-muted-foreground">{mapping.evidence}</p>
                              </div>
                            )}

                            <div className="grid gap-4 lg:grid-cols-2">
                              {mapping.detection && (
                                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg h-full">
                                  <h5 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    Detection Guidance
                                  </h5>
                                  <p className="text-sm text-muted-foreground">{mapping.detection}</p>
                                </div>
                              )}
                              {mapping.mitigation && (
                                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg h-full">
                                  <h5 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Mitigation Strategy
                                  </h5>
                                  <p className="text-sm text-muted-foreground">{mapping.mitigation}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Data Sources & Platforms */}
                            <div className="flex flex-wrap gap-4 pt-2 border-t">
                              {mapping.dataSources && mapping.dataSources.length > 0 && (
                                <div className="flex-1 min-w-[200px]">
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Data Sources</h5>
                                  <div className="flex flex-wrap gap-1">
                                    {mapping.dataSources.map((source, sidx) => (
                                      <Badge key={sidx} variant="secondary" className="text-xs">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {mapping.platforms && mapping.platforms.length > 0 && (
                                <div className="flex-1 min-w-[200px]">
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Platforms</h5>
                                  <div className="flex flex-wrap gap-1">
                                    {mapping.platforms.map((platform, pidx) => (
                                      <Badge key={pidx} variant="outline" className="text-xs">
                                        {platform}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    No MITRE ATT&CK technique details are available for this version. Regenerate the attack vector to enrich tactic, technique, detection, and mitigation coverage.
                  </div>
                )}
              </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}
