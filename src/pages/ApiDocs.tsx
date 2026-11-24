import { functionUrl } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Book, Code, Key, ArrowLeft, Copy, Check, ChevronDown, ChevronRight,
  ExternalLink, Shield, Cpu, FileBarChart2, AlertTriangle, Zap,
  Users, FolderOpen, FileText, Bug, BarChart2, Layers, Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Footer } from '@/components/common/Footer';
import { DocsSidebar } from '@/components/common/DocsSidebar';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  notes?: string;
  requestBody?: Record<string, unknown>;
  responseExample?: Record<string, unknown>;
}

const endpoints: Record<string, { icon: React.ElementType; summary: string; items: Endpoint[] }> = {
  Projects: {
    icon: FolderOpen,
    summary: 'Create and manage pentest projects, including scope, dates, environment model, and team shares.',
    items: [
      {
        method: 'GET',
        path: '/projects',
        description: 'List all your projects',
        responseExample: { projects: [{ id: 'uuid', name: 'My Project', description: '...', client_id: 'uuid', environment: 'external', created_at: '...' }] },
      },
      {
        method: 'GET',
        path: '/projects/:id',
        description: 'Get a specific project with full details including scope and rules of engagement',
        responseExample: { project: { id: 'uuid', name: 'My Project', description: '...', environment: 'external', model_external: 'black_box', start_date: '2024-01-01', end_date: '2024-01-31', scope: { urls: [], ips: [], fqdns: [] }, rules_of_engagement: '...' } },
      },
      {
        method: 'POST',
        path: '/projects',
        description: 'Create a new project',
        requestBody: { name: 'Project Name', description: 'Optional description', client_id: 'optional-uuid', environment: 'external', model_external: 'black_box' },
        responseExample: { project: { id: 'uuid', name: 'Project Name' } },
      },
      {
        method: 'PUT',
        path: '/projects/:id',
        description: 'Update a project (name, description, environment, models, dates, scope, rules)',
        requestBody: { name: 'Updated Name', description: 'Updated description', environment: 'both', model_external: 'gray_box', model_internal: 'white_box', start_date: '2024-01-01', end_date: '2024-01-31', rules_of_engagement: 'Testing rules...', scope: { urls: ['https://example.com'], ips: ['192.168.1.1'] } },
        responseExample: { project: { id: 'uuid', name: 'Updated Name' } },
      },
      {
        method: 'DELETE',
        path: '/projects/:id',
        description: 'Delete a project and all its contents',
        responseExample: { success: true },
      },
      {
        method: 'GET',
        path: '/projects/:id/folders',
        description: 'List all folders in a project',
        responseExample: { folders: [{ id: 'uuid', name: 'Folder Name', parent_id: null }] },
      },
      {
        method: 'GET',
        path: '/projects/:id/files',
        description: 'List all files in a project',
        responseExample: { files: [{ id: 'uuid', name: 'file.txt', content: '...', file_type: 'note' }] },
      },
      {
        method: 'GET',
        path: '/projects/:id/vulnerabilities',
        description: 'List all vulnerabilities in a project',
        responseExample: { vulnerabilities: [{ id: 'uuid', title: 'SQL Injection', severity: 'high', cvss_score: 8.5, status: 'open' }] },
      },
      {
        method: 'GET',
        path: '/projects/:id/shares',
        description: 'List project shares',
        responseExample: { shares: [{ id: 'uuid', shared_with_email: 'user@example.com', permission: 'read' }] },
      },
      {
        method: 'POST',
        path: '/projects/:id/shares',
        description: 'Share project with a user',
        requestBody: { email: 'user@example.com', permission: 'read' },
        responseExample: { share: { id: 'uuid', shared_with_email: 'user@example.com' } },
      },
      {
        method: 'DELETE',
        path: '/projects/:id/shares/:shareId',
        description: 'Remove a share',
        responseExample: { success: true },
      },
    ],
  },
  Folders: {
    icon: FolderOpen,
    summary: 'Organise project files into nested folder hierarchies.',
    items: [
      {
        method: 'GET',
        path: '/folders/:id',
        description: 'Get a specific folder with its files',
        responseExample: { folder: { id: 'uuid', name: 'Folder Name', files: [] } },
      },
      {
        method: 'POST',
        path: '/folders',
        description: 'Create a new folder',
        requestBody: { project_id: 'uuid', name: 'Folder Name', parent_id: 'optional-uuid' },
        responseExample: { folder: { id: 'uuid', name: 'Folder Name' } },
      },
      {
        method: 'PUT',
        path: '/folders/:id',
        description: 'Rename or move a folder',
        requestBody: { name: 'New Name', parent_id: 'optional-new-parent' },
        responseExample: { folder: { id: 'uuid', name: 'New Name' } },
      },
      {
        method: 'DELETE',
        path: '/folders/:id',
        description: 'Delete a folder and its contents',
        responseExample: { success: true },
      },
      {
        method: 'GET',
        path: '/folders/:id/files',
        description: 'List files in a folder',
        responseExample: { files: [{ id: 'uuid', name: 'file.txt' }] },
      },
    ],
  },
  Files: {
    icon: FileText,
    summary: 'Create, read, update, and delete notes, evidence, scripts, and other project files.',
    items: [
      {
        method: 'GET',
        path: '/files/:id',
        description: 'Get file details and content',
        responseExample: { file: { id: 'uuid', name: 'file.txt', content: 'File content...', file_type: 'note', mime_type: 'text/plain' } },
      },
      {
        method: 'POST',
        path: '/files',
        description: 'Create a new file',
        requestBody: { project_id: 'uuid', folder_id: 'optional-uuid', name: 'file.txt', content: 'Content', file_type: 'note' },
        responseExample: { file: { id: 'uuid', name: 'file.txt' } },
      },
      {
        method: 'PUT',
        path: '/files/:id',
        description: 'Update file name or content',
        requestBody: { name: 'new-name.txt', content: 'Updated content' },
        responseExample: { file: { id: 'uuid', name: 'new-name.txt' } },
      },
      {
        method: 'DELETE',
        path: '/files/:id',
        description: 'Delete a file',
        responseExample: { success: true },
      },
    ],
  },
  Vulnerabilities: {
    icon: Bug,
    summary: 'Full lifecycle management for pentest findings — create, triage, comment, update status, and track retest progress.',
    items: [
      {
        method: 'GET',
        path: '/vulnerabilities',
        description: 'List all vulnerabilities. Filter by project with ?project_id=uuid',
        notes: 'Supports filtering by project_id query parameter. Returns findings in descending order of severity.',
        responseExample: { vulnerabilities: [{ id: 'uuid', title: 'SQL Injection', severity: 'high', status: 'open', project_id: 'uuid' }] },
      },
      {
        method: 'GET',
        path: '/vulnerabilities/:id',
        description: 'Get a specific vulnerability with all details',
        responseExample: { vulnerability: { id: 'uuid', title: 'SQL Injection', severity: 'high', likelihood: 'high', cvss_score: 8.5, cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', owasp_category: 'web', owasp_item: 'A03:2021 – Injection', tool: 'SQLMap', affected_assets: ['https://example.com/login'], detailed_description: '...', remediation: '...' } },
      },
      {
        method: 'POST',
        path: '/vulnerabilities',
        description: 'Create a new vulnerability (all standard fields supported)',
        requestBody: { project_id: 'uuid', title: 'SQL Injection', description: 'Found SQL injection in login form', severity: 'high', status: 'open', cvss_score: 8.5, cvss_vector: 'CVSS:3.1/...', affected_component: '/login', steps_to_reproduce: '1) Open login form...', proof_of_concept: 'Payload/HTTP request', recommendation: 'Use parameterized queries', references: ['https://owasp.org/...'] },
        responseExample: { vulnerability: { id: 'uuid', title: 'SQL Injection' } },
      },
      {
        method: 'PUT',
        path: '/vulnerabilities/:id',
        description: 'Update a vulnerability — any writable field can be patched',
        requestBody: { title: 'Updated Title', severity: 'critical', status: 'fixed', remediation: 'Updated remediation steps' },
        responseExample: { vulnerability: { id: 'uuid', title: 'Updated Title' } },
      },
      {
        method: 'DELETE',
        path: '/vulnerabilities/:id',
        description: 'Delete a vulnerability',
        responseExample: { success: true },
      },
      {
        method: 'GET',
        path: '/vulnerabilities/:id/comments',
        description: 'Get comments on a vulnerability',
        responseExample: { comments: [{ id: 'uuid', content: 'Comment text', comment_type: 'comment', user_id: 'uuid', created_at: '...' }] },
      },
      {
        method: 'POST',
        path: '/vulnerabilities/:id/comments',
        description: 'Add a comment to a vulnerability',
        requestBody: { content: 'Comment text', comment_type: 'general', parent_id: 'optional-uuid' },
        responseExample: { comment: { id: 'uuid', content: 'Comment text' } },
      },
    ],
  },
  Clients: {
    icon: Users,
    summary: 'Manage client organisations, contact persons, and client-linked project statistics.',
    items: [
      {
        method: 'GET',
        path: '/clients',
        description: 'List all your clients',
        responseExample: { clients: [{ id: 'uuid', company_name: 'Acme Corp', company_website: 'https://acme.com', is_active: true }] },
      },
      {
        method: 'GET',
        path: '/clients/:id',
        description: 'Get a specific client',
        responseExample: { client: { id: 'uuid', company_name: 'Acme Corp', company_website: 'https://acme.com', notes: '...', is_active: true } },
      },
      {
        method: 'POST',
        path: '/clients',
        description: 'Create a new client',
        requestBody: { company_name: 'Acme Corp', company_website: 'https://acme.com', notes: 'Important client', is_active: true },
        responseExample: { client: { id: 'uuid', company_name: 'Acme Corp' } },
      },
      {
        method: 'PUT',
        path: '/clients/:id',
        description: 'Update a client',
        requestBody: { company_name: 'Updated Name', notes: 'Updated notes', is_active: false },
        responseExample: { client: { id: 'uuid', company_name: 'Updated Name' } },
      },
      {
        method: 'DELETE',
        path: '/clients/:id',
        description: 'Delete a client',
        responseExample: { success: true },
      },
      {
        method: 'GET',
        path: '/clients/:id/projects',
        description: 'List all projects for a client',
        responseExample: { projects: [{ id: 'uuid', name: 'Security Assessment', client_id: 'uuid' }] },
      },
      {
        method: 'GET',
        path: '/clients/:id/stats',
        description: 'Get client statistics — project count, vulnerability counts by status',
        responseExample: { stats: { project_count: 5, total_vulnerabilities: 42, open_vulnerabilities: 12, waiting_retest: 3 } },
      },
    ],
  },
  'Client Portal': {
    icon: Shield,
    summary: 'Issue and revoke client portal access tokens, and control which projects are visible to the client.',
    items: [
      {
        method: 'GET',
        path: '/clients/:id/portal-access',
        description: 'List all client portal access tokens for a client',
        responseExample: { access_tokens: [{ id: 'uuid', token: '...', label: 'Client login', expires_at: null, is_active: true }] },
      },
      {
        method: 'POST',
        path: '/clients/:id/portal-access',
        description: 'Create a new client portal access token — share with the client so they can log into their portal',
        requestBody: { label: 'Portal access for Q1 2025', expires_at: 'optional ISO date' },
        responseExample: { token: { id: 'uuid', token: 'cpt_xxxxxxxx', label: 'Portal access for Q1 2025', is_active: true } },
      },
      {
        method: 'DELETE',
        path: '/clients/:id/portal-access/:tokenId',
        description: 'Revoke a client portal access token',
        responseExample: { success: true },
      },
      {
        method: 'PUT',
        path: '/clients/:id/portal-visibility/:projectId',
        description: 'Toggle project visibility for the client portal (share or unshare a project with the client)',
        requestBody: { is_visible: true },
        responseExample: { success: true, is_visible: true },
      },
    ],
  },
  'Scanner Imports': {
    icon: Layers,
    summary: 'Parse and import output from leading security scanners. Each endpoint auto-creates structured findings in the target project.',
    items: [
      {
        method: 'POST',
        path: '/process-nmap',
        description: 'Parse and import an Nmap XML scan report — creates structured host/port findings in the project',
        requestBody: { xml_content: '<?xml version="1.0"?>...', project_id: 'uuid', folder_id: 'optional-uuid', file_name: 'nmap_scan.xml' },
        responseExample: { success: true, message: 'Nmap report processed', fileName: 'nmap_scan_report.html', hostsFound: 12, portsFound: 47 },
      },
      {
        method: 'POST',
        path: '/process-nessus',
        description: 'Parse and import a Nessus .nessus XML export — auto-creates vulnerabilities from plugin findings',
        notes: 'Supports deduplication. Duplicate findings from the same plugin on the same asset are merged.',
        requestBody: { xml_content: '<?xml version="1.0"?>...', project_id: 'uuid', folder_id: 'optional-uuid', file_name: 'scan.nessus' },
        responseExample: { success: true, message: 'Nessus report processed', vulnerabilitiesCreated: 23, fileName: 'nessus_report.html' },
      },
      {
        method: 'POST',
        path: '/process-acunetix',
        description: 'Parse and import an Acunetix XML export — maps web vulnerability findings to PenDoc vulnerability records',
        requestBody: { xml_content: '<?xml version="1.0"?>...', project_id: 'uuid', folder_id: 'optional-uuid', file_name: 'acunetix_scan.xml' },
        responseExample: { success: true, message: 'Acunetix report processed', vulnerabilitiesCreated: 8, fileName: 'acunetix_report.html' },
      },
      {
        method: 'POST',
        path: '/process-burpsuite',
        description: 'Parse and import a Burp Suite XML export — maps web findings including severity, confidence, and request/response evidence',
        requestBody: { xml_content: '<?xml version="1.0"?>...', project_id: 'uuid', folder_id: 'optional-uuid', file_name: 'burp_scan.xml' },
        responseExample: { success: true, message: 'Burp Suite report processed', vulnerabilitiesCreated: 14, fileName: 'burp_report.html' },
      },
    ],
  },
  'Report Generation': {
    icon: FileBarChart2,
    summary: 'Generate structured HTML/PDF pentest reports and export full project snapshots.',
    items: [
      {
        method: 'POST',
        path: '/generate-report',
        description: 'Generate a professional pentest report for a project — includes executive summary, severity charts, detailed findings, OWASP checklists, and remediation priority table',
        notes: 'Reports are automatically saved to the project\'s reports library. Pass lang: "ru" for Russian-language reports.',
        requestBody: { project_id: 'uuid', format: 'html', lang: 'en' },
        responseExample: { html: '<!DOCTYPE html>...', projectName: 'My Project', reportId: 'uuid' },
      },
      {
        method: 'GET',
        path: '/export-project',
        description: 'Export a full project snapshot — returns a JSON bundle with all vulnerabilities, files, folders, and metadata. Useful for backups and migrations.',
        responseExample: { project: { id: 'uuid', name: '...' }, vulnerabilities: [], files: [], folders: [], exported_at: '2025-01-01T00:00:00Z' },
      },
    ],
  },
  'AI Features': {
    icon: Cpu,
    summary: 'AI-powered endpoints for generating attack vectors, remediation strategies, gap analysis, report comparisons, and assistant Q&A.',
    items: [
      {
        method: 'POST',
        path: '/ai-report-analysis',
        description: 'Run a gap analysis or comparison on one or two project reports using AI — returns structured findings and a rendered HTML report',
        notes: 'Use action: "gap-analysis" with reportId for a single report, or action: "compare" with reportId1 and reportId2 for side-by-side comparison. Results are cached by content hash.',
        requestBody: { action: 'gap-analysis', reportId: 'uuid' },
        responseExample: { analysis: '{...}', htmlReport: '<!DOCTYPE html>...', reportName: 'Q1 Assessment', model: 'deepseek', cached: false },
      },
      {
        method: 'POST',
        path: '/generate-attack-vector',
        description: 'Generate a detailed attack vector narrative and MITRE ATT&CK-mapped flow diagram for a vulnerability',
        requestBody: { vulnerability_id: 'uuid', context: 'optional additional context' },
        responseExample: { attack_vector: 'An attacker could exploit this by...', diagram: 'graph TD...' },
      },
      {
        method: 'POST',
        path: '/generate-remediation-strategy',
        description: 'Generate a prioritised remediation plan for all open vulnerabilities in a project — returns actionable, developer-facing guidance with effort estimates and timelines',
        requestBody: { project_id: 'uuid' },
        responseExample: { strategy: { executiveSummary: '...', totalEffort: '3–5 sprints', items: [{ title: '...', priority: 'immediate', effort: 'medium', steps: [] }] } },
      },
      {
        method: 'POST',
        path: '/generate-recommendations',
        description: 'Generate high-level security recommendations for a project based on its vulnerability landscape',
        requestBody: { project_id: 'uuid', scope: 'all' },
        responseExample: { recommendations: [{ area: 'Input Validation', recommendation: '...', severity: 'high' }] },
      },
      {
        method: 'POST',
        path: '/ai-assistant',
        description: 'Send a message to the AI assistant — supports context-aware Q&A about project findings, security concepts, and write-up support',
        notes: 'Pass conversation_history to maintain context across multiple turns. Optionally scope to a project with project_id.',
        requestBody: { message: 'What are the most critical findings in this project?', project_id: 'optional-uuid', conversation_history: [] },
        responseExample: { response: 'Based on your project findings...', sources: [] },
      },
    ],
  },
  'API Tokens': {
    icon: Key,
    summary: 'Create and revoke API tokens for programmatic access. Token values are shown only once on creation.',
    items: [
      {
        method: 'GET',
        path: '/profile/api-tokens',
        description: 'List all your API tokens — shows metadata only, not the token value',
        responseExample: { tokens: [{ id: 'uuid', name: 'CI/CD token', created_at: '...', last_used_at: '...', is_active: true }] },
      },
      {
        method: 'POST',
        path: '/profile/api-tokens',
        description: 'Create a new API token — token value is returned once and cannot be retrieved again',
        requestBody: { name: 'My automation token' },
        responseExample: { token: { id: 'uuid', name: 'My automation token', token: 'pt_xxxxxxxxxxxxxxxx' } },
      },
      {
        method: 'DELETE',
        path: '/profile/api-tokens/:id',
        description: 'Revoke an API token — immediately invalidates all requests using this token',
        responseExample: { success: true },
      },
    ],
  },
  Profile: {
    icon: Users,
    summary: 'Read and update your own user profile information.',
    items: [
      {
        method: 'GET',
        path: '/profile',
        description: 'Get your profile information',
        responseExample: { profile: { id: 'uuid', email: 'user@example.com', display_name: 'John Doe', first_name: 'John', last_name: 'Doe' } },
      },
      {
        method: 'PUT',
        path: '/profile',
        description: 'Update your profile',
        requestBody: { display_name: 'John Doe', first_name: 'John', last_name: 'Doe' },
        responseExample: { profile: { id: 'uuid', display_name: 'John Doe' } },
      },
    ],
  },
};

const methodColors: Record<string, string> = {
  GET:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const quickstartSteps = [
  {
    step: '1',
    title: 'Get your API token',
    description: 'Go to Settings → API Tokens and create a new token. Copy the value immediately — it is shown only once.',
    code: '# Store it somewhere safe\nexport PENDOC_TOKEN="pt_xxxxxxxxxxxxxxxx"',
  },
  {
    step: '2',
    title: 'Create a project',
    description: 'Every vulnerability, file, and report lives inside a project.',
    code: `curl -X POST "${functionUrl('api')}/projects" \\
  -H "x-api-token: $PENDOC_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Q3 External Assessment","environment":"external","model_external":"black_box"}'`,
  },
  {
    step: '3',
    title: 'Add a vulnerability',
    description: 'Record a finding with full CVSS, OWASP classification, and remediation guidance.',
    code: `curl -X POST ".../api/vulnerabilities" \\
  -H "x-api-token: $PENDOC_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project-uuid>","title":"SQL Injection","severity":"critical","status":"open","remediation":"Use parameterised queries."}'`,
  },
  {
    step: '4',
    title: 'Generate a report',
    description: 'Produce a professional HTML pentest report from all project findings.',
    code: `curl -X POST ".../api/generate-report" \\
  -H "x-api-token: $PENDOC_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"<project-uuid>","format":"html","lang":"en"}' \\
  -o report.html`,
  },
];

export default function ApiDocs() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(endpoints).map((k, i) => [k, i === 0]))
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const baseUrl = functionUrl('api');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateCurlExample = (endpoint: Endpoint) => {
    let curl = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}" \\\n  -H "x-api-token: YOUR_API_TOKEN" \\\n  -H "Content-Type: application/json"`;
    if (endpoint.requestBody) {
      curl += ` \\\n  -d '${JSON.stringify(endpoint.requestBody)}'`;
    }
    return curl;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DocsSidebar />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span className="mx-1">/</span>
              <Link to="/docs" className="hover:text-foreground">Docs</Link>
              <span className="mx-1">/</span>
              <span className="text-foreground font-medium">API Reference</span>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/docs">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-10">

            {/* Title */}
            <section className="rounded-3xl border border-border bg-card/50 p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4">
                <Book className="h-3 w-3" />
                API Reference · v1
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">PenDoc REST API</h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                The PenDoc API gives you programmatic access to your entire workspace — projects, vulnerabilities,
                files, clients, reports, AI features, and client portal management. Use it to build integrations,
                automate import pipelines from scanners, trigger AI analysis, and deliver reports without manual steps.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  { icon: Shield, label: 'Token-based auth', sub: 'x-api-token header' },
                  { icon: Code, label: 'RESTful JSON', sub: 'application/json' },
                  { icon: Zap, label: 'AI endpoints', sub: 'DeepSeek · OpenAI' },
                  { icon: Terminal, label: 'curl-friendly', sub: 'Standard HTTP' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col gap-1">
                    <Icon className="h-4 w-4 text-primary mb-1" />
                    <span className="font-medium leading-tight">{label}</span>
                    <span className="text-xs text-muted-foreground">{sub}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Authentication */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Authentication
              </h2>
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <p className="text-muted-foreground text-sm">
                  Every request must include your API token in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">x-api-token</code> header.
                  Generate tokens in <strong>Settings → API Tokens</strong>. Token values are displayed once — store them immediately.
                </p>
                <div className="bg-muted/40 rounded-lg border border-border p-3 font-mono text-sm relative group">
                  <code>x-api-token: pt_xxxxxxxxxxxxxxxx</code>
                  <Button size="icon" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyCode('x-api-token: pt_xxxxxxxxxxxxxxxx', 'auth-header')}>
                    {copiedCode === 'auth-header' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="font-semibold mb-1 flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-primary" />
                      Base URL
                    </div>
                    <code className="text-xs break-all">{baseUrl}</code>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="font-semibold mb-1 flex items-center gap-1.5 text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Debug header
                    </div>
                    <p className="text-xs text-muted-foreground">Add <code className="bg-muted px-1 rounded">x-debug-auth: 1</code> to receive an auth failure reason in the response body during development. Remove in production.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Quickstart */}
            <section>
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quickstart
              </h2>
              <p className="text-muted-foreground text-sm mb-4">From zero to a generated pentest report in four API calls.</p>
              <div className="space-y-3">
                {quickstartSteps.map(({ step, title, description, code }) => (
                  <div key={step} className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-card px-4 py-3 flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{step}</span>
                      <div>
                        <div className="font-semibold text-sm">{title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                      </div>
                    </div>
                    <div className="relative group bg-muted/20 border-t border-border">
                      <pre className="p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap">{code}</pre>
                      <Button size="icon" variant="ghost" className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyCode(code, `qs-${step}`)}>
                        {copiedCode === `qs-${step}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Request format */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Request &amp; Response Format
              </h2>
              <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-sm">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Request bodies</h3>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Always send <code className="bg-muted px-1 rounded">Content-Type: application/json</code></li>
                      <li>• Body must be valid JSON</li>
                      <li>• <code className="bg-muted px-1 rounded">PUT</code> endpoints are partial — only send fields you want to change</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Responses</h3>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• All responses are JSON</li>
                      <li>• Success: wrapped in a named key (e.g. <code className="bg-muted px-1 rounded">project</code>, <code className="bg-muted px-1 rounded">vulnerabilities</code>)</li>
                      <li>• Errors: <code className="bg-muted px-1 rounded">{'{"error":"message"}'}</code></li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Pagination</h3>
                  <p className="text-muted-foreground">
                    List endpoints return all records for your account by default. For large datasets, filter by
                    <code className="bg-muted px-1 rounded mx-1">project_id</code> to reduce result size.
                    Pagination via <code className="bg-muted px-1 rounded">limit</code> and <code className="bg-muted px-1 rounded">offset</code> parameters
                    is supported on vulnerability list endpoints.
                  </p>
                </div>
              </div>
            </section>

            {/* Endpoints */}
            <section>
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                API Endpoints
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                {Object.values(endpoints).reduce((n, g) => n + g.items.length, 0)} endpoints across {Object.keys(endpoints).length} resource groups.
              </p>
              <div className="space-y-3">
                {Object.entries(endpoints).map(([section, { icon: SectionIcon, summary, items }], sectionIdx) => (
                  <div key={section} className="border border-border rounded-xl overflow-hidden" style={{ animationDelay: `${sectionIdx * 40}ms` }}>
                    <button
                      className="w-full px-4 py-3 bg-card flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                      onClick={() => toggleSection(section)}
                    >
                      <div className="flex items-start gap-3">
                        <SectionIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {section}
                            <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{summary}</div>
                        </div>
                      </div>
                      {expandedSections[section]
                        ? <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                        : <ChevronRight className="h-4 w-4 flex-shrink-0 ml-2" />}
                    </button>

                    {expandedSections[section] && (
                      <div className="divide-y divide-border border-t border-border">
                        {items.map((endpoint, idx) => (
                          <div key={idx} className="p-4 bg-background">
                            <div className="flex items-start gap-3 mb-2">
                              <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded border flex-shrink-0 ${methodColors[endpoint.method]}`}>
                                {endpoint.method}
                              </span>
                              <code className="font-mono text-sm break-all">{endpoint.path}</code>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{endpoint.description}</p>
                            {endpoint.notes && (
                              <div className="mb-3 text-xs text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                {endpoint.notes}
                              </div>
                            )}
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Example request:</p>
                              <div className="bg-muted/30 rounded-lg border border-border p-3 font-mono text-xs relative group overflow-x-auto">
                                <pre className="whitespace-pre-wrap">{generateCurlExample(endpoint)}</pre>
                                <Button size="icon" variant="ghost" className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => copyCode(generateCurlExample(endpoint), `curl-${section}-${idx}`)}>
                                  {copiedCode === `curl-${section}-${idx}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                            {endpoint.responseExample && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Example response:</p>
                                <div className="bg-muted/30 rounded-lg border border-border p-3 font-mono text-xs overflow-x-auto">
                                  <pre>{JSON.stringify(endpoint.responseExample, null, 2)}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Error Handling */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Error Handling
              </h2>
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <p className="text-muted-foreground text-sm">
                  All errors return JSON with an <code className="bg-muted px-1.5 py-0.5 rounded text-xs">error</code> field.
                  Use HTTP status codes to classify failures in your integration:
                </p>
                <div className="bg-muted/30 rounded-lg border border-border p-3 font-mono text-sm">
                  <pre>{JSON.stringify({ error: 'Descriptive error message' }, null, 2)}</pre>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="pb-2 pr-4">Code</th>
                        <th className="pb-2 pr-4">Meaning</th>
                        <th className="pb-2">Common causes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {[
                        ['200', 'emerald', 'OK', 'Request succeeded'],
                        ['201', 'blue', 'Created', 'Resource created successfully'],
                        ['400', 'amber', 'Bad Request', 'Missing or invalid parameters in body'],
                        ['401', 'red', 'Unauthorized', 'Missing or invalid x-api-token header'],
                        ['403', 'red', 'Forbidden', 'Authenticated, but no access to this resource'],
                        ['404', 'red', 'Not Found', 'Resource ID does not exist or is not accessible'],
                        ['429', 'amber', 'Rate Limited', 'Too many requests — back off with exponential retry'],
                        ['500', 'red', 'Server Error', 'Unexpected internal error — contact support if persistent'],
                        ['502', 'red', 'AI Unavailable', 'AI provider failed — retry or check /ai-* endpoint status'],
                      ].map(([code, color, meaning, cause]) => (
                        <tr key={code}>
                          <td className="py-2 pr-4">
                            <span className={`bg-${color}-500/20 text-${color}-400 px-2 py-0.5 rounded font-mono text-xs border border-${color}-500/30`}>{code}</span>
                          </td>
                          <td className="py-2 pr-4 font-medium text-sm">{meaning}</td>
                          <td className="py-2 text-muted-foreground text-xs">{cause}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Enum Values */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Enum Values
              </h2>
              <div className="bg-card border border-border rounded-xl p-6 grid sm:grid-cols-2 gap-6">
                {[
                  ['Vulnerability severity', ['critical', 'high', 'medium', 'low', 'info']],
                  ['Vulnerability likelihood', ['high', 'medium', 'low']],
                  ['Vulnerability status', ['open', 'fixed', 'accepted', 'ignored', 'retest', 'false_positive', 'validated']],
                  ['Retest status', ['no_retest', 'waiting', 'completed']],
                  ['OWASP category', ['web', 'api', 'mobile', 'ai']],
                  ['Project environment', ['external', 'internal', 'both']],
                  ['Testing model', ['black_box', 'gray_box', 'white_box']],
                  ['Share permission', ['read', 'read_write', 'read_write_add']],
                  ['Comment type', ['general', 'comment', 'action_item', 'annotation', 'question']],
                  ['File type', ['note', 'report', 'screenshot', 'evidence', 'script', 'other']],
                ].map(([label, values]) => (
                  <div key={label as string}>
                    <h3 className="font-semibold text-sm mb-2">{label as string}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(values as string[]).map(v => (
                        <code key={v} className="bg-muted px-2 py-0.5 rounded text-xs">{v}</code>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Rate Limits & Best Practices */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Rate Limits &amp; Best Practices
              </h2>
              <div className="bg-card border border-border rounded-xl p-6 space-y-5 text-sm">
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Standard endpoints', limit: '120 req / min', note: 'Per API token' },
                    { label: 'AI endpoints', limit: '10 req / min', note: '/generate-* · /ai-*' },
                    { label: 'Scanner imports', limit: '30 req / min', note: '/process-*' },
                  ].map(({ label, limit, note }) => (
                    <div key={label} className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className="font-bold text-primary">{limit}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{note}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">When rate-limited (429)</h3>
                  <p className="text-muted-foreground">
                    Back off with exponential jitter. Start at 1 second, double on each retry, cap at 60 seconds.
                    The <code className="bg-muted px-1 rounded">Retry-After</code> header indicates the minimum wait time.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Best practices</h3>
                  <ul className="text-muted-foreground space-y-1.5 list-disc pl-5">
                    <li>Filter vulnerabilities by <code className="bg-muted px-1 rounded">project_id</code> to avoid fetching your entire workspace on every call</li>
                    <li>Store tokens in a secrets manager — never commit them to version control</li>
                    <li>Create a separate token per integration — makes rotation and audit easier</li>
                    <li>Client portal tokens (<code className="bg-muted px-1 rounded">cpt_</code> prefix) are separate from API tokens and cannot be used for API calls</li>
                    <li>AI endpoints may take 5–30 s depending on model load — use async patterns and avoid tight retry loops</li>
                    <li>Use <code className="bg-muted px-1 rounded">export-project</code> for full project backups before bulk updates or migrations</li>
                  </ul>
                </div>
              </div>
            </section>

          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}