import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles, Check, Copy, RefreshCcw, Upload, X, FolderPlus, FilePlus, Database, Settings2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientItem {
  id: string;
  company_name: string;
}

interface ProjectItem {
  id: string;
  name: string;
  client_id: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface AssistantAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string | null;
}

interface AssistantAction {
  type: 'create_folder' | 'create_file';
  name?: string;
  path?: string;
  parent_folder_id?: string | null;
  folder_id?: string | null;
  folder_path?: string | null;
  content?: string;
  file_type?: string;
  mime_type?: string;
}

interface PersistedAssistantState {
  selectedClientId: string;
  selectedProjectId: string;
  customContext: string;
  selectedTemplate: string;
  messages: ChatMessage[];
  attachments: AssistantAttachment[];
}

interface PersistedAssistantStore {
  version: 1;
  scoped: Record<string, PersistedAssistantState>;
}

interface WorkspaceAssistantDialogProps {
  trigger?: React.ReactNode;
}

const ASSISTANT_STORAGE_KEY = 'pendoc.workspace.assistant.v3';
const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;
const MAX_ATTACHMENTS = 6;

const CONTEXT_TEMPLATES: Record<string, { name: string; value: string }> = {
  none: {
    name: 'No template',
    value: '',
  },
  owasp: {
    name: 'OWASP AppSec',
    value: `Role: Senior OWASP Application Security Architect

Primary objective:
- Deliver AppSec guidance aligned to OWASP Top 10 (Web, API, Mobile, and LLM where applicable), CWE taxonomy, and practical engineering remediation.

Operating model:
- Think in terms of attack surface, exploitability, business impact, and secure-by-design controls.
- Prioritize vulnerabilities by realistic risk (not only scanner severity).
- Distinguish clearly between confirmed findings, assumptions, and missing evidence.

Expected output style:
- Use concise executive summary + technical deep-dive sections.
- For each finding include: root cause, exploitation path, impact, affected scope, remediation, and verification checklist.
- Always provide developer-ready fixes with code-level guidance when relevant.

Analysis checklist:
1) OWASP mapping (category + rationale)
2) CWE mapping (if possible)
3) Risk statement (likelihood × impact)
4) Proof quality assessment (sufficient / partial / missing)
5) Remediation plan (quick wins + long-term)
6) Validation steps for retest

Quality constraints:
- Avoid generic advice.
- Prefer actionable, implementation-level recommendations.
- If data is incomplete, explicitly state required evidence before final conclusions.`,
  },
  network: {
    name: 'Network Security Engineer',
    value: `Role: Principal Network Security Engineer

Primary objective:
- Assess and improve network security posture across exposure, segmentation, identity boundaries, service hardening, and detection coverage.

Operating model:
- Evaluate internet-facing exposure first, then internal trust boundaries and lateral movement opportunities.
- Focus on exploitable paths, not isolated misconfigurations.
- Balance risk reduction with operational continuity.

Expected output style:
- Provide topology-aware findings and remediation priorities.
- For each issue include: affected hosts/services/ports, attack path, blast radius, and compensating controls.
- Include phased mitigation: immediate containment, short-term hardening, long-term architecture fixes.

Analysis checklist:
1) External exposure and service fingerprinting risk
2) Segmentation and east-west movement risk
3) Identity and privilege boundary weaknesses
4) Logging/monitoring gaps for detection and response
5) Hardening baselines (TLS, auth, ACLs, service config)
6) Operationally safe remediation sequence

Quality constraints:
- Prioritize controls with highest risk-reduction per effort.
- Recommend measurable validation checks after remediation.
- Flag assumptions if architecture context is incomplete.`,
  },
  compliance: {
    name: 'Compliance Officer',
    value: `Role: Senior Compliance & Security Governance Officer

Primary objective:
- Translate technical findings into compliance impact, control gaps, governance actions, and audit-ready remediation tracking.

Operating model:
- Map findings to frameworks (e.g., ISO 27001, NIST CSF, SOC 2, PCI DSS where applicable).
- Differentiate policy, process, and technical control failures.
- Prioritize actions that reduce both risk and audit exposure.

Expected output style:
- Provide control-gap matrix: finding → impacted control → required evidence → remediation owner/timeline.
- Include remediation governance guidance: accountability, review cadence, and closure criteria.
- Use business-readable language for non-technical stakeholders.

Analysis checklist:
1) Control mapping and gap classification
2) Evidence sufficiency (what exists vs what is missing)
3) Policy/process misalignment indicators
4) Risk acceptance vs remediation recommendation
5) Audit readiness status and documentation quality
6) KPI/KRI recommendations for tracking improvement

Quality constraints:
- Keep recommendations specific and auditable.
- Avoid framework over-claiming when evidence is missing.
- Explicitly mark “needs verification” where proof is incomplete.`,
  },
  redteam: {
    name: 'RedTeam Expert',
    value: `Role: Lead Red Team Operator

Primary objective:
- Model realistic adversary behavior, identify high-value attack chains, and provide offensive-informed defensive improvements.

Operating model:
- Focus on objective-based operations: initial access → execution → persistence → privilege escalation → lateral movement → impact.
- Emphasize chaining low/medium issues into material business risk.
- Include both exploit feasibility and detection evasion considerations.

Expected output style:
- Present attack path narratives with decision points and prerequisites.
- For each path include: required conditions, tool/technique class, expected indicators, and defender blind spots.
- Provide blue-team recommendations tied to telemetry and response playbooks.

Analysis checklist:
1) Initial access vectors and reliability
2) Privilege escalation and identity abuse paths
3) Lateral movement and data access opportunities
4) Impact demonstration options (safe and controlled)
5) Detection gaps and likely missed signals
6) Countermeasures prioritized by adversary effort increase

Quality constraints:
- Keep scenarios realistic and evidence-driven.
- Avoid unnecessary operational detail beyond defensive value.
- Mark speculative chains distinctly from validated chains.`,
  },
  devsecops: {
    name: 'DevSecOps Engineer',
    value: `Role: Staff DevSecOps Engineer

Primary objective:
- Convert security findings into implementable engineering work across SDLC, CI/CD, infrastructure-as-code, and runtime controls.

Operating model:
- Prefer repeatable automation and policy-as-code over manual one-off fixes.
- Prioritize shift-left controls with strong signal-to-noise.
- Ensure remediation is backlog-ready with clear acceptance criteria.

Expected output style:
- Break recommendations into epics/stories/tasks with owner, estimate, and dependencies.
- Provide practical CI/CD guardrails (SAST, SCA, IaC scanning, secret scanning, DAST gates).
- Include rollout strategy: pilot, enforce, monitor, optimize.

Analysis checklist:
1) SDLC entry points for prevention
2) CI/CD control gaps and bypass risks
3) Secrets/dependency/configuration hygiene issues
4) Runtime protection and observability requirements
5) Policy-as-code opportunities
6) Verification and regression prevention strategy

Quality constraints:
- Recommendations must be implementation-ready.
- Include measurable outcomes (e.g., MTTR, vuln recurrence rate, false-positive rate).
- Balance delivery velocity with security risk reduction.`,
  },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeHtml(html: string) {
  return html
    // Remove dangerous tags: script, style, iframe, object, embed, applet, form, base, link, meta, svg, math
    .replace(/<\s*\/?\s*(script|iframe|object|embed|applet|form|base|link|meta|svg|math)[\s>][^]*?>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    // Remove ALL inline event handlers (on*)
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Neutralise javascript: and data: URIs
    .replace(/(href|src|action|formaction|xlink:href)\s*=\s*("|')?\s*javascript\s*:[^"'>]*("|')?/gi, '$1="#"')
    .replace(/(href|src|action|formaction|xlink:href)\s*=\s*("|')?\s*data\s*:[^"'>]*("|')?/gi, '$1="#"')
    // Remove CSS expression/javascript in url()
    .replace(/expression\s*\(|url\s*\(\s*['"]?\s*javascript/gi, '/* blocked */')
    .trim();
}

function markdownToHtml(markdown: string) {
  let text = escapeHtml(markdown);

  const codeBlocks: string[] = [];
  text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return `@@CODE_BLOCK_${idx}@@`;
  });

  text = text
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  text = text.replace(/^(\s*[-*]\s+.*(?:\n\s*[-*]\s+.*)*)/gm, (block) => {
    const items = block
      .split('\n')
      .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean)
      .map((item) => `<li>${item}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  });

  text = text.replace(/^(\s*\d+\.\s+.*(?:\n\s*\d+\.\s+.*)*)/gm, (block) => {
    const items = block
      .split('\n')
      .map((line) => line.replace(/^\s*\d+\.\s+/, '').trim())
      .filter(Boolean)
      .map((item) => `<li>${item}</li>`)
      .join('');
    return `<ol>${items}</ol>`;
  });

  text = text.replace(/(^\|.+\|\n\|[\-:\s|]+\|\n(?:\|.*\|\n?)*)/gm, (tableBlock) => {
    const lines = tableBlock.trim().split('\n');
    if (lines.length < 2) return tableBlock;

    const headerCells = lines[0]
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => `<th>${c}</th>`)
      .join('');

    const rows = lines
      .slice(2)
      .map((line) =>
        `<tr>${line
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => `<td>${c}</td>`)
          .join('')}</tr>`
      )
      .join('');

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  text = text
    .split(/\n{2,}/)
    .map((block) => {
      if (
        /^<(h\d|ul|ol|li|pre|blockquote|table|thead|tbody|tr|th|td|p|code|strong|em|a)/.test(block.trim())
      ) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');

  codeBlocks.forEach((codeHtml, idx) => {
    text = text.replace(`@@CODE_BLOCK_${idx}@@`, codeHtml);
  });

  return sanitizeHtml(text);
}

function isLikelyHtml(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function readPersistedStore(): PersistedAssistantStore {
  try {
    const raw = localStorage.getItem(ASSISTANT_STORAGE_KEY);
    if (!raw) return { version: 1, scoped: {} };
    const parsed = JSON.parse(raw) as PersistedAssistantStore;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !parsed.scoped) {
      return { version: 1, scoped: {} };
    }
    return parsed;
  } catch {
    return { version: 1, scoped: {} };
  }
}

function savePersistedStore(store: PersistedAssistantStore) {
  localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(store));
}

function buildDefaultState(): PersistedAssistantState {
  return {
    selectedClientId: 'all',
    selectedProjectId: 'all',
    customContext: '',
    selectedTemplate: 'none',
    messages: [],
    attachments: [],
  };
}

function extractAssistantActions(responseText: string): AssistantAction[] {
  const matches = responseText.match(/```json([\s\S]*?)```/gi) || [];
  for (const block of matches) {
    const cleaned = block.replace(/```json/i, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const actions = (parsed?.assistant_actions || parsed?.actions) as AssistantAction[] | undefined;
      if (Array.isArray(actions)) return actions;
    } catch {
      // ignore malformed json blocks
    }
  }
  return [];
}

function normalizePath(path: string) {
  return path
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

function AssistantContent({ content }: { content: string }) {
  const html = useMemo(() => {
    if (isLikelyHtml(content)) return sanitizeHtml(content);
    return markdownToHtml(content);
  }, [content]);

  if (isLikelyHtml(content)) {
    return (
      <iframe
        srcDoc={html}
        className="w-full min-h-[180px] rounded-md border border-border bg-white"
        sandbox="allow-forms"
        title="assistant-html-output"
      />
    );
  }

  return <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function WorkspaceAssistantDialog({ trigger }: WorkspaceAssistantDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [sending, setSending] = useState(false);
  const [executingActions, setExecutingActions] = useState(false);

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [customContext, setCustomContext] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('none');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<AssistantAttachment[]>([]);
  const [copied, setCopied] = useState(false);

  const storageScope = useMemo(() => user?.id || 'guest', [user?.id]);

  const templateValue = useMemo(() => CONTEXT_TEMPLATES[selectedTemplate]?.value || '', [selectedTemplate]);

  const mergedCustomContext = useMemo(() => {
    if (templateValue && customContext.trim()) {
      return `${templateValue}\n\nAdditional context:\n${customContext.trim()}`;
    }
    return templateValue || customContext.trim();
  }, [templateValue, customContext]);

  const filteredProjects = useMemo(() => {
    if (selectedClientId === 'all') return projects;
    return projects.filter((p) => p.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  const loadWorkspace = async () => {
    if (!user) return;
    setLoadingWorkspace(true);

    try {
      const [{ data: clientsData, error: clientsError }, { data: projectsData, error: projectsError }] = await Promise.all([
        supabase.from('clients').select('id, company_name').eq('user_id', user.id).order('company_name'),
        supabase.from('projects').select('id, name, client_id').eq('user_id', user.id).order('name'),
      ]);

      if (clientsError) throw clientsError;
      if (projectsError) throw projectsError;

      setClients((clientsData || []) as ClientItem[]);
      setProjects((projectsData || []) as ProjectItem[]);
    } catch (error) {
      console.error('Failed to load workspace context:', error);
      toast({ title: 'Failed to load workspace context', variant: 'destructive' });
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const restorePersistedState = () => {
    const store = readPersistedStore();
    const state = store.scoped[storageScope] || buildDefaultState();
    setSelectedClientId(state.selectedClientId || 'all');
    setSelectedProjectId(state.selectedProjectId || 'all');
    setCustomContext(state.customContext || '');
    setSelectedTemplate(state.selectedTemplate || 'none');
    setMessages(Array.isArray(state.messages) ? state.messages : []);
    setAttachments(Array.isArray(state.attachments) ? state.attachments : []);
    hydratedRef.current = true;
  };

  const persistState = () => {
    if (!hydratedRef.current) return;
    const store = readPersistedStore();

    const compactMessages = messages
      .slice(-80)
      .map((m) => ({ ...m, content: m.content.slice(0, 12000) }));

    const compactAttachments = attachments.slice(-MAX_ATTACHMENTS).map((a) => ({
      ...a,
      content: a.content ? a.content.slice(0, 16000) : null,
    }));

    store.scoped[storageScope] = {
      selectedClientId,
      selectedProjectId,
      customContext,
      selectedTemplate,
      messages: compactMessages,
      attachments: compactAttachments,
    };
    savePersistedStore(store);
  };

  useEffect(() => {
    restorePersistedState();
  }, [storageScope]);

  useEffect(() => {
    persistState();
  }, [selectedClientId, selectedProjectId, customContext, selectedTemplate, messages, attachments, storageScope]);

  useEffect(() => {
    if (open) loadWorkspace();
  }, [open, user?.id]);

  useEffect(() => {
    if (selectedClientId === 'all') return;

    const stillValid = filteredProjects.some((p) => p.id === selectedProjectId);
    if (!stillValid) {
      setSelectedProjectId('all');
    }
  }, [selectedClientId, filteredProjects, selectedProjectId]);

  const buildWorkspaceSnapshot = async () => {
    const scopedProjectIds =
      selectedProjectId !== 'all'
        ? [selectedProjectId]
        : filteredProjects.map((p) => p.id);

    const safeProjectIds = scopedProjectIds.slice(0, 100);

    const [vulnRes, filesRes, reportsRes, foldersRes] = await Promise.all([
      safeProjectIds.length > 0
        ? supabase
            .from('vulnerabilities')
            .select('id, title, severity, status, project_id, cvss_score, updated_at')
            .in('project_id', safeProjectIds)
            .order('updated_at', { ascending: false })
            .limit(150)
        : Promise.resolve({ data: [], error: null } as any),
      safeProjectIds.length > 0
        ? supabase
            .from('files')
            .select('id, name, file_type, project_id, updated_at, content')
            .in('project_id', safeProjectIds)
            .order('updated_at', { ascending: false })
            .limit(120)
        : Promise.resolve({ data: [], error: null } as any),
      safeProjectIds.length > 0
        ? supabase
            .from('project_reports')
            .select('id, name, project_id, created_at, report_type')
            .in('project_id', safeProjectIds)
            .order('created_at', { ascending: false })
            .limit(60)
        : Promise.resolve({ data: [], error: null } as any),
        safeProjectIds.length > 0
        ? supabase
          .from('folders')
          .select('id, name, parent_id, project_id, updated_at')
          .in('project_id', safeProjectIds)
          .order('updated_at', { ascending: false })
          .limit(200)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (vulnRes.error) throw vulnRes.error;
    if (filesRes.error) throw filesRes.error;
    if (reportsRes.error) throw reportsRes.error;
      if (foldersRes.error) throw foldersRes.error;

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const selectedProject = projects.find((p) => p.id === selectedProjectId);

    const vulnerabilitySummary = (vulnRes.data || []).slice(0, 60).map((v: any) => ({
      title: v.title,
      severity: v.severity,
      status: v.status,
      cvss: v.cvss_score,
      project_id: v.project_id,
      updated_at: v.updated_at,
    }));

    const fileSummary = (filesRes.data || []).slice(0, 80).map((f: any) => ({
      name: f.name,
      type: f.file_type,
      project_id: f.project_id,
      updated_at: f.updated_at,
      content_excerpt: typeof f.content === 'string' ? f.content.replace(/\s+/g, ' ').slice(0, 700) : null,
    }));

    return {
      selected_scope: {
        client: selectedClient ? { id: selectedClient.id, name: selectedClient.company_name } : 'all',
        project: selectedProject ? { id: selectedProject.id, name: selectedProject.name } : 'all',
      },
      totals: {
        clients_visible: clients.length,
        projects_visible: filteredProjects.length,
        vulnerabilities_in_scope: (vulnRes.data || []).length,
        files_in_scope: (filesRes.data || []).length,
        folders_in_scope: (foldersRes.data || []).length,
        reports_in_scope: (reportsRes.data || []).length,
      },
      clients: clients.map((c) => ({ id: c.id, name: c.company_name })),
      projects: filteredProjects.map((p) => ({ id: p.id, name: p.name, client_id: p.client_id })),
      vulnerabilities: vulnerabilitySummary,
      files: fileSummary,
      folders: foldersRes.data || [],
      reports: reportsRes.data || [],
      custom_context: mergedCustomContext || null,
      uploaded_attachments: attachments.map((a) => ({
        name: a.name,
        type: a.type,
        size: a.size,
        content_excerpt: a.content ? a.content.slice(0, 6000) : null,
      })),
    };
  };

  const ensureFolderPath = async (projectId: string, path: string): Promise<string | null> => {
    if (!path.trim()) return null;

    const segments = normalizePath(path);
    if (segments.length === 0) return null;

    const { data: existingFolders, error } = await supabase
      .from('folders')
      .select('id, name, parent_id')
      .eq('project_id', projectId);

    if (error) throw error;

    let currentParentId: string | null = null;

    for (const segment of segments) {
      const found = (existingFolders || []).find(
        (f) => f.parent_id === currentParentId && f.name.toLowerCase() === segment.toLowerCase()
      );

      if (found) {
        currentParentId = found.id;
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('folders')
        .insert({
          name: segment,
          parent_id: currentParentId,
          project_id: projectId,
          user_id: user?.id || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      const previousParentId = currentParentId;
      currentParentId = inserted.id;
      existingFolders?.push({ id: inserted.id, name: segment, parent_id: previousParentId } as any);
    }

    return currentParentId;
  };

  const executeAssistantActions = async (actions: AssistantAction[]) => {
    if (!actions.length) return;
    if (selectedProjectId === 'all') {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I detected create-folder/create-file actions, but execution requires a specific Project Scope. Please choose a project and ask again.',
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    setExecutingActions(true);
    try {
      const results: string[] = [];

      for (const action of actions) {
        if (action.type === 'create_folder') {
          if (action.path) {
            const folderId = await ensureFolderPath(selectedProjectId, action.path);
            results.push(`Created or resolved folder path: ${action.path} (${folderId || 'root'})`);
            continue;
          }

          if (!action.name) continue;

          const { data: inserted, error } = await supabase
            .from('folders')
            .insert({
              name: action.name,
              parent_id: action.parent_folder_id || null,
              project_id: selectedProjectId,
              user_id: user?.id || null,
            })
            .select('id')
            .single();

          if (error) throw error;
          results.push(`Created folder: ${action.name} (${inserted.id})`);
          continue;
        }

        if (action.type === 'create_file') {
          if (!action.name) continue;

          let folderId = action.folder_id || null;
          if (!folderId && action.folder_path) {
            folderId = await ensureFolderPath(selectedProjectId, action.folder_path);
          }

          const content = action.content || '';
          const mimeType = action.mime_type || (isLikelyHtml(content) ? 'text/html' : 'text/markdown');
          const fileType = action.file_type || 'note';

          const { data: inserted, error } = await supabase
            .from('files')
            .insert({
              project_id: selectedProjectId,
              folder_id: folderId,
              name: action.name,
              file_type: fileType,
              mime_type: mimeType,
              content,
              user_id: user?.id || null,
            })
            .select('id')
            .single();

          if (error) throw error;
          results.push(`Created file: ${action.name} (${inserted.id})`);
        }
      }

      if (results.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Execution completed:\n- ${results.join('\n- ')}`,
            createdAt: new Date().toISOString(),
          },
        ]);
        toast({ title: 'Assistant actions executed', description: `${results.length} action(s) applied.` });
      }
    } catch (error: any) {
      console.error('Assistant action execution failed:', error);
      toast({
        title: 'Failed to execute assistant actions',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setExecutingActions(false);
    }
  };

  const handleUploadFiles = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const currentCount = attachments.length;
    if (currentCount >= MAX_ATTACHMENTS) {
      toast({ title: `Maximum ${MAX_ATTACHMENTS} attachments reached`, variant: 'destructive' });
      return;
    }

    const files = Array.from(filesList).slice(0, MAX_ATTACHMENTS - currentCount);
    const textLikeExtensions = ['txt', 'md', 'json', 'csv', 'html', 'htm', 'xml', 'log', 'yaml', 'yml', 'sql'];

    const toAdd: AssistantAttachment[] = [];

    for (const f of files) {
      if (f.size > MAX_ATTACHMENT_SIZE) {
        toast({
          title: 'File too large',
          description: `${f.name} exceeds ${Math.floor(MAX_ATTACHMENT_SIZE / 1024 / 1024)}MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const isTextLike = f.type.startsWith('text/') || textLikeExtensions.includes(ext);

      let content: string | null = null;
      if (isTextLike) {
        try {
          const raw = await f.text();
          content = raw.slice(0, 16000);
        } catch {
          content = null;
        }
      }

      toAdd.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        type: f.type || 'application/octet-stream',
        size: f.size,
        content,
      });
    }

    if (toAdd.length > 0) {
      setAttachments((prev) => [...prev, ...toAdd]);
      toast({ title: `${toAdd.length} file(s) attached` });
    }
  };

  const sendMessage = async () => {
    if (!prompt.trim()) return;

    setSending(true);

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const workspaceSnapshot = await buildWorkspaceSnapshot();
      const conversation = nextMessages.slice(-8).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

      const assistantInstruction = `You are PenDoc Workspace AI Assistant. Help pentesters work with clients and projects.

Primary capabilities:
- find and summarize client/project information
- transform, improve, and edit content for reports and deliverables
- draft findings, remediation plans, executive summaries, and technical notes
- create project structure artifacts when requested (folders/files)

Output formatting:
- prefer semantic HTML for reports, deliverables, executive summaries, and formatted tables
- only use Markdown when the user explicitly asks for Markdown
- when user asks for formatted content, return production-ready HTML with clear sections and headings

Action execution protocol:
- if user asks to create folders/files, append a JSON code block at the end.
- JSON schema:
\n\`\`\`json
{
  "assistant_actions": [
    { "type": "create_folder", "path": "Reports/Executive" },
    { "type": "create_file", "name": "Executive Summary.html", "folder_path": "Reports/Executive", "mime_type": "text/html", "file_type": "report", "content": "<section><h1>Executive Summary</h1><p>...</p></section>" }
  ]
}
\`\`\`

Rules:
- stay strictly within provided workspace context
- if required data is missing, explicitly state what is missing
- do not hallucinate client/project facts
- keep responses actionable and concise`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'custom',
          fileType: 'workspace-context',
          fileName: 'workspace-context.json',
          content: JSON.stringify(workspaceSnapshot, null, 2),
          customPrompt: `${assistantInstruction}\n\nConversation:\n${conversation}`,
        },
      });

      if (error) throw error;

      const assistantText = (data?.response as string) || 'No response from AI assistant.';
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setPrompt('');

      const actions = extractAssistantActions(assistantText);
      if (actions.length > 0) {
        await executeAssistantActions(actions);
      }
    } catch (error: any) {
      console.error('AI assistant error:', error);
      toast({
        title: 'Assistant request failed',
        description: error?.message || 'Unable to process request',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const copyLastAssistantMessage = async () => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!last) return;
    await navigator.clipboard.writeText(last.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const clearConversation = () => {
    setMessages([]);
    toast({ title: 'Chat history reset' });
  };

  const loadTemplateIntoContext = () => {
    if (!templateValue) return;
    setCustomContext((prev) => (prev.trim() ? `${templateValue}\n\n${prev}` : templateValue));
    toast({ title: 'Template loaded into custom context' });
  };

  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Bot className="h-4 w-4 mr-1" />
            Assistant
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-5xl max-h-[92dvh] p-3 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Bot className="h-5 w-5 text-primary" />
            Workspace AI Assistant
            <Badge variant="outline" className="ml-1">Persistent</Badge>
            <Badge variant="secondary">HTML-first</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Scope row */}
        <div className="grid md:grid-cols-12 gap-3">
          <div className="space-y-1.5 md:col-span-4">
            <Label className="text-xs">Client Scope</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-4">
            <Label className="text-xs">Project Scope</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects in scope</SelectItem>
                {filteredProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-4">
            <Label className="text-xs flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Controls</Label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearConversation}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={loadWorkspace} disabled={loadingWorkspace} title="Reload workspace context">
                {loadingWorkspace ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Collapsible Context Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground h-7 px-2">
              <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> Context & Template Settings</span>
              {settingsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid md:grid-cols-12 gap-3 pt-2 pb-1">
              <div className="space-y-2 md:col-span-4">
                <Label className="text-xs">Context Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTEXT_TEMPLATES).map(([key, tpl]) => (
                      <SelectItem key={key} value={key}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate !== 'none' && (
                  <div className="text-xs text-muted-foreground border border-border rounded-md p-2 bg-muted/30 max-h-[80px] overflow-y-auto">
                    {CONTEXT_TEMPLATES[selectedTemplate].value}
                  </div>
                )}
                {selectedTemplate !== 'none' && (
                  <Button type="button" variant="outline" size="sm" onClick={loadTemplateIntoContext}>
                    Load to custom context
                  </Button>
                )}
              </div>

              <div className="space-y-2 md:col-span-8">
                <Label className="text-xs">Additional Custom Context</Label>
                <Textarea
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="Add custom context (business constraints, expected output style, timeline, stakeholder focus, etc)."
                  className="min-h-[108px]"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Quick prompt chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '🔍 Summarize critical findings', prompt: 'Summarize all critical and high severity findings in the selected project scope, grouped by category.' },
            { label: '📄 Draft executive summary', prompt: 'Draft an executive summary for the current pentest engagement, suitable for a non-technical audience.' },
            { label: '🛡️ Top remediation priorities', prompt: 'List the top 5 remediation priorities based on risk, exploitability, and business impact.' },
            { label: '📊 Risk overview table', prompt: 'Create an HTML table with all open vulnerabilities showing title, severity, CVSS score, and status.' },
            { label: '🔗 Attack chain analysis', prompt: 'Identify potential attack chains or multi-step exploitation paths from the current findings.' },
          ].map(({ label, prompt: p }) => (
            <button
              key={label}
              type="button"
              onClick={() => setPrompt(p)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chat window */}
        <div className="border border-border rounded-lg flex-1 min-h-0 overflow-hidden bg-card/40">
          <ScrollArea className="h-[38vh] sm:h-[360px]">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Bot className="h-10 w-10 mx-auto opacity-20" />
                  <p className="text-sm font-medium">Start a conversation</p>
                  <p className="text-xs max-w-sm mx-auto">Ask the assistant to summarize findings, draft HTML reports, create executive tables, or create project folders and files. Use the quick prompts above to get started.</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={`${m.createdAt}-${idx}`}
                    className={`rounded-xl p-3 text-sm ${
                      m.role === 'user'
                        ? 'bg-primary/10 border border-primary/20 ml-8'
                        : 'bg-muted/50 border border-border mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {m.role === 'user' ? (
                        <span className="text-xs font-semibold text-primary">You</span>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">AI Assistant</span>
                        </>
                      )}
                      <span className="text-[10px] text-muted-foreground/50 ml-auto tabular-nums">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">
                      {m.role === 'assistant' ? <AssistantContent content={m.content} /> : m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                void handleUploadFiles(e.target.files);
                e.currentTarget.value = '';
              }}
            />
            {attachments.length > 0 && (
              <Badge variant="secondary">{attachments.length} attachment(s)</Badge>
            )}
            {executingActions && (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Applying assistant actions
              </Badge>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border border-border rounded-md p-2 bg-muted/20">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs">
                  <span className="font-medium max-w-[140px] sm:max-w-[180px] truncate">{a.name}</span>
                  <span className="text-muted-foreground">{Math.round(a.size / 1024)} KB</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${a.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Build an HTML executive summary for open critical/high findings and create Reports/Executive with two polished report files."
              className="min-h-[76px]"
            />
            <Button className="w-full sm:w-auto" onClick={sendMessage} disabled={sending || !prompt.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-start sm:items-center gap-2">
            <FolderPlus className="h-3.5 w-3.5" />
            <FilePlus className="h-3.5 w-3.5" />
            Assistant can create folders/files automatically in selected project when requested.
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={copyLastAssistantMessage}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy Last Reply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
