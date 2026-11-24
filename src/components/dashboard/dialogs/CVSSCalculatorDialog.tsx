import { useState } from 'react';
import { Calculator, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// CVSS 3.1 Metrics
const cvssMetrics = {
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

type MetricKey = keyof typeof cvssMetrics;

interface CVSSCalculatorDialogProps {
  trigger?: React.ReactNode;
  onScoreSelect?: (score: number) => void;
}

export function CVSSCalculatorDialog({ trigger, onScoreSelect }: CVSSCalculatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState<Record<MetricKey, string>>({
    AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H',
  });
  const [copied, setCopied] = useState(false);

  const calculateScore = (): { score: number; severity: string; color: string } => {
    const getScore = (key: MetricKey) => {
      const metric = cvssMetrics[key];
      const option = metric.options.find(o => o.value === metrics[key]);
      return option?.score || 0;
    };

    const av = getScore('AV');
    const ac = getScore('AC');
    let pr = getScore('PR');
    const ui = getScore('UI');
    const scopeChanged = metrics.S === 'C';
    const c = getScore('C');
    const i = getScore('I');
    const a = getScore('A');

    // Adjust PR for scope change
    if (scopeChanged && metrics.PR === 'L') pr = 0.68;
    if (scopeChanged && metrics.PR === 'H') pr = 0.50;

    const iss = 1 - ((1 - c) * (1 - i) * (1 - a));
    const impact = scopeChanged 
      ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
      : 6.42 * iss;
    const exploitability = 8.22 * av * ac * pr * ui;

    let score = 0;
    if (impact <= 0) {
      score = 0;
    } else if (scopeChanged) {
      score = Math.min(1.08 * (impact + exploitability), 10);
    } else {
      score = Math.min(impact + exploitability, 10);
    }

    score = Math.ceil(score * 10) / 10;

    let severity = 'None';
    let color = 'text-muted-foreground';
    if (score >= 9.0) { severity = 'Critical'; color = 'text-red-500'; }
    else if (score >= 7.0) { severity = 'High'; color = 'text-orange-500'; }
    else if (score >= 4.0) { severity = 'Medium'; color = 'text-yellow-500'; }
    else if (score >= 0.1) { severity = 'Low'; color = 'text-blue-500'; }

    return { score, severity, color };
  };

  const getVector = () => {
    return `CVSS:3.1/AV:${metrics.AV}/AC:${metrics.AC}/PR:${metrics.PR}/UI:${metrics.UI}/S:${metrics.S}/C:${metrics.C}/I:${metrics.I}/A:${metrics.A}`;
  };

  const copyVector = () => {
    navigator.clipboard.writeText(getVector());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseScore = () => {
    if (onScoreSelect) {
      onScoreSelect(result.score);
      setOpen(false);
    }
  };

  const result = calculateScore();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Calculator className="h-4 w-4 mr-2" />
            CVSS Calc
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            CVSS 3.1 Calculator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(cvssMetrics) as [MetricKey, typeof cvssMetrics[MetricKey]][]).map(([key, metric]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{metric.name}</Label>
                <Select value={metrics[key]} onValueChange={(v) => setMetrics(prev => ({ ...prev, [key]: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metric.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label} ({opt.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">CVSS Score</span>
              <span className={`text-2xl font-bold ${result.color}`}>{result.score}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Severity</span>
              <span className={`text-sm font-semibold ${result.color}`}>{result.severity}</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded border border-border overflow-x-auto">
                {getVector()}
              </code>
              <Button variant="ghost" size="sm" onClick={copyVector}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {onScoreSelect && (
            <div className="flex justify-end">
              <Button onClick={handleUseScore} variant="cyber">
                Use This Score ({result.score})
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
