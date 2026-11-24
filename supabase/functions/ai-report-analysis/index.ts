import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface GapAnalysisSection {
  title: string;
  icon: string;
  items: { severity: 'critical' | 'high' | 'medium' | 'low' | 'info'; text: string; recommendation?: string }[];
}

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface GapAnalysisResponse {
  executiveSummary?: string;
  sections: GapAnalysisSection[];
}

interface ComparisonItem {
  type: 'added' | 'removed' | 'modified' | 'note';
  content: string;
}

interface ComparisonSection {
  title: string;
  items: ComparisonItem[];
}

interface ComparisonResponse {
  executiveSummary?: string;
  sections: ComparisonSection[];
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function extractBalancedJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (escape) { escape = false; continue; }
    if (char === '\\') { escape = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === '{') depth++;
    if (char === '}') { depth--; if (depth === 0) return raw.slice(start, i + 1); }
  }
  return null;
}

function normalizeSeverity(value: string | undefined): SeverityLevel {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized as SeverityLevel;
  }
  return 'info';
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseGapAnalysis(text: string): GapAnalysisSection[] {
  const sections: GapAnalysisSection[] = [];
  const lines = text.split('\n');
  let currentSection: GapAnalysisSection | null = null;
  let currentItem: GapAnalysisSection['items'][number] | null = null;

  const sectionIcons: Record<string, string> = {
    'documentation': '📝', 'false positive': '⚠️', 'severity': '📊',
    'prioritization': '📊', 'quality': '✍️', 'missing': '❓',
    'compliance': '📋', 'recommendation': '💡', 'action': '💡',
  };

  for (const line of lines) {
    const h2Match = line.match(/^##\s+\d*\.?\s*(.+)/);
    if (h2Match) {
      if (currentSection) sections.push(currentSection);
      const title = h2Match[1].trim();
      let icon = '📌';
      for (const [key, value] of Object.entries(sectionIcons)) {
        if (title.toLowerCase().includes(key)) { icon = value; break; }
      }
      currentSection = { title, icon, items: [] };
      currentItem = null;
      continue;
    }
    if (!currentSection) continue;
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    const numberedMatch = line.match(/^\d+\.\s+(.+)/);
    if (bulletMatch || numberedMatch) {
      const content = (bulletMatch?.[1] || numberedMatch?.[1] || '').trim();
      let severity: SeverityLevel = 'info';
      if (/critical|severe/i.test(content)) severity = 'critical';
      else if (/high|important/i.test(content)) severity = 'high';
      else if (/medium|moderate/i.test(content)) severity = 'medium';
      else if (/low|minor/i.test(content)) severity = 'low';
      currentItem = { severity, text: content };
      currentSection.items.push(currentItem);
    } else if (line.trim() && currentItem) {
      if (line.toLowerCase().includes('recommend')) currentItem.recommendation = line.trim();
      else currentItem.text += ' ' + line.trim();
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

function parseStructuredGapAnalysis(raw: string): GapAnalysisResponse {
  const candidate = extractBalancedJsonObject(raw) || raw;
  try {
    const parsed = JSON.parse(candidate);
    const sections = Array.isArray(parsed?.sections)
      ? parsed.sections.map((section: any) => ({
          title: String(section?.title || 'Findings'),
          icon: String(section?.icon || '📌'),
          items: Array.isArray(section?.items)
            ? section.items
                .map((item: any) => ({
                  severity: normalizeSeverity(item?.severity),
                  text: String(item?.text || ''),
                  recommendation: item?.recommendation ? String(item.recommendation) : undefined,
                }))
                .filter((item: any) => item.text.trim().length > 0)
            : [],
        })).filter((s: GapAnalysisSection) => s.items.length > 0)
      : [];
    if (sections.length > 0) {
      return { executiveSummary: parsed?.executiveSummary ? String(parsed.executiveSummary) : undefined, sections };
    }
  } catch { /* fallback */ }
  return { executiveSummary: undefined, sections: parseGapAnalysis(raw) };
}

function parseStructuredComparison(raw: string): ComparisonResponse {
  const candidate = extractBalancedJsonObject(raw) || raw;
  try {
    const parsed = JSON.parse(candidate);
    const sections = Array.isArray(parsed?.sections)
      ? parsed.sections.map((section: any) => ({
          title: String(section?.title || 'Changes'),
          items: Array.isArray(section?.items)
            ? section.items
                .map((item: any) => ({
                  type: ['added', 'removed', 'modified'].includes(item?.type) ? item.type : 'note',
                  content: String(item?.content || ''),
                }))
                .filter((item: ComparisonItem) => item.content.trim().length > 0)
            : [],
        })).filter((s: ComparisonSection) => s.items.length > 0)
      : [];
    if (sections.length > 0) {
      return { executiveSummary: parsed?.executiveSummary ? String(parsed.executiveSummary) : undefined, sections };
    }
  } catch { /* fallback */ }

  const lines = raw.split('\n');
  const sections: ComparisonSection[] = [];
  let currentSection: ComparisonSection | null = null;
  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: h2Match[1].trim(), items: [] };
      continue;
    }
    if (!currentSection || !line.trim()) continue;
    if (line.startsWith('+ ')) currentSection.items.push({ type: 'added', content: line.slice(2).trim() });
    else if (line.startsWith('- ')) currentSection.items.push({ type: 'removed', content: line.slice(2).trim() });
    else if (line.startsWith('~ ')) currentSection.items.push({ type: 'modified', content: line.slice(2).trim() });
    else currentSection.items.push({ type: 'note', content: line.trim() });
  }
  if (currentSection) sections.push(currentSection);
  return { executiveSummary: undefined, sections };
}

// ─── HTML Generators ─────────────────────────────────────────────────────────

function generateGapAnalysisHTML(analysis: string, reportName: string): string {
  const parsed = parseStructuredGapAnalysis(analysis);
  const sections = parsed.sections;

  const severityColors = {
    critical: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5' },
    high:     { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#fdba74' },
    medium:   { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fcd34d' },
    low:      { bg: 'rgba(34, 197, 94, 0.15)',  border: '#22c55e', text: '#86efac' },
    info:     { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#93c5fd' },
  };

  const totalIssues   = sections.reduce((acc, s) => acc + s.items.length, 0);
  const criticalCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.severity === 'critical').length, 0);
  const highCount     = sections.reduce((acc, s) => acc + s.items.filter(i => i.severity === 'high').length, 0);
  const mediumCount   = sections.reduce((acc, s) => acc + s.items.filter(i => i.severity === 'medium').length, 0);
  const lowCount      = sections.reduce((acc, s) => acc + s.items.filter(i => i.severity === 'low').length, 0);

  const executiveSummary = parsed.executiveSummary?.trim() ||
    `Automated review completed for ${reportName}. The analysis highlights quality, completeness, prioritization, and remediation gaps that should be addressed before sharing the report externally.`;
  const readinessScore = Math.max(0, 100 - (criticalCount * 18 + highCount * 10 + mediumCount * 5 + lowCount * 2));
  const releaseGate = criticalCount > 0 ? 'Blocked' : highCount > 2 ? 'Conditional' : 'Ready with corrections';

  const topPriorities = sections
    .flatMap(section => section.items.map(item => ({ section: section.title, ...item })))
    .sort((a, b) => {
      const w: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return w[b.severity] - w[a.severity];
    })
    .slice(0, 5);

  const sectionsHTML = sections.map(section => {
    const itemsHTML = section.items.map(item => {
      const c = severityColors[item.severity];
      return `
        <div class="finding-item" style="background:${c.bg};border-left:4px solid ${c.border};padding:16px;border-radius:8px;margin:12px 0;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span class="severity-badge" style="background:${c.border};color:#fff;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;white-space:nowrap;">${item.severity}</span>
            <div style="flex:1;">
              <p style="color:${c.text};margin:0;line-height:1.5;">${escapeHtml(item.text)}</p>
              ${item.recommendation ? `<p style="color:#22c55e;margin-top:8px;font-size:0.9em;"><strong>💡 Recommendation:</strong> ${escapeHtml(item.recommendation)}</p>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="section" style="background:#1e293b;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid #334155;">
        <h2 style="color:#10b981;margin:0 0 20px 0;font-size:1.4rem;display:flex;align-items:center;gap:12px;">
          <span style="font-size:1.5rem;">${section.icon}</span>
          ${escapeHtml(section.title)}
          <span style="background:#334155;color:#94a3b8;padding:4px 12px;border-radius:20px;font-size:0.75rem;margin-left:auto;">${section.items.length} items</span>
        </h2>
        ${itemsHTML}
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gap Analysis Report - ${escapeHtml(reportName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Source Sans 3','Inter',sans-serif;background:#f8fafc;color:#0f172a;line-height:1.65;min-height:100vh; }
    .container { max-width:1160px;margin:0 auto;padding:40px 24px 56px; }
    .hero { position:relative;overflow:hidden;margin-bottom:28px;padding:42px;border-radius:28px;color:white;
            background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 55%,#0f766e 100%);box-shadow:0 28px 60px rgba(15,23,42,0.18); }
    .hero::before { content:'';position:absolute;inset:0;background:radial-gradient(circle at top right,rgba(255,255,255,0.16),transparent 28%); }
    .hero > * { position:relative; }
    .eyebrow { display:inline-flex;padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.08);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:18px; }
    .hero h1 { font-size:42px;line-height:1.05;margin-bottom:10px;font-weight:800;letter-spacing:-0.02em; }
    .hero p { color:rgba(226,232,240,0.88);margin:0; }
    .report-chip { display:inline-flex;margin-top:18px;padding:10px 16px;border-radius:14px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);font-weight:600; }
    .executive-grid { display:grid;grid-template-columns:1.4fr 0.9fr;gap:18px;margin-bottom:24px; }
    .panel { background:white;border:1px solid #e2e8f0;border-radius:20px;padding:24px;box-shadow:0 16px 40px rgba(15,23,42,0.06); }
    .panel-title { display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px; }
    .panel-title h2 { font-size:18px;line-height:1.2;margin:0;color:#0f172a;font-weight:800; }
    .badge { display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase; }
    .badge.blocked { background:rgba(239,68,68,0.12);color:#b91c1c; }
    .badge.conditional { background:rgba(245,158,11,0.14);color:#b45309; }
    .badge.ready { background:rgba(16,185,129,0.14);color:#047857; }
    .summary-copy { color:#334155;font-size:15px; }
    .score { display:flex;flex-direction:column;justify-content:center;gap:12px;min-height:100%; }
    .score-ring { width:140px;height:140px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;
                  background:conic-gradient(#2563eb 0 ${readinessScore}%,#e2e8f0 ${readinessScore}% 100%); }
    .score-ring::before { content:'';width:102px;height:102px;border-radius:50%;background:white;position:absolute; }
    .score-value { position:relative;font-size:34px;font-weight:800;color:#0f172a; }
    .score-caption { text-align:center;color:#475569;font-size:13px; }
    .stats-grid { display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:24px; }
    .stat-card { background:white;border-radius:18px;padding:20px;border:1px solid #e2e8f0;box-shadow:0 12px 28px rgba(15,23,42,0.05); }
    .stat-card .value { font-size:30px;font-weight:800;margin-bottom:6px; }
    .stat-card .label { color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700; }
    .stat-card.total .value { color:#1d4ed8; } .stat-card.critical .value { color:#dc2626; }
    .stat-card.high .value { color:#ea580c; } .stat-card.medium .value { color:#d97706; } .stat-card.low .value { color:#0f766e; }
    .priority-list { display:grid;gap:12px; }
    .priority-item { padding:14px 16px;border-radius:16px;border:1px solid #e2e8f0;background:#f8fafc; }
    .priority-item .meta { font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-weight:700;margin-bottom:6px; }
    .priority-item .text { color:#0f172a;font-weight:600; }
    .sections-grid { display:grid;gap:22px; }
    .section { background:white;border-radius:22px;padding:28px;border:1px solid #e2e8f0;box-shadow:0 14px 34px rgba(15,23,42,0.05); }
    .section-header { display:flex;align-items:center;gap:14px;margin-bottom:18px; }
    .section-icon { width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:18px; }
    .section-title { font-size:24px;font-weight:800;color:#0f172a; }
    .section-count { margin-left:auto;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700; }
    .findings-stack { display:grid;gap:12px; }
    .finding-item { border-radius:18px;padding:18px;border:1px solid #e2e8f0; }
    .finding-row { display:flex;gap:12px;align-items:flex-start; }
    .severity-badge { min-width:86px;justify-content:center;color:white;padding:6px 10px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em; }
    .finding-copy { color:#1e293b; }
    .recommendation { margin-top:10px;padding:10px 12px;border-radius:14px;background:rgba(16,185,129,0.1);color:#065f46;font-size:14px; }
    .footer { text-align:center;margin-top:48px;padding:24px;border-top:1px solid #cbd5e1;color:#64748b;font-size:0.85rem; }
    .footer a { color:#2563eb;text-decoration:none; }
    @media(max-width:768px) { .executive-grid,.stats-grid { grid-template-columns:1fr; } .hero { padding:28px; } .hero h1 { font-size:32px; } .finding-row { flex-direction:column; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="eyebrow">Report Quality Assurance</div>
      <h1>Gap Analysis Report</h1>
      <p>Professional editorial and technical review of report quality, completeness, prioritization, and client-readiness.</p>
      <div class="report-chip">${escapeHtml(reportName)}</div>
    </div>
    <div class="executive-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>Executive Summary</h2>
          <span class="badge ${releaseGate === 'Blocked' ? 'blocked' : releaseGate === 'Conditional' ? 'conditional' : 'ready'}">${escapeHtml(releaseGate)}</span>
        </div>
        <div class="summary-copy">${escapeHtml(executiveSummary)}</div>
      </div>
      <div class="panel score">
        <div class="panel-title"><h2>Publication Readiness</h2></div>
        <div class="score-ring"><div class="score-value">${readinessScore}</div></div>
        <div class="score-caption">Score based on severity and density of identified gaps. Critical=−18, High=−10, Medium=−5, Low=−2.</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card total"><div class="value">${totalIssues}</div><div class="label">Total Findings</div></div>
      <div class="stat-card critical"><div class="value">${criticalCount}</div><div class="label">Critical Gaps</div></div>
      <div class="stat-card high"><div class="value">${highCount}</div><div class="label">High Priority</div></div>
      <div class="stat-card medium"><div class="value">${mediumCount}</div><div class="label">Medium Priority</div></div>
      <div class="stat-card low"><div class="value">${lowCount}</div><div class="label">Low Priority</div></div>
    </div>
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-title"><h2>Immediate Priority Actions</h2></div>
      <div class="priority-list">
        ${topPriorities.length > 0
          ? topPriorities.map(item => `
            <div class="priority-item">
              <div class="meta">${escapeHtml(item.section)} · ${escapeHtml(item.severity)}</div>
              <div class="text">${escapeHtml(item.text)}</div>
            </div>`).join('')
          : '<div class="priority-item"><div class="text">No significant issues were identified in the current analysis.</div></div>'}
      </div>
    </div>
    <div class="sections-grid">${sections.map(section => {
      const itemsHTML = section.items.map(item => {
        const c = severityColors[item.severity];
        return `
          <div class="finding-item" style="background:${c.bg};border-left:4px solid ${c.border};">
            <div class="finding-row">
              <span class="severity-badge" style="background:${c.border};">${item.severity}</span>
              <div class="finding-copy">
                <div>${escapeHtml(item.text)}</div>
                ${item.recommendation ? `<div class="recommendation"><strong>Recommended action:</strong> ${escapeHtml(item.recommendation)}</div>` : ''}
              </div>
            </div>
          </div>`;
      }).join('');
      return `
        <div class="section">
          <div class="section-header">
            <div class="section-icon">${section.icon}</div>
            <div class="section-title">${escapeHtml(section.title)}</div>
            <div class="section-count">${section.items.length} findings</div>
          </div>
          <div class="findings-stack">${itemsHTML}</div>
        </div>`;
    }).join('')}</div>
    <div class="footer">
      <p>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} by <a href="https://pendoc.org" target="_blank">PenDoc Platform</a></p>
    </div>
  </div>
</body>
</html>`;
}

function generateComparisonHTML(analysis: string, report1Name: string, report2Name: string): string {
  const parsed = parseStructuredComparison(analysis);
  const changes = parsed.sections
    .flatMap(s => s.items)
    .filter(i => i.type !== 'note') as Array<{ type: 'added' | 'removed' | 'modified'; content: string }>;

  let sectionsHTML = '';
  for (const section of parsed.sections) {
    const content = section.items.map(item => {
      if (item.type === 'added')    return `<div style="background:rgba(34,197,94,0.1);border-left:4px solid #22c55e;padding:12px 16px;border-radius:8px;margin:8px 0;font-family:monospace;"><span style="color:#22c55e;font-weight:600;">+ </span><span style="color:#86efac;">${escapeHtml(item.content)}</span></div>`;
      if (item.type === 'removed')  return `<div style="background:rgba(239,68,68,0.1);border-left:4px solid #ef4444;padding:12px 16px;border-radius:8px;margin:8px 0;font-family:monospace;"><span style="color:#ef4444;font-weight:600;">- </span><span style="color:#fca5a5;">${escapeHtml(item.content)}</span></div>`;
      if (item.type === 'modified') return `<div style="background:rgba(245,158,11,0.1);border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin:8px 0;font-family:monospace;"><span style="color:#f59e0b;font-weight:600;">~ </span><span style="color:#fcd34d;">${escapeHtml(item.content)}</span></div>`;
      return `<p style="color:#94a3b8;margin:8px 0;line-height:1.6;">${escapeHtml(item.content)}</p>`;
    }).join('');
    sectionsHTML += `
      <div style="background:#1e293b;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid #334155;">
        <h2 style="color:#10b981;margin:0 0 20px 0;font-size:1.3rem;">${escapeHtml(section.title)}</h2>
        ${content}
      </div>`;
  }

  const addedCount   = changes.filter(c => c.type === 'added').length;
  const removedCount = changes.filter(c => c.type === 'removed').length;
  const modifiedCount = changes.filter(c => c.type === 'modified').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Comparison - ${escapeHtml(report1Name)} vs ${escapeHtml(report2Name)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Source Sans 3','Inter',sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);color:#e2e8f0;line-height:1.6;min-height:100vh; }
    .container { max-width:1200px;margin:0 auto;padding:48px 24px; }
    .header { text-align:center;margin-bottom:40px;padding:40px;background:linear-gradient(135deg,rgba(59,130,246,0.1) 0%,rgba(168,85,247,0.1) 100%);border-radius:24px;border:1px solid rgba(59,130,246,0.2); }
    .header h1 { font-size:2.8rem;background:linear-gradient(135deg,#3b82f6 0%,#a855f7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px;font-weight:700; }
    .comparison-badges { display:flex;justify-content:center;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px; }
    .report-badge { background:#1e293b;padding:16px 24px;border-radius:12px;border:2px solid #334155; }
    .report-badge.baseline { border-left:4px solid #ef4444; } .report-badge.current { border-left:4px solid #22c55e; }
    .report-badge .label { font-size:0.75rem;color:#64748b;text-transform:uppercase;margin-bottom:4px; }
    .report-badge .name { font-weight:600;color:#e2e8f0; }
    .arrow { color:#64748b;font-size:1.5rem; }
    .legend { display:flex;justify-content:center;gap:32px;margin-top:24px; }
    .legend-item { display:flex;align-items:center;gap:8px;font-size:0.9rem; }
    .legend-dot { width:14px;height:14px;border-radius:4px; }
    .legend-dot.added { background:#22c55e; } .legend-dot.removed { background:#ef4444; } .legend-dot.modified { background:#f59e0b; }
    .stats-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:40px; }
    .stat-card { background:#1e293b;border-radius:16px;padding:24px;text-align:center;border:1px solid #334155; }
    .stat-card .value { font-size:2.5rem;font-weight:700;margin-bottom:4px; }
    .stat-card.added .value { color:#22c55e; } .stat-card.removed .value { color:#ef4444; } .stat-card.modified .value { color:#f59e0b; }
    .stat-card .label { color:#94a3b8;font-size:0.85rem; }
    .footer { text-align:center;margin-top:48px;padding:24px;border-top:1px solid #334155;color:#64748b;font-size:0.85rem; }
    .footer a { color:#3b82f6;text-decoration:none; }
    @media(max-width:768px) { .stats-grid { grid-template-columns:1fr; } .header h1 { font-size:2rem; } .comparison-badges { flex-direction:column; } .arrow { transform:rotate(90deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Report Comparison</h1>
      <div class="comparison-badges">
        <div class="report-badge baseline"><div class="label">Baseline Report</div><div class="name">📄 ${escapeHtml(report1Name)}</div></div>
        <span class="arrow">→</span>
        <div class="report-badge current"><div class="label">Current Report</div><div class="name">📄 ${escapeHtml(report2Name)}</div></div>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot added"></div> Added/New</div>
        <div class="legend-item"><div class="legend-dot removed"></div> Removed/Fixed</div>
        <div class="legend-item"><div class="legend-dot modified"></div> Modified</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card added"><div class="value">${addedCount}</div><div class="label">New Items</div></div>
      <div class="stat-card removed"><div class="value">${removedCount}</div><div class="label">Removed/Fixed</div></div>
      <div class="stat-card modified"><div class="value">${modifiedCount}</div><div class="label">Modified</div></div>
    </div>
    ${sectionsHTML}
    <div class="footer">
      <p>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | <a href="https://pendoc.org" target="_blank">PenDoc Platform</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── AI call helper: try DeepSeek, fall back to OpenAI ───────────────────────

async function callAI(params: {
  deepseekKey: string;
  openaiKey: string | undefined;
  systemPrompt: string;
  userPrompt: string;
  stream: boolean;
}): Promise<{ analysis: string; model: string } | { stream: ReadableStream; model: string }> {
  const { deepseekKey, openaiKey, systemPrompt, userPrompt, stream } = params;

  const deepseekBody = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4000,
    stream,
  });

  let dsError: Error | null = null;
  try {
    const r = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekKey}` },
      body: deepseekBody,
    });
    if (!r.ok) throw new Error(`DeepSeek HTTP ${r.status}`);

    if (stream && r.body) {
      const body = r.body;
      return {
        model: 'deepseek',
        stream: new ReadableStream({
          async start(controller) {
            const reader = body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          },
        }),
      };
    }

    const json = await r.json();
    const analysis = json.choices?.[0]?.message?.content;
    if (!analysis) throw new Error('Empty DeepSeek response');
    return { analysis, model: 'deepseek' };
  } catch (e) {
    dsError = e as Error;
    console.warn('DeepSeek failed:', dsError.message);
  }

  // OpenAI fallback (non-streaming only; streaming fallback not needed as primary failed)
  if (openaiKey) {
    try {
      const r2 = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
      if (!r2.ok) throw new Error(`OpenAI HTTP ${r2.status}`);
      const json2 = await r2.json();
      const analysis = json2.choices?.[0]?.message?.content;
      if (!analysis) throw new Error('Empty OpenAI response');
      return { analysis, model: 'openai-gpt-4o-mini' };
    } catch (e) {
      console.error('OpenAI fallback failed:', (e as Error).message);
      throw new Error('All AI providers failed');
    }
  }

  throw new Error(`AI service unavailable: ${dsError?.message}`);
}

// ─── Edge Function Handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept POST JSON body; fall back to URL params for backward compatibility.
    const url = new URL(req.url);
    let action: string | null = null;
    let reportId: string | null = null;
    let reportId1: string | null = null;
    let reportId2: string | null = null;
    let streamMode = url.searchParams.get('stream') === 'true' || url.searchParams.get('stream') === '1';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      action    = body.action    ?? url.searchParams.get('action');
      reportId  = body.reportId  ?? url.searchParams.get('reportId');
      reportId1 = body.reportId1 ?? url.searchParams.get('reportId1');
      reportId2 = body.reportId2 ?? url.searchParams.get('reportId2');
      if (typeof body.stream === 'boolean') streamMode = body.stream;
    } else {
      action    = url.searchParams.get('action');
      reportId  = url.searchParams.get('reportId');
      reportId1 = url.searchParams.get('reportId1');
      reportId2 = url.searchParams.get('reportId2');
    }

    console.log('Report analysis requested', { action, streamMode });

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const deepseekKey    = Deno.env.get('DEEPSEEK_API_KEY');
    const openaiKey      = Deno.env.get('OPENAI_API_KEY');

    if (!deepseekKey) {
      return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY is not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = authData.user.id;

    // ── Audit helpers ──────────────────────────────────────────────────────────
    async function createAuditRun(params: { report_id?: string | null; action: string; status: string; model?: string; note?: string }) {
      try {
        const { data } = await userClient
          .from('report_analysis_runs')
          .insert({ user_id: userId, report_id: params.report_id ?? null, action: params.action, status: params.status, model: params.model ?? null, note: params.note ?? null })
          .select()
          .maybeSingle();
        return data as any;
      } catch (e) {
        console.warn('Audit insert failed:', e);
        return null;
      }
    }

    async function updateAuditRun(id: string, updates: Record<string, any>) {
      try { await userClient.from('report_analysis_runs').update(updates).eq('id', id); }
      catch (e) { console.warn('Audit update failed:', e); }
    }

    // ── Cache helpers ──────────────────────────────────────────────────────────
    async function findCachedAnalysis(report_id: string, type: 'gap' | 'compare', content_hash: string) {
      try {
        const { data } = await userClient
          .from('report_analyses')
          .select('id, analysis_json, html_report, model, created_at')
          .eq('report_id', report_id)
          .eq('type', type)
          .eq('content_hash', content_hash)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as any;
      } catch (e) {
        console.warn('Cache lookup failed:', e);
        return null;
      }
    }

    async function saveAnalysis(entry: { report_id: string; type: 'gap' | 'compare'; content_hash: string; analysis_json: string; html_report: string; model: string }) {
      try {
        const { data } = await userClient
          .from('report_analyses')
          .insert({ ...entry, created_by: userId })
          .select()
          .maybeSingle();
        return data as any;
      } catch (e) {
        console.warn('Save analysis failed:', e);
        return null;
      }
    }

    // ── gap-analysis ───────────────────────────────────────────────────────────
    if (action === 'gap-analysis') {
      if (!reportId) {
        return new Response(JSON.stringify({ error: 'reportId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: report, error: reportErr } = await userClient
        .from('project_reports')
        .select('id, name, html_content, report_type, project_id, created_by')
        .eq('id', reportId)
        .maybeSingle();

      if (reportErr || !report) {
        return new Response(JSON.stringify({ error: 'Report not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const fullText    = report.html_content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ') ?? '';
      const textContent = fullText.slice(0, 20000);
      const contentHash = await sha256Hex(fullText);
      const truncated   = fullText.length > 20000;

      // Return cached result if unchanged
      const cached = await findCachedAnalysis(report.id, 'gap', contentHash);
      if (cached) {
        console.log('Cache hit for gap-analysis', report.id);
        return new Response(
          JSON.stringify({ cached: true, analysis: cached.analysis_json, htmlReport: cached.html_report, reportId, reportName: report.name, model: cached.model }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const audit = await createAuditRun({ report_id: report.id, action: 'gap-analysis', status: 'started' });

      const systemPrompt = 'You are an expert penetration testing report reviewer. Return structured JSON only. Never use markdown or code fences.';
      const userPrompt = `You are a senior security consultant performing a COMPREHENSIVE gap analysis on a penetration testing report.

Return ONLY valid JSON with this exact structure:
{"executiveSummary":"short executive summary","sections":[{"title":"Documentation Gaps","icon":"📝","items":[{"severity":"critical|high|medium|low|info","text":"clear issue description","recommendation":"specific action to fix it"}]}]}

Evaluate: documentation gaps, potential false positives, severity and prioritization issues, quality/editorial issues, missing required content, compliance considerations, actionable recommendations.
Rules: no markdown, no code fences, items must be specific and evidence-driven, include recommendation only when useful.${truncated ? '\nNote: Report was truncated to 20,000 characters for analysis.' : ''}

REPORT CONTENT:
${textContent}`;

      let result: { analysis: string; model: string } | { stream: ReadableStream; model: string };
      try {
        result = await callAI({ deepseekKey, openaiKey, systemPrompt, userPrompt, stream: streamMode });
      } catch (e) {
        const msg = (e as Error).message;
        if (audit?.id) await updateAuditRun(audit.id, { status: 'failed', note: msg });
        return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Streaming response — hand raw SSE stream back directly
      if ('stream' in result) {
        if (audit?.id) await updateAuditRun(audit.id, { status: 'streaming', model: result.model });
        return new Response(result.stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...corsHeaders } });
      }

      // Synchronous response — persist and return
      const { analysis, model } = result;
      const htmlReport = generateGapAnalysisHTML(analysis, report.name);
      const saved = await saveAnalysis({ report_id: report.id, type: 'gap', content_hash: contentHash, analysis_json: analysis, html_report: htmlReport, model });
      if (audit?.id) await updateAuditRun(audit.id, { status: 'completed', model });

      return new Response(
        JSON.stringify({ analysis, htmlReport, reportId, reportName: report.name, model, savedId: saved?.id ?? null, truncated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );

    // ── compare ────────────────────────────────────────────────────────────────
    } else if (action === 'compare') {
      if (!reportId1 || !reportId2) {
        return new Response(JSON.stringify({ error: 'reportId1 and reportId2 are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: reports, error: reportsErr } = await userClient
        .from('project_reports')
        .select('id, name, html_content, report_type, created_at, project_id, created_by')
        .in('id', [reportId1, reportId2]);

      if (reportsErr || !reports || reports.length !== 2) {
        return new Response(JSON.stringify({ error: 'One or both reports not found or not accessible' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const report1 = reports.find(r => r.id === reportId1)!;
      const report2 = reports.find(r => r.id === reportId2)!;

      const full1 = report1.html_content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ') ?? '';
      const full2 = report2.html_content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ') ?? '';
      const text1 = full1.slice(0, 10000);
      const text2 = full2.slice(0, 10000);
      const contentHash = await sha256Hex(full1 + '::' + full2);
      const cacheKey = `${reportId1}::${reportId2}`;

      const cached = await findCachedAnalysis(cacheKey, 'compare', contentHash);
      if (cached) {
        console.log('Cache hit for compare', cacheKey);
        return new Response(
          JSON.stringify({ cached: true, analysis: cached.analysis_json, htmlReport: cached.html_report, report1Name: report1.name, report2Name: report2.name, model: cached.model }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const audit = await createAuditRun({ report_id: null, action: 'compare', status: 'started' });

      const systemPrompt = 'You are an expert at comparing security reports. Return structured JSON only. Never use markdown or code fences.';
      const userPrompt = `You are comparing two penetration testing reports.

Return ONLY valid JSON with this exact structure:
{"executiveSummary":"short comparison summary","sections":[{"title":"New Vulnerabilities","items":[{"type":"added|removed|modified|note","content":"clear comparison point"}]}]}

Required sections: Executive Summary, New Vulnerabilities, Fixed or Removed Vulnerabilities, Modified Vulnerabilities, Security Posture Change, Remediation Progress, Recommendations.
Rules: no markdown, no code fences, type=added for new issues / removed for fixed / modified for changed / note for narrative.

REPORT 1 (Baseline): "${report1.name}" (${report1.created_at})
${text1}

---

REPORT 2 (Current): "${report2.name}" (${report2.created_at})
${text2}`;

      let result: { analysis: string; model: string } | { stream: ReadableStream; model: string };
      try {
        result = await callAI({ deepseekKey, openaiKey, systemPrompt, userPrompt, stream: streamMode });
      } catch (e) {
        const msg = (e as Error).message;
        if (audit?.id) await updateAuditRun(audit.id, { status: 'failed', note: msg });
        return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if ('stream' in result) {
        if (audit?.id) await updateAuditRun(audit.id, { status: 'streaming', model: result.model });
        return new Response(result.stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...corsHeaders } });
      }

      const { analysis, model } = result;
      const htmlReport = generateComparisonHTML(analysis, report1.name, report2.name);
      const saved = await saveAnalysis({ report_id: cacheKey, type: 'compare', content_hash: contentHash, analysis_json: analysis, html_report: htmlReport, model });
      if (audit?.id) await updateAuditRun(audit.id, { status: 'completed', model });

      return new Response(
        JSON.stringify({ analysis, htmlReport, report1Name: report1.name, report2Name: report2.name, model, savedId: saved?.id ?? null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "gap-analysis" or "compare".' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


