import { useState, useMemo } from 'react';
import { Shield, Copy, Check, AlertTriangle, CheckCircle2, Info, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

type Severity = 'critical' | 'high' | 'medium' | 'info';
type Status = 'pass' | 'fail' | 'warn' | 'missing';

interface HeaderCheckResult {
  header: string;
  status: Status;
  severity: Severity;
  value: string | null;
  recommendation: string;
  details?: string;
}

interface CookieCheckResult {
  name: string;
  flags: { secure: boolean; httpOnly: boolean; sameSite: string | null };
  issues: string[];
  severity: Severity;
}

// Parse raw HTTP headers into a Map
function parseHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  for (const line of lines) {
    // Skip HTTP status line
    if (/^HTTP\/[\d.]+\s+\d+/.test(line)) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const name = line.substring(0, colonIdx).trim().toLowerCase();
      const value = line.substring(colonIdx + 1).trim();
      headers.set(name, value);
    }
  }
  return headers;
}

// Extract Set-Cookie headers (can be multiple)
function extractCookies(raw: string): string[] {
  const cookies: string[] = [];
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const name = line.substring(0, colonIdx).trim().toLowerCase();
      if (name === 'set-cookie') {
        cookies.push(line.substring(colonIdx + 1).trim());
      }
    }
  }
  return cookies;
}

function analyzeCookie(cookieStr: string): CookieCheckResult {
  const parts = cookieStr.split(';').map(p => p.trim());
  const nameValue = parts[0] || '';
  const name = nameValue.split('=')[0] || 'Unknown';
  const flagsLower = parts.slice(1).map(p => p.toLowerCase());

  const secure = flagsLower.some(f => f === 'secure');
  const httpOnly = flagsLower.some(f => f === 'httponly');
  const sameSitePart = flagsLower.find(f => f.startsWith('samesite'));
  const sameSite = sameSitePart ? sameSitePart.split('=')[1]?.trim() || null : null;

  const issues: string[] = [];
  let severity: Severity = 'info';

  if (!secure) {
    issues.push('Missing Secure flag — cookie sent over unencrypted HTTP');
    severity = 'high';
  }
  if (!httpOnly) {
    issues.push('Missing HttpOnly flag — cookie accessible via JavaScript (XSS risk)');
    severity = severity === 'high' ? 'high' : 'medium';
  }
  if (!sameSite || sameSite === 'none') {
    issues.push(`SameSite=${sameSite || 'not set'} — vulnerable to CSRF attacks`);
    severity = severity === 'info' ? 'medium' : severity;
  }

  return { name, flags: { secure, httpOnly, sameSite }, issues, severity };
}

// Main header analysis rules
function analyzeHeaders(headers: Map<string, string>): HeaderCheckResult[] {
  const results: HeaderCheckResult[] = [];

  // Strict-Transport-Security
  const hsts = headers.get('strict-transport-security');
  if (hsts) {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
    const hasSubDomains = hsts.toLowerCase().includes('includesubdomains');
    const hasPreload = hsts.toLowerCase().includes('preload');

    if (maxAge >= 31536000 && hasSubDomains) {
      results.push({
        header: 'Strict-Transport-Security',
        status: 'pass',
        severity: 'info',
        value: hsts,
        recommendation: hasPreload 
          ? 'Excellent — HSTS enabled with long max-age, includeSubDomains, and preload.'
          : 'Good — consider adding preload directive for HSTS preload list.',
      });
    } else if (maxAge > 0) {
      results.push({
        header: 'Strict-Transport-Security',
        status: 'warn',
        severity: 'medium',
        value: hsts,
        recommendation: `max-age=${maxAge} is ${maxAge < 31536000 ? 'too short (recommend ≥31536000)' : 'good'}. ${!hasSubDomains ? 'Add includeSubDomains.' : ''}`,
      });
    } else {
      results.push({
        header: 'Strict-Transport-Security',
        status: 'fail',
        severity: 'high',
        value: hsts,
        recommendation: 'max-age is 0 or invalid — HSTS effectively disabled.',
      });
    }
  } else {
    results.push({
      header: 'Strict-Transport-Security',
      status: 'missing',
      severity: 'high',
      value: null,
      recommendation: 'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    });
  }

  // Content-Security-Policy
  const csp = headers.get('content-security-policy');
  if (csp) {
    const hasUnsafeInline = csp.includes("'unsafe-inline'");
    const hasUnsafeEval = csp.includes("'unsafe-eval'");
    const issues: string[] = [];
    if (hasUnsafeInline) issues.push("'unsafe-inline' allows inline scripts (XSS risk)");
    if (hasUnsafeEval) issues.push("'unsafe-eval' allows eval() (code injection risk)");

    if (issues.length === 0) {
      results.push({
        header: 'Content-Security-Policy',
        status: 'pass',
        severity: 'info',
        value: csp.length > 120 ? csp.substring(0, 120) + '...' : csp,
        recommendation: 'CSP is present without unsafe directives.',
      });
    } else {
      results.push({
        header: 'Content-Security-Policy',
        status: 'warn',
        severity: 'high',
        value: csp.length > 120 ? csp.substring(0, 120) + '...' : csp,
        recommendation: issues.join('. ') + '. Consider using nonces or hashes instead.',
        details: csp,
      });
    }
  } else {
    results.push({
      header: 'Content-Security-Policy',
      status: 'missing',
      severity: 'critical',
      value: null,
      recommendation: "Add a Content-Security-Policy header to mitigate XSS. Start with: default-src 'self'",
    });
  }

  // X-Frame-Options
  const xfo = headers.get('x-frame-options');
  if (xfo) {
    const val = xfo.toUpperCase();
    if (val === 'DENY' || val === 'SAMEORIGIN') {
      results.push({
        header: 'X-Frame-Options',
        status: 'pass',
        severity: 'info',
        value: xfo,
        recommendation: `Clickjacking protection enabled (${val}). Consider also using CSP frame-ancestors.`,
      });
    } else {
      results.push({
        header: 'X-Frame-Options',
        status: 'warn',
        severity: 'medium',
        value: xfo,
        recommendation: 'Unexpected value. Use DENY or SAMEORIGIN.',
      });
    }
  } else {
    results.push({
      header: 'X-Frame-Options',
      status: 'missing',
      severity: 'high',
      value: null,
      recommendation: 'Add: X-Frame-Options: DENY (or SAMEORIGIN) to prevent clickjacking.',
    });
  }

  // X-Content-Type-Options
  const xcto = headers.get('x-content-type-options');
  if (xcto?.toLowerCase() === 'nosniff') {
    results.push({
      header: 'X-Content-Type-Options',
      status: 'pass',
      severity: 'info',
      value: xcto,
      recommendation: 'MIME-type sniffing protection enabled.',
    });
  } else if (xcto) {
    results.push({
      header: 'X-Content-Type-Options',
      status: 'warn',
      severity: 'medium',
      value: xcto,
      recommendation: 'Unexpected value. Set to: nosniff',
    });
  } else {
    results.push({
      header: 'X-Content-Type-Options',
      status: 'missing',
      severity: 'medium',
      value: null,
      recommendation: 'Add: X-Content-Type-Options: nosniff to prevent MIME-type sniffing.',
    });
  }

  // Referrer-Policy
  const rp = headers.get('referrer-policy');
  const goodReferrerPolicies = ['no-referrer', 'strict-origin', 'strict-origin-when-cross-origin', 'same-origin', 'no-referrer-when-downgrade'];
  if (rp && goodReferrerPolicies.includes(rp.toLowerCase())) {
    results.push({
      header: 'Referrer-Policy',
      status: 'pass',
      severity: 'info',
      value: rp,
      recommendation: 'Referrer policy is configured securely.',
    });
  } else if (rp) {
    results.push({
      header: 'Referrer-Policy',
      status: 'warn',
      severity: 'medium',
      value: rp,
      recommendation: `'${rp}' may leak sensitive URL data. Use strict-origin-when-cross-origin.`,
    });
  } else {
    results.push({
      header: 'Referrer-Policy',
      status: 'missing',
      severity: 'medium',
      value: null,
      recommendation: 'Add: Referrer-Policy: strict-origin-when-cross-origin',
    });
  }

  // Permissions-Policy
  const pp = headers.get('permissions-policy');
  if (pp) {
    results.push({
      header: 'Permissions-Policy',
      status: 'pass',
      severity: 'info',
      value: pp.length > 120 ? pp.substring(0, 120) + '...' : pp,
      recommendation: 'Permissions-Policy is configured. Review feature restrictions for completeness.',
    });
  } else {
    results.push({
      header: 'Permissions-Policy',
      status: 'missing',
      severity: 'medium',
      value: null,
      recommendation: 'Add: Permissions-Policy: camera=(), microphone=(), geolocation=() to restrict browser features.',
    });
  }

  // X-XSS-Protection (deprecated)
  const xxss = headers.get('x-xss-protection');
  if (xxss) {
    results.push({
      header: 'X-XSS-Protection',
      status: 'warn',
      severity: 'info',
      value: xxss,
      recommendation: 'This header is deprecated and can introduce vulnerabilities in older browsers. Remove it and rely on CSP instead.',
    });
  }

  // Server header (information disclosure)
  const server = headers.get('server');
  if (server && /[\d.]/.test(server)) {
    results.push({
      header: 'Server',
      status: 'warn',
      severity: 'medium',
      value: server,
      recommendation: 'Server header exposes version info. Remove or genericize to reduce fingerprinting surface.',
    });
  } else if (server) {
    results.push({
      header: 'Server',
      status: 'pass',
      severity: 'info',
      value: server,
      recommendation: 'Server header present but no version leaked.',
    });
  }

  // X-Powered-By (information disclosure)
  const xpb = headers.get('x-powered-by');
  if (xpb) {
    results.push({
      header: 'X-Powered-By',
      status: 'fail',
      severity: 'medium',
      value: xpb,
      recommendation: 'Remove X-Powered-By header — it exposes technology stack and aids targeted attacks.',
    });
  }

  // Cache-Control for sensitive pages
  const cc = headers.get('cache-control');
  if (cc) {
    const hasNoStore = cc.toLowerCase().includes('no-store');
    const hasNoCache = cc.toLowerCase().includes('no-cache');
    if (hasNoStore) {
      results.push({
        header: 'Cache-Control',
        status: 'pass',
        severity: 'info',
        value: cc,
        recommendation: 'no-store present — sensitive data not cached.',
      });
    } else if (!hasNoCache) {
      results.push({
        header: 'Cache-Control',
        status: 'warn',
        severity: 'medium',
        value: cc,
        recommendation: 'For pages with sensitive data, use: Cache-Control: no-store, no-cache, must-revalidate',
      });
    }
  }

  return results;
}

const severityColors: Record<Severity, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusIcons: Record<Status, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  fail: <XCircle className="h-4 w-4 text-red-400" />,
  warn: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  missing: <XCircle className="h-4 w-4 text-orange-400" />,
};

function generateMarkdownReport(headerResults: HeaderCheckResult[], cookieResults: CookieCheckResult[]): string {
  let md = '# HTTP Security Headers Analysis Report\n\n';
  md += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;

  // Summary
  const pass = headerResults.filter(r => r.status === 'pass').length;
  const fail = headerResults.filter(r => r.status === 'fail' || r.status === 'missing').length;
  const warn = headerResults.filter(r => r.status === 'warn').length;
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n|--------|-------|\n`;
  md += `| ✅ Pass | ${pass} |\n`;
  md += `| ❌ Fail/Missing | ${fail} |\n`;
  md += `| ⚠️ Warning | ${warn} |\n\n`;

  // Header Results
  md += '## Security Headers\n\n';
  md += '| Status | Header | Severity | Finding |\n';
  md += '|--------|--------|----------|----------|\n';
  for (const r of headerResults) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
    md += `| ${icon} | ${r.header} | ${r.severity.toUpperCase()} | ${r.recommendation} |\n`;
  }
  md += '\n';

  // Cookie Results
  if (cookieResults.length > 0) {
    md += '## Cookie Security\n\n';
    for (const c of cookieResults) {
      md += `### Cookie: \`${c.name}\`\n`;
      md += `- Secure: ${c.flags.secure ? '✅' : '❌'}\n`;
      md += `- HttpOnly: ${c.flags.httpOnly ? '✅' : '❌'}\n`;
      md += `- SameSite: ${c.flags.sameSite || '❌ Not set'}\n`;
      if (c.issues.length > 0) {
        md += `- **Issues:**\n`;
        for (const issue of c.issues) {
          md += `  - ${issue}\n`;
        }
      }
      md += '\n';
    }
  }

  return md;
}

export function HeadersAnalyzer() {
  const { t } = useLanguage();
  const [rawHeaders, setRawHeaders] = useState('');
  const [copied, setCopied] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const { headerResults, cookieResults } = useMemo(() => {
    if (!rawHeaders.trim() || !analyzed) {
      return { headerResults: [] as HeaderCheckResult[], cookieResults: [] as CookieCheckResult[] };
    }

    const headers = parseHeaders(rawHeaders);
    const headerResults = analyzeHeaders(headers);

    const rawCookies = extractCookies(rawHeaders);
    const cookieResults = rawCookies.map(c => analyzeCookie(c));

    return { headerResults, cookieResults };
  }, [rawHeaders, analyzed]);

  const handleAnalyze = () => {
    setAnalyzed(true);
  };

  const handleReset = () => {
    setRawHeaders('');
    setAnalyzed(false);
    setCopied(false);
  };

  const handleCopyReport = () => {
    const report = generateMarkdownReport(headerResults, cookieResults);
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalChecks = headerResults.length;
  const passCount = headerResults.filter(r => r.status === 'pass').length;
  const failMissingCount = headerResults.filter(r => r.status === 'fail' || r.status === 'missing').length;
  const warnCount = headerResults.filter(r => r.status === 'warn').length;

  // Calculate overall score (0-100)
  const overallScore = totalChecks > 0
    ? Math.round((passCount / totalChecks) * 100)
    : 0;

  const scoreColor = overallScore >= 80 ? 'text-green-400' : overallScore >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Input Area */}
      <div className="space-y-2">
        <Label className="text-sm">{t.ui?.pasteHeaders || 'Paste HTTP Response Headers'}</Label>
        <Textarea
          placeholder={`HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nContent-Security-Policy: default-src 'self'\nX-Frame-Options: DENY\nX-Content-Type-Options: nosniff\nSet-Cookie: session=abc123; Secure; HttpOnly; SameSite=Strict`}
          value={rawHeaders}
          onChange={(e) => { setRawHeaders(e.target.value); setAnalyzed(false); }}
          className="min-h-[140px] font-mono text-xs"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="cyber" onClick={handleAnalyze} disabled={!rawHeaders.trim()} className="flex-1">
          <Shield className="h-4 w-4 mr-2" />
          {t.ui?.analyzeHeaders || 'Analyze Headers'}
        </Button>
        <Button variant="outline" size="icon" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Results */}
      {analyzed && headerResults.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {/* Score Summary */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t.ui?.securityScore || 'Security Score'}</span>
                <span className={`text-2xl font-bold ${scoreColor}`}>{overallScore}%</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                  {passCount} {t.ui?.pass || 'pass'}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-400" />
                  {failMissingCount} {t.ui?.failOrMissing || 'fail/missing'}
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                  {warnCount} {t.ui?.warnings || 'warn'}
                </span>
              </div>
            </div>

            {/* Header Checks */}
            <div className="space-y-2">
              {headerResults.map((r, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 bg-background/50">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{statusIcons[r.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">{r.header}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${severityColors[r.severity]}`}>
                          {r.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {r.status === 'missing' ? 'MISSING' : r.status.toUpperCase()}
                        </Badge>
                      </div>
                      {r.value && (
                        <code className="block text-xs text-muted-foreground mt-1 truncate font-mono">
                          {r.value}
                        </code>
                      )}
                      <p className="text-xs mt-1 text-muted-foreground">{r.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cookie Analysis */}
            {cookieResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  {t.ui?.cookieAnalysis || 'Cookie Security Analysis'}
                </Label>
                {cookieResults.map((c, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 bg-background/50">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm font-mono font-medium">{c.name}</code>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${severityColors[c.severity]}`}>
                        {c.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs mb-1">
                      <span className={c.flags.secure ? 'text-green-400' : 'text-red-400'}>
                        Secure: {c.flags.secure ? '✓' : '✗'}
                      </span>
                      <span className={c.flags.httpOnly ? 'text-green-400' : 'text-red-400'}>
                        HttpOnly: {c.flags.httpOnly ? '✓' : '✗'}
                      </span>
                      <span className={c.flags.sameSite && c.flags.sameSite !== 'none' ? 'text-green-400' : 'text-yellow-400'}>
                        SameSite: {c.flags.sameSite || 'Not set'}
                      </span>
                    </div>
                    {c.issues.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {c.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-yellow-400 mt-0.5">•</span> {issue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Copy Report */}
            <Button variant="outline" size="sm" onClick={handleCopyReport} className="w-full">
              {copied ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
              {copied ? (t.ui?.copied || 'Copied!') : (t.ui?.copyReport || 'Copy Report as Markdown')}
            </Button>
          </div>
        </ScrollArea>
      )}

      {analyzed && headerResults.length === 0 && rawHeaders.trim() && (
        <div className="text-center py-6 text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t.ui?.noHeadersFound || 'No valid HTTP headers found. Check format.'}</p>
        </div>
      )}
    </div>
  );
}
