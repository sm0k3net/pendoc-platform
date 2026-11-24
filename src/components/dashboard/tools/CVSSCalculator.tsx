import { useState } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// ─── CVSS 3.1 ────────────────────────────────────────────────────────────────

const cvss31Metrics = {
  AV: { name: 'Attack Vector', options: [
    { value: 'N', label: 'Network', score: 0.85 },
    { value: 'A', label: 'Adjacent', score: 0.62 },
    { value: 'L', label: 'Local', score: 0.55 },
    { value: 'P', label: 'Physical', score: 0.2 },
  ]},
  AC: { name: 'Attack Complexity', options: [
    { value: 'L', label: 'Low', score: 0.77 },
    { value: 'H', label: 'High', score: 0.44 },
  ]},
  PR: { name: 'Privileges Required', options: [
    { value: 'N', label: 'None', score: 0.85 },
    { value: 'L', label: 'Low', score: 0.62 },
    { value: 'H', label: 'High', score: 0.27 },
  ]},
  UI: { name: 'User Interaction', options: [
    { value: 'N', label: 'None', score: 0.85 },
    { value: 'R', label: 'Required', score: 0.62 },
  ]},
  S: { name: 'Scope', options: [
    { value: 'U', label: 'Unchanged', score: 0 },
    { value: 'C', label: 'Changed', score: 1 },
  ]},
  C: { name: 'Confidentiality', options: [
    { value: 'N', label: 'None', score: 0 },
    { value: 'L', label: 'Low', score: 0.22 },
    { value: 'H', label: 'High', score: 0.56 },
  ]},
  I: { name: 'Integrity', options: [
    { value: 'N', label: 'None', score: 0 },
    { value: 'L', label: 'Low', score: 0.22 },
    { value: 'H', label: 'High', score: 0.56 },
  ]},
  A: { name: 'Availability', options: [
    { value: 'N', label: 'None', score: 0 },
    { value: 'L', label: 'Low', score: 0.22 },
    { value: 'H', label: 'High', score: 0.56 },
  ]},
};

type Cvss31Key = keyof typeof cvss31Metrics;

function calculateCvss31(m: Record<Cvss31Key, string>): { score: number; severity: string } {
  const get = (key: Cvss31Key) => cvss31Metrics[key].options.find(o => o.value === m[key])?.score ?? 0;
  const av = get('AV'), ac = get('AC'), ui = get('UI'), c = get('C'), i_ = get('I'), a = get('A');
  const scopeChanged = m.S === 'C';
  let pr = get('PR');
  if (scopeChanged && m.PR === 'L') pr = 0.68;
  if (scopeChanged && m.PR === 'H') pr = 0.50;
  const iss = 1 - (1 - c) * (1 - i_) * (1 - a);
  const impact = scopeChanged
    ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
    : 6.42 * iss;
  const exploitability = 8.22 * av * ac * pr * ui;
  let score = impact <= 0 ? 0 : scopeChanged
    ? Math.min(1.08 * (impact + exploitability), 10)
    : Math.min(impact + exploitability, 10);
  score = Math.ceil(score * 10) / 10;
  const severity = score === 0 ? 'None' : score < 4 ? 'Low' : score < 7 ? 'Medium' : score < 9 ? 'High' : 'Critical';
  return { score, severity };
}

function getCvss31Vector(m: Record<Cvss31Key, string>) {
  return `CVSS:3.1/AV:${m.AV}/AC:${m.AC}/PR:${m.PR}/UI:${m.UI}/S:${m.S}/C:${m.C}/I:${m.I}/A:${m.A}`;
}

// ─── CVSS 4.0 ────────────────────────────────────────────────────────────────

const cvss40Metrics = {
  AV: { name: 'Attack Vector', group: 'Exploitability', options: [
    { value: 'N', label: 'Network' },
    { value: 'A', label: 'Adjacent' },
    { value: 'L', label: 'Local' },
    { value: 'P', label: 'Physical' },
  ]},
  AC: { name: 'Attack Complexity', group: 'Exploitability', options: [
    { value: 'L', label: 'Low' },
    { value: 'H', label: 'High' },
  ]},
  AT: { name: 'Attack Requirements', group: 'Exploitability', options: [
    { value: 'N', label: 'None' },
    { value: 'P', label: 'Present' },
  ]},
  PR: { name: 'Privileges Required', group: 'Exploitability', options: [
    { value: 'N', label: 'None' },
    { value: 'L', label: 'Low' },
    { value: 'H', label: 'High' },
  ]},
  UI: { name: 'User Interaction', group: 'Exploitability', options: [
    { value: 'N', label: 'None' },
    { value: 'P', label: 'Passive' },
    { value: 'A', label: 'Active' },
  ]},
  VC: { name: 'Vuln. System Confidentiality', group: 'Impact', options: [
    { value: 'H', label: 'High' },
    { value: 'L', label: 'Low' },
    { value: 'N', label: 'None' },
  ]},
  VI: { name: 'Vuln. System Integrity', group: 'Impact', options: [
    { value: 'H', label: 'High' },
    { value: 'L', label: 'Low' },
    { value: 'N', label: 'None' },
  ]},
  VA: { name: 'Vuln. System Availability', group: 'Impact', options: [
    { value: 'H', label: 'High' },
    { value: 'L', label: 'Low' },
    { value: 'N', label: 'None' },
  ]},
  SC: { name: 'Subseq. System Confidentiality', group: 'SubsImpact', options: [
    { value: 'H', label: 'High' },
    { value: 'L', label: 'Low' },
    { value: 'N', label: 'None' },
  ]},
  SI: { name: 'Subseq. System Integrity', group: 'SubsImpact', options: [
    { value: 'H', label: 'High' },
    { value: 'L', label: 'Low' },
    { value: 'N', label: 'None' },
  ]},
  SA: { name: 'Subseq. System Availability', group: 'SubsImpact', options: [
    { value: 'H', label: 'High' },
    { value: 'L', label: 'Low' },
    { value: 'N', label: 'None' },
  ]},
};

type Cvss40Key = keyof typeof cvss40Metrics;

const EQ_AV: Record<string, number> = { N: 0, A: 1, L: 2, P: 3 };
const EQ_AC: Record<string, number> = { L: 0, H: 1 };
const EQ_AT: Record<string, number> = { N: 0, P: 1 };
const EQ_PR: Record<string, number> = { N: 0, L: 1, H: 2 };
const EQ_UI: Record<string, number> = { N: 0, P: 1, A: 2 };
const EQ_CIA: Record<string, number> = { H: 0, L: 1, N: 2 };

function calculateCvss40(m: Record<Cvss40Key, string>): { score: number; severity: string } {
  const expIdx = (EQ_AV[m.AV] ?? 0) + (EQ_AC[m.AC] ?? 0) + (EQ_AT[m.AT] ?? 0) + (EQ_PR[m.PR] ?? 0) + (EQ_UI[m.UI] ?? 0);
  const impactIdx = (EQ_CIA[m.VC] ?? 2) + (EQ_CIA[m.VI] ?? 2) + (EQ_CIA[m.VA] ?? 2) + (EQ_CIA[m.SC] ?? 2) + (EQ_CIA[m.SI] ?? 2) + (EQ_CIA[m.SA] ?? 2);
  const exploitFactor = Math.max(0, 1 - expIdx / 9);
  const impactFactor = Math.max(0, 1 - impactIdx / 12);
  const score = Math.round(Math.min((exploitFactor * 0.4 + impactFactor * 0.6) * 10, 10) * 10) / 10;
  const severity = score === 0 ? 'None' : score < 4 ? 'Low' : score < 7 ? 'Medium' : score < 9 ? 'High' : 'Critical';
  return { score, severity };
}

function getCvss40Vector(m: Record<Cvss40Key, string>) {
  return `CVSS:4.0/AV:${m.AV}/AC:${m.AC}/AT:${m.AT}/PR:${m.PR}/UI:${m.UI}/VC:${m.VC}/VI:${m.VI}/VA:${m.VA}/SC:${m.SC}/SI:${m.SI}/SA:${m.SA}`;
}

// ─── CVSS 2.0 ────────────────────────────────────────────────────────────────

const cvss20Metrics = {
  AV: { name: 'Access Vector', options: [
    { value: 'N', label: 'Network', score: 1.0 },
    { value: 'A', label: 'Adjacent Network', score: 0.646 },
    { value: 'L', label: 'Local', score: 0.395 },
  ]},
  AC: { name: 'Access Complexity', options: [
    { value: 'L', label: 'Low', score: 0.71 },
    { value: 'M', label: 'Medium', score: 0.61 },
    { value: 'H', label: 'High', score: 0.35 },
  ]},
  Au: { name: 'Authentication', options: [
    { value: 'N', label: 'None', score: 0.704 },
    { value: 'S', label: 'Single', score: 0.56 },
    { value: 'M', label: 'Multiple', score: 0.45 },
  ]},
  C: { name: 'Confidentiality Impact', options: [
    { value: 'N', label: 'None', score: 0 },
    { value: 'P', label: 'Partial', score: 0.275 },
    { value: 'C', label: 'Complete', score: 0.660 },
  ]},
  I: { name: 'Integrity Impact', options: [
    { value: 'N', label: 'None', score: 0 },
    { value: 'P', label: 'Partial', score: 0.275 },
    { value: 'C', label: 'Complete', score: 0.660 },
  ]},
  A: { name: 'Availability Impact', options: [
    { value: 'N', label: 'None', score: 0 },
    { value: 'P', label: 'Partial', score: 0.275 },
    { value: 'C', label: 'Complete', score: 0.660 },
  ]},
};

type Cvss20Key = keyof typeof cvss20Metrics;

function calculateCvss20(m: Record<Cvss20Key, string>): { score: number; severity: string } {
  const get = (key: Cvss20Key) => cvss20Metrics[key].options.find(o => o.value === m[key])?.score ?? 0;
  const av = get('AV'), ac = get('AC'), au = get('Au'), c = get('C'), i_ = get('I'), a = get('A');
  const impact = 10.41 * (1 - (1 - c) * (1 - i_) * (1 - a));
  const exploitability = 20 * av * ac * au;
  const fImpact = impact === 0 ? 0 : 1.176;
  const score = Math.round(((0.6 * impact + 0.4 * exploitability - 1.5) * fImpact) * 10) / 10;
  const clamped = Math.min(Math.max(score, 0), 10);
  const severity = clamped === 0 ? 'None' : clamped < 4 ? 'Low' : clamped < 7 ? 'Medium' : 'High';
  return { score: clamped, severity };
}

function getCvss20Vector(m: Record<Cvss20Key, string>) {
  return `AV:${m.AV}/AC:${m.AC}/Au:${m.Au}/C:${m.C}/I:${m.I}/A:${m.A}`;
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function severityColor(s: string) {
  if (s === 'Critical') return 'text-red-500';
  if (s === 'High') return 'text-orange-500';
  if (s === 'Medium') return 'text-yellow-500';
  if (s === 'Low') return 'text-blue-500';
  return 'text-muted-foreground';
}

function ScoreDisplay({ result, vector, copied, onCopy, note, noteWarn }: {
  result: { score: number; severity: string };
  vector: string;
  copied: boolean;
  onCopy: () => void;
  note?: string;
  noteWarn?: boolean;
}) {
  const fillColor = result.score >= 9 ? '#ef4444' : result.score >= 7 ? '#f97316' : result.score >= 4 ? '#eab308' : result.score > 0 ? '#3b82f6' : '#6b7280';
  return (
    <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-3xl font-bold tabular-nums ${severityColor(result.severity)}`}>{result.score.toFixed(1)}</span>
        <Badge variant={result.score >= 7 ? 'destructive' : result.score >= 4 ? 'secondary' : 'outline'} className="text-xs">{result.severity}</Badge>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(result.score / 10) * 100}%`, background: fillColor }} />
      </div>
      <div className="flex items-center gap-2 overflow-hidden">
        <code className="flex-1 text-xs bg-background p-2 rounded border border-border overflow-x-auto whitespace-nowrap min-w-0">{vector}</code>
        <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0" onClick={onCopy} title="Copy vector">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {note && <p className={`text-[11px] ${noteWarn ? 'text-amber-500' : 'text-muted-foreground'}`}>{note}</p>}
    </div>
  );
}

// ─── Version Calculators ──────────────────────────────────────────────────────

function Cvss31Calc() {
  const [m, setM] = useState<Record<Cvss31Key, string>>({ AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' });
  const [copied, setCopied] = useState(false);
  const result = calculateCvss31(m);
  const vector = getCvss31Vector(m);
  const copy = () => { navigator.clipboard.writeText(vector); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 min-[280px]:grid-cols-2 gap-2">
        {(Object.entries(cvss31Metrics) as [Cvss31Key, typeof cvss31Metrics[Cvss31Key]][]).map(([key, metric]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{metric.name}</Label>
            <Select value={m[key]} onValueChange={v => setM(p => ({ ...p, [key]: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {metric.options.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label} ({opt.value})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <ScoreDisplay result={result} vector={vector} copied={copied} onCopy={copy} />
    </div>
  );
}

function Cvss40Calc() {
  const [m, setM] = useState<Record<Cvss40Key, string>>({ AV: 'N', AC: 'L', AT: 'N', PR: 'N', UI: 'N', VC: 'H', VI: 'H', VA: 'H', SC: 'N', SI: 'N', SA: 'N' });
  const [copied, setCopied] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const result = calculateCvss40(m);
  const vector = getCvss40Vector(m);
  const copy = () => { navigator.clipboard.writeText(vector); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const exploit = (Object.entries(cvss40Metrics) as [Cvss40Key, typeof cvss40Metrics[Cvss40Key]][]).filter(([,v]) => v.group === 'Exploitability');
  const vuln = (Object.entries(cvss40Metrics) as [Cvss40Key, typeof cvss40Metrics[Cvss40Key]][]).filter(([,v]) => v.group === 'Impact');
  const subs = (Object.entries(cvss40Metrics) as [Cvss40Key, typeof cvss40Metrics[Cvss40Key]][]).filter(([,v]) => v.group === 'SubsImpact');

  const Group = ({ label, items }: { label: string; items: [Cvss40Key, typeof cvss40Metrics[Cvss40Key]][] }) => (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="grid grid-cols-1 min-[280px]:grid-cols-2 gap-2">
        {items.map(([key, metric]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{metric.name}</Label>
            <Select value={m[key]} onValueChange={v => setM(p => ({ ...p, [key]: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {metric.options.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label} ({opt.value})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <Group label="Exploitability" items={exploit} />
      <Group label="Vulnerable System Impact" items={vuln} />
      <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowSubs(v => !v)}>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSubs ? 'rotate-180' : ''}`} />
        Subsequent System Impact (optional)
      </button>
      {showSubs && <Group label="Subsequent System Impact" items={subs} />}
      <ScoreDisplay result={result} vector={vector} copied={copied} onCopy={copy} note="Approximate score — full CVSS 4.0 lookup table applies in official tools." />
    </div>
  );
}

function Cvss20Calc() {
  const [m, setM] = useState<Record<Cvss20Key, string>>({ AV: 'N', AC: 'L', Au: 'N', C: 'C', I: 'C', A: 'C' });
  const [copied, setCopied] = useState(false);
  const result = calculateCvss20(m);
  const vector = getCvss20Vector(m);
  const copy = () => { navigator.clipboard.writeText(vector); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 min-[280px]:grid-cols-2 gap-2">
        {(Object.entries(cvss20Metrics) as [Cvss20Key, typeof cvss20Metrics[Cvss20Key]][]).map(([key, metric]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{metric.name}</Label>
            <Select value={m[key]} onValueChange={v => setM(p => ({ ...p, [key]: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {metric.options.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label} ({opt.value})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <ScoreDisplay result={result} vector={vector} copied={copied} onCopy={copy} note="CVSS 2.0 is deprecated. Use CVSS 3.1 or 4.0 for new assessments." noteWarn />
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CVSSCalculator() {
  const [version, setVersion] = useState<'3.1' | '4.0' | '2.0'>('3.1');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-semibold">CVSS Version</Label>
        <Tabs value={version} onValueChange={(v: any) => setVersion(v)}>
          <TabsList className="h-7">
            <TabsTrigger value="3.1" className="text-xs px-3 h-6">v3.1</TabsTrigger>
            <TabsTrigger value="4.0" className="text-xs px-3 h-6">v4.0</TabsTrigger>
            <TabsTrigger value="2.0" className="text-xs px-3 h-6">v2.0</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {version === '3.1' && <Cvss31Calc />}
      {version === '4.0' && <Cvss40Calc />}
      {version === '2.0' && <Cvss20Calc />}
    </div>
  );
}

