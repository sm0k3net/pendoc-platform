import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, AlertTriangle, Lightbulb, Target, TrendingUp, Download, FileText, CheckCircle2, Clock, ArrowRight, Zap, Shield, Globe, BookOpen, Wrench, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RecommendationsTabProps {
  projectId: string;
}

interface Recommendation {
  id: string;
  category: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  rationale: string;
  expectedBenefits: string[];
  implementationSteps: string[];
  estimatedEffort: string;
  prerequisites?: string[];
  owner?: string;
  timelineWindow?: string;
  dependencies?: string[];
  relatedFindings?: string[];
  successMetrics?: string[];
  riskReduction?: string;
}

interface RecommendationsData {
  id?: string;
  client_visible?: boolean;
  summary: string;
  keyFindings: string[];
  recommendations: Recommendation[];
  priorityMatrix: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  estimatedTotalInvestment: string;
  expectedROI: string;
  projectContext: {
    name: string;
    environment: string;
    modelExternal: string;
    modelInternal: string;
    vulnStats: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    scopeSummary: {
      fqdns: number;
      urls: number;
      ips: number;
      mobileApps: number;
    } | null;
  };
  updatedAt?: string;
}

export function RecommendationsTab({ projectId }: RecommendationsTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Load existing recommendations on mount
  useEffect(() => {
    loadExistingRecommendations();
  }, [projectId]);

  const loadExistingRecommendations = async () => {
    setInitialLoading(true);
    setError(null);

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('recommendations')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading recommendations:', fetchError);
      } else if (existing) {
        setData({
          id: existing.id,
          client_visible: existing.client_visible ?? false,
          summary: existing.summary,
          keyFindings: (existing.key_findings as string[]) || [],
          recommendations: (existing.recommendations as unknown as Recommendation[]) || [],
          priorityMatrix: (existing.priority_matrix as unknown as RecommendationsData['priorityMatrix']) || { immediate: [], shortTerm: [], longTerm: [] },
          estimatedTotalInvestment: existing.estimated_total_investment || '',
          expectedROI: existing.expected_roi || '',
          projectContext: (existing.project_context as unknown as RecommendationsData['projectContext']) || {
            name: '',
            environment: '',
            modelExternal: '',
            modelInternal: '',
            vulnStats: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
            scopeSummary: null,
          },
          updatedAt: existing.updated_at,
        });
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const generateRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: funcError } = await supabase.functions.invoke('generate-recommendations', {
        body: { projectId }
      });

      if (funcError) throw funcError;
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData({
        id: result.id,
        client_visible: result.client_visible ?? data?.client_visible ?? false,
        summary: result.summary,
        keyFindings: result.keyFindings || [],
        recommendations: result.recommendations || [],
        priorityMatrix: result.priorityMatrix || { immediate: [], shortTerm: [], longTerm: [] },
        estimatedTotalInvestment: result.estimatedTotalInvestment,
        expectedROI: result.expectedROI,
        projectContext: result.projectContext,
        updatedAt: result.savedAt,
      });
      toast({ title: 'Recommendations generated and saved successfully' });
    } catch (err) {
      console.error('Error generating recommendations:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate recommendations';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const handleDelete = async () => {
    try {
      const { error: funcError } = await supabase.functions.invoke('generate-recommendations', {
        body: { projectId, action: 'delete' }
      });

      if (funcError) throw funcError;

      setData(null);
      toast({ title: 'Recommendations deleted' });
    } catch (err) {
      console.error('Error deleting recommendations:', err);
      toast({ title: 'Failed to delete recommendations', variant: 'destructive' });
    }
  };

  const handleToggleClientVisibility = async (clientVisible: boolean) => {
    if (!data?.id) return;

    setUpdatingVisibility(true);
    try {
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ client_visible: clientVisible })
        .eq('id', data.id);

      if (updateError) throw updateError;

      setData((current) => current ? { ...current, client_visible: clientVisible } : current);
      toast({ title: clientVisible ? 'Recommendations shared with client portal' : 'Recommendations hidden from client portal' });
    } catch (err) {
      console.error('Error updating recommendations visibility:', err);
      toast({ title: 'Failed to update recommendations visibility', variant: 'destructive' });
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('scope')) return <Globe className="h-4 w-4" />;
    if (lower.includes('method')) return <Target className="h-4 w-4" />;
    if (lower.includes('continuous') || lower.includes('security')) return <Shield className="h-4 w-4" />;
    if (lower.includes('compliance') || lower.includes('governance')) return <BookOpen className="h-4 w-4" />;
    if (lower.includes('technology') || lower.includes('tool')) return <Wrench className="h-4 w-4" />;
    return <Lightbulb className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('scope')) return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    if (lower.includes('method')) return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    if (lower.includes('continuous') || lower.includes('security')) return 'bg-green-500/10 text-green-500 border-green-500/30';
    if (lower.includes('compliance') || lower.includes('governance')) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    if (lower.includes('technology') || lower.includes('tool')) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30';
    return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const categories = useMemo(() => {
    return data ? [...new Set(data.recommendations.map((rec) => rec.category))].sort() : [];
  }, [data]);

  const filteredRecommendations = useMemo(() => {
    if (!data) return [];

    return data.recommendations.filter((rec) => {
      const matchesSearch = !searchQuery || [
        rec.title,
        rec.category,
        rec.description,
        rec.rationale,
        rec.owner,
        ...(rec.relatedFindings || []),
      ].filter(Boolean).some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'all' || rec.category === categoryFilter;

      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [data, searchQuery, priorityFilter, categoryFilter]);

  const recommendationMetrics = useMemo(() => {
    if (!data) {
      return { high: 0, immediate: 0, withOwners: 0 };
    }

    return {
      high: data.recommendations.filter((rec) => rec.priority === 'high').length,
      immediate: data.priorityMatrix?.immediate?.length || 0,
      withOwners: data.recommendations.filter((rec) => Boolean(rec.owner)).length,
    };
  }, [data]);

  const handleExportHTML = () => {
    if (!data) return;

    const html = generateHTMLReport(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recommendations_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = (data: RecommendationsData): string => {
    const getCategoryColorHTML = (category: string) => {
      const lower = category.toLowerCase();
      if (lower.includes('scope')) return '#3b82f6';
      if (lower.includes('method')) return '#8b5cf6';
      if (lower.includes('continuous') || lower.includes('security')) return '#10b981';
      if (lower.includes('compliance') || lower.includes('governance')) return '#f59e0b';
      if (lower.includes('technology') || lower.includes('tool')) return '#06b6d4';
      return '#6b7280';
    };

    const getPriorityColorHTML = (priority: string) => {
      switch (priority) {
        case 'high': return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
        case 'medium': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
        case 'low': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
        default: return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
      }
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Recommendations Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; color: #1f2937; line-height: 1.7; font-size: 11pt; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px; }
    .cover { text-align: center; padding: 60px 40px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: white; margin: -40px -40px 40px -40px; border-radius: 0 0 20px 20px; }
    .cover-icon { font-size: 48pt; margin-bottom: 20px; }
    .cover-title { font-size: 28pt; font-weight: 700; margin-bottom: 10px; color: #60a5fa; }
    .cover-subtitle { font-size: 14pt; color: #94a3b8; margin-bottom: 30px; }
    .cover-meta { font-size: 10pt; color: #64748b; }
    h1 { font-size: 22pt; color: #0f172a; margin: 40px 0 20px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { font-size: 16pt; color: #1e293b; margin: 30px 0 15px; }
    h3 { font-size: 13pt; color: #374151; margin: 20px 0 10px; }
    p { margin-bottom: 15px; text-align: justify; }
    .summary-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #93c5fd; border-radius: 12px; padding: 25px; margin: 20px 0; }
    .findings-list { background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .findings-list li { margin: 10px 0; padding-left: 20px; position: relative; }
    .findings-list li::before { content: "→"; position: absolute; left: 0; color: #3b82f6; font-weight: bold; }
    .priority-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .priority-card { border-radius: 12px; padding: 20px; }
    .priority-immediate { background: #fef2f2; border: 1px solid #fecaca; }
    .priority-short { background: #fffbeb; border: 1px solid #fde68a; }
    .priority-long { background: #eff6ff; border: 1px solid #bfdbfe; }
    .priority-title { font-weight: 600; font-size: 11pt; margin-bottom: 10px; }
    .priority-title.immediate { color: #dc2626; }
    .priority-title.short { color: #d97706; }
    .priority-title.long { color: #2563eb; }
    .rec-card { border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden; page-break-inside: avoid; }
    .rec-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
    .rec-title { font-weight: 600; font-size: 12pt; }
    .rec-badges { display: flex; gap: 10px; }
    .badge { padding: 4px 12px; border-radius: 20px; font-size: 9pt; font-weight: 600; }
    .rec-body { padding: 20px; }
    .rec-section { margin-bottom: 15px; }
    .rec-section-title { font-size: 10pt; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .rec-list { padding-left: 20px; margin: 0; }
    .rec-list li { margin: 5px 0; font-size: 10pt; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
    .meta-label { font-size: 9pt; color: #64748b; text-transform: uppercase; }
    .meta-value { font-size: 12pt; font-weight: 600; color: #1e293b; margin-top: 5px; }
    .footer { text-align: center; padding: 30px; color: #64748b; font-size: 9pt; border-top: 1px solid #e5e7eb; margin-top: 40px; }
    @media print { .cover { page-break-after: always; } .rec-card { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <div class="cover-icon">💡</div>
      <div class="cover-title">Security Recommendations</div>
      <div class="cover-subtitle">Strategic Improvement Roadmap</div>
      <div class="cover-meta">
        ${data.projectContext?.name || 'Security Assessment'}<br>
        Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <h1>Executive Summary</h1>
    <div class="summary-box">
      ${data.summary.split('\n').map(p => `<p>${p}</p>`).join('')}
    </div>

    <h2>Key Findings</h2>
    <ul class="findings-list">
      ${data.keyFindings.map(f => `<li>${f}</li>`).join('')}
    </ul>

    <h2>Priority Matrix</h2>
    <div class="priority-section">
      <div class="priority-card priority-immediate">
        <div class="priority-title immediate">🔴 Immediate Actions</div>
        <ul style="font-size: 10pt; padding-left: 20px;">
          ${data.priorityMatrix.immediate.map(id => {
            const rec = data.recommendations.find(r => r.id === id);
            return rec ? `<li>${rec.title}</li>` : '';
          }).join('')}
        </ul>
      </div>
      <div class="priority-card priority-short">
        <div class="priority-title short">🟡 Short-term (1-3 months)</div>
        <ul style="font-size: 10pt; padding-left: 20px;">
          ${data.priorityMatrix.shortTerm.map(id => {
            const rec = data.recommendations.find(r => r.id === id);
            return rec ? `<li>${rec.title}</li>` : '';
          }).join('')}
        </ul>
      </div>
      <div class="priority-card priority-long">
        <div class="priority-title long">🔵 Long-term (3-6+ months)</div>
        <ul style="font-size: 10pt; padding-left: 20px;">
          ${data.priorityMatrix.longTerm.map(id => {
            const rec = data.recommendations.find(r => r.id === id);
            return rec ? `<li>${rec.title}</li>` : '';
          }).join('')}
        </ul>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Estimated Total Investment</div>
        <div class="meta-value">${data.estimatedTotalInvestment}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Expected ROI</div>
        <div class="meta-value">${data.expectedROI}</div>
      </div>
    </div>

    <h1>Detailed Recommendations</h1>
    ${data.recommendations.map((rec, idx) => {
      const catColor = getCategoryColorHTML(rec.category);
      const prioColor = getPriorityColorHTML(rec.priority);
      return `
      <div class="rec-card">
        <div class="rec-header" style="background: ${catColor}10; border-left: 4px solid ${catColor};">
          <div class="rec-title">${idx + 1}. ${rec.title}</div>
          <div class="rec-badges">
            <span class="badge" style="background: ${catColor}20; color: ${catColor};">${rec.category}</span>
            <span class="badge" style="background: ${prioColor.bg}; color: ${prioColor.text}; border: 1px solid ${prioColor.border};">${rec.priority.toUpperCase()}</span>
          </div>
        </div>
        <div class="rec-body">
          <div class="rec-section">
            <div class="rec-section-title">Description</div>
            <p style="margin: 0;">${rec.description}</p>
          </div>
          <div class="rec-section">
            <div class="rec-section-title">Rationale</div>
            <p style="margin: 0; color: #64748b;">${rec.rationale}</p>
          </div>
          <div class="rec-section">
            <div class="rec-section-title">Expected Benefits</div>
            <ul class="rec-list">
              ${rec.expectedBenefits.map(b => `<li>${b}</li>`).join('')}
            </ul>
          </div>
          <div class="rec-section">
            <div class="rec-section-title">Implementation Steps</div>
            <ol class="rec-list">
              ${rec.implementationSteps.map(s => `<li>${s}</li>`).join('')}
            </ol>
          </div>
          <div style="display: flex; gap: 20px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10pt;">
            <div><strong>Estimated Effort:</strong> ${rec.estimatedEffort}</div>
            ${rec.prerequisites && rec.prerequisites.length > 0 ? `<div><strong>Prerequisites:</strong> ${rec.prerequisites.join(', ')}</div>` : ''}
          </div>
        </div>
      </div>
      `;
    }).join('')}

    <div class="footer">
      <p>Generated by PenDoc | Confidential Security Document</p>
    </div>
  </div>
</body>
</html>`;
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
            <Lightbulb className="h-5 w-5 text-primary" />
            Security Recommendations
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered recommendations for improving your security posture and testing approach
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
                aria-label="Toggle client visibility for recommendations"
              />
            </div>
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
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Recommendations?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the saved recommendations. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button 
            onClick={generateRecommendations} 
            disabled={loading}
            variant={data ? 'outline' : 'default'}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {data ? 'Regenerate' : 'Generate'}
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
                <p className="font-medium">Generating Recommendations...</p>
                <p className="text-sm">AI is analyzing project data, vulnerabilities, and attack vectors</p>
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
              <Lightbulb className="h-12 w-12 opacity-50" />
              <div className="text-center">
                <p className="font-medium">No Recommendations Generated</p>
                <p className="text-sm">Click "Generate" to get AI-powered recommendations based on your project analysis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Display */}
      {!loading && data && (
        <>
          {/* Metadata */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Recommendation set</p>
                <p className="text-2xl font-bold">{data.recommendations.length}</p>
                <p className="text-sm text-muted-foreground">total recommendations</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">High priority</p>
                <p className="text-2xl font-bold">{recommendationMetrics.high}</p>
                <p className="text-sm text-muted-foreground">requires near-term action</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Immediate roadmap</p>
                <p className="text-2xl font-bold">{recommendationMetrics.immediate}</p>
                <p className="text-sm text-muted-foreground">items in first phase</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Assigned ownership</p>
                <p className="text-2xl font-bold">{recommendationMetrics.withOwners}</p>
                <p className="text-sm text-muted-foreground">recommendations with owners</p>
              </CardContent>
            </Card>
          </div>

          {data.updatedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Last generated: {format(new Date(data.updatedAt), 'PPp')}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Project Context Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Environment</p>
                <p className="font-medium">{data.projectContext.environment || 'Not specified'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">External model</p>
                <p className="font-medium">{data.projectContext.modelExternal || 'Not specified'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Internal model</p>
                <p className="font-medium">{data.projectContext.modelInternal || 'Not specified'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Active risk profile</p>
                <p className="font-medium">{data.projectContext.vulnStats.critical + data.projectContext.vulnStats.high} critical/high</p>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.summary}</p>
            </CardContent>
          </Card>

          {/* Key Findings */}
          {data.keyFindings && data.keyFindings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.keyFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Priority Matrix */}
          {data.priorityMatrix && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-500 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Immediate Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.priorityMatrix.immediate?.map(id => {
                      const rec = data.recommendations.find(r => r.id === id);
                      return rec ? (
                        <li key={id} className="text-xs text-muted-foreground rounded-lg border border-red-500/15 bg-background/50 p-2.5">
                          <div className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium text-foreground text-xs">{rec.title}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{rec.riskReduction || rec.description}</p>
                            </div>
                          </div>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-yellow-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Short-term (1-3 months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.priorityMatrix.shortTerm?.map(id => {
                      const rec = data.recommendations.find(r => r.id === id);
                      return rec ? (
                        <li key={id} className="text-xs text-muted-foreground rounded-lg border border-yellow-500/15 bg-background/50 p-2.5">
                          <div className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium text-foreground text-xs">{rec.title}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{rec.riskReduction || rec.description}</p>
                            </div>
                          </div>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-500 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Long-term (3-6+ months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.priorityMatrix.longTerm?.map(id => {
                      const rec = data.recommendations.find(r => r.id === id);
                      return rec ? (
                        <li key={id} className="text-xs text-muted-foreground rounded-lg border border-blue-500/15 bg-background/50 p-2.5">
                          <div className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium text-foreground text-xs">{rec.title}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{rec.riskReduction || rec.description}</p>
                            </div>
                          </div>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Investment & ROI */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Investment</p>
                    <p className="font-medium">{data.estimatedTotalInvestment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected ROI</p>
                    <p className="font-medium">{data.expectedROI}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Detailed Recommendations
                <Badge variant="outline" className="ml-2 text-xs">
                  {filteredRecommendations.length} / {data.recommendations.length}
                </Badge>
              </CardTitle>
              <div className="grid md:grid-cols-[1fr_180px_220px] gap-3 mt-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, category, rationale, owner, or related findings..."
                />
                <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as typeof priorityFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <Accordion type="multiple" className="space-y-3">
                  {filteredRecommendations.map((rec, idx) => (
                    <AccordionItem 
                      key={rec.id} 
                      value={rec.id}
                      className="border rounded-lg px-4 hover:bg-muted/50 transition-colors"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-start gap-3 text-left">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{rec.title}</div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] ${getCategoryColor(rec.category)}`}>
                                {getCategoryIcon(rec.category)}
                                <span className="ml-1">{rec.category}</span>
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${getPriorityColor(rec.priority)}`}>
                                {rec.priority.toUpperCase()}
                              </Badge>
                              {rec.owner && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Owner: {rec.owner}
                                </Badge>
                              )}
                              {rec.timelineWindow && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {rec.timelineWindow}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        <div className="space-y-4 pl-11">
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</h5>
                            <p className="text-sm">{rec.description}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rationale</h5>
                            <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                          </div>
                          {rec.riskReduction && (
                            <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">
                              <h5 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Risk Reduction</h5>
                              <p className="text-sm text-muted-foreground">{rec.riskReduction}</p>
                            </div>
                          )}
                          <div>
                            <h5 className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Expected Benefits</h5>
                            <ul className="space-y-1">
                              {rec.expectedBenefits.map((benefit, bidx) => (
                                <li key={bidx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <h5 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Implementation Steps</h5>
                            <ol className="list-decimal list-inside space-y-1">
                              {rec.implementationSteps.map((step, sidx) => (
                                <li key={sidx} className="text-sm text-muted-foreground">{step}</li>
                              ))}
                            </ol>
                          </div>
                          {rec.successMetrics && rec.successMetrics.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-cyan-500 uppercase tracking-wide mb-1">Success Metrics</h5>
                              <ul className="space-y-1">
                                {rec.successMetrics.map((metric, midx) => (
                                  <li key={midx} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                                    {metric}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(rec.relatedFindings && rec.relatedFindings.length > 0) || (rec.dependencies && rec.dependencies.length > 0) ? (
                            <div className="grid md:grid-cols-2 gap-4">
                              {rec.relatedFindings && rec.relatedFindings.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">Related Findings</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {rec.relatedFindings.map((finding, findIdx) => (
                                      <Badge key={findIdx} variant="outline" className="text-[10px]">{finding}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {rec.dependencies && rec.dependencies.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">Dependencies</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {rec.dependencies.map((dependency, depIdx) => (
                                      <Badge key={depIdx} variant="secondary" className="text-[10px]">{dependency}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                          <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                            <span><strong>Effort:</strong> {rec.estimatedEffort}</span>
                            {rec.owner && <span><strong>Owner:</strong> {rec.owner}</span>}
                            {rec.timelineWindow && <span><strong>Timeline:</strong> {rec.timelineWindow}</span>}
                            {rec.prerequisites && rec.prerequisites.length > 0 && (
                              <span><strong>Prerequisites:</strong> {rec.prerequisites.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
