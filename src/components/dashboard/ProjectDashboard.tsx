import { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, FileText, FolderOpen, Save, Loader2, Bug, AlertTriangle, Globe, Shield, Upload, X, Plus, Target, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShareDialog } from './dialogs/ShareDialog';
import { SubmitVulnerabilityDialog } from './dialogs/SubmitVulnerabilityDialog';
import { VulnerabilityChart, ProjectStatsChart, StatusChart, RetestChart } from './charts';
import { AttackVectorTab } from './AttackVectorTab';
import { RemediationStrategyTab } from './RemediationStrategyTab';
import { RecommendationsTab } from './RecommendationsTab';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { auditSuccess, auditFailure } from '@/lib/audit';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Json } from '@/integrations/supabase/types';

interface ProjectDashboardProps {
  projectId: string;
  projectName: string;
  onRefresh: () => void;
}

interface ProjectDetails {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  environment: 'external' | 'internal' | 'both' | null;
  model_external: 'black_box' | 'gray_box' | 'white_box' | null;
  model_internal: 'black_box' | 'gray_box' | 'white_box' | null;
  rules_of_engagement: string | null;
  scope: ProjectScope;
  start_date: string | null;
  end_date: string | null;
}

interface ProjectScope {
  fqdns: string[];
  urls: string[];
  ips: string[];
  mobile_apps: string[];
  emails: string[];
  phone_numbers: string[];
}

const defaultScope: ProjectScope = {
  fqdns: [],
  urls: [],
  ips: [],
  mobile_apps: [],
  emails: [],
  phone_numbers: [],
};

interface FileStats {
  total: number;
  notes: number;
  code: number;
  images: number;
  reports: number;
  other: number;
}

interface VulnStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface StatusStats {
  open: number;
  fixed: number;
  accepted: number;
  ignored: number;
}

interface RetestStats {
  waiting: number;
  completed: number;
  no_retest: number;
}

interface Participant {
  email: string;
  permission: string;
}

export function ProjectDashboard({ projectId, projectName, onRefresh }: ProjectDashboardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { handleSupabaseError } = useErrorHandler();
  const [activeTab, setActiveTab] = useState('overview');
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [fileStats, setFileStats] = useState<FileStats>({ total: 0, notes: 0, code: 0, images: 0, reports: 0, other: 0 });
  const [vulnStats, setVulnStats] = useState<VulnStats>({ total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  const [statusStats, setStatusStats] = useState<StatusStats>({ open: 0, fixed: 0, accepted: 0, ignored: 0 });
  const [retestStats, setRetestStats] = useState<RetestStats>({ waiting: 0, completed: 0, no_retest: 0 });
  const [folderCount, setFolderCount] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [environment, setEnvironment] = useState<'external' | 'internal' | 'both' | ''>('');
  const [modelExternal, setModelExternal] = useState<'black_box' | 'gray_box' | 'white_box' | ''>('');
  const [modelInternal, setModelInternal] = useState<'black_box' | 'gray_box' | 'white_box' | ''>('');
  const [rulesOfEngagement, setRulesOfEngagement] = useState('');
  const [scope, setScope] = useState<ProjectScope>(defaultScope);
  const [newScopeItem, setNewScopeItem] = useState('');
  const [activeScopeTab, setActiveScopeTab] = useState('fqdns');

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (projectError) {
        handleSupabaseError(projectError, {
          showToast: true,
          auditAction: 'project.view',
          context: { projectId },
        });
        setLoadError(new Error('Failed to load project'));
        setLoading(false);
        return;
      }
      
      if (projectData) {
        const scopeData = projectData.scope as unknown as ProjectScope | null;
        const projectDetails: ProjectDetails = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description,
          created_at: projectData.created_at,
          updated_at: projectData.updated_at,
          environment: projectData.environment as ProjectDetails['environment'],
          model_external: projectData.model_external as ProjectDetails['model_external'],
          model_internal: projectData.model_internal as ProjectDetails['model_internal'],
          rules_of_engagement: projectData.rules_of_engagement,
          scope: scopeData || defaultScope,
          start_date: projectData.start_date,
          end_date: projectData.end_date,
        };
        setProject(projectDetails);
        setDescription(projectDetails.description || '');
        setStartDate(projectDetails.start_date || '');
        setEndDate(projectDetails.end_date || '');
        setEnvironment(projectDetails.environment || '');
        setModelExternal(projectDetails.model_external || '');
        setModelInternal(projectDetails.model_internal || '');
        setRulesOfEngagement(projectDetails.rules_of_engagement || '');
        setScope(projectDetails.scope || defaultScope);

        // Audit successful project view
        auditSuccess('project.view', {
          resourceType: 'project',
          resourceId: projectData.id,
          resourceName: projectData.name,
        });
      }

      // Fetch file statistics
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('file_type, mime_type')
        .eq('project_id', projectId);

      if (filesError) throw filesError;

      if (files) {
        const stats: FileStats = { total: files.length, notes: 0, code: 0, images: 0, reports: 0, other: 0 };
        
        files.forEach(file => {
          if (file.mime_type?.startsWith('image/')) {
            stats.images++;
          } else if (file.file_type === 'note') {
            stats.notes++;
          } else if (file.file_type === 'report') {
            stats.reports++;
          } else if (['js', 'ts', 'py', 'php', 'go', 'sh', 'rb', 'java', 'c', 'cpp'].some(ext => 
            file.file_type === ext || file.mime_type?.includes(ext)
          )) {
            stats.code++;
          } else {
            stats.other++;
          }
        });

        setFileStats(stats);
      }

      // Fetch folder count
      const { count: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (!foldersError) {
        setFolderCount(folders || 0);
      }

      // Fetch participants
      const { data: shares, error: sharesError } = await supabase
        .from('shares')
        .select('shared_with_email, permission')
        .eq('resource_type', 'project')
        .eq('resource_id', projectId);

      if (!sharesError && shares) {
        setParticipants(shares.map(s => ({ 
          email: s.shared_with_email, 
          permission: s.permission 
        })));
      }

      // Fetch vulnerability statistics
      const { data: vulns, error: vulnsError } = await supabase
        .from('vulnerabilities')
        .select('severity, status, retest_status')
        .eq('project_id', projectId);

      if (!vulnsError && vulns) {
        const activeVulns = vulns.filter(v => !v.status || ['open', 'retest', 'validated'].includes(v.status));
        const sevStats: VulnStats = { total: activeVulns.length, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        const statStats: StatusStats = { open: 0, fixed: 0, accepted: 0, ignored: 0 };
        const retStats: RetestStats = { waiting: 0, completed: 0, no_retest: 0 };
        
        vulns.forEach(v => {
          // Status stats
          const status = v.status || 'open';
          if (status in statStats) {
            statStats[status as keyof StatusStats]++;
          }
          
          // Severity stats - count only for active vulnerabilities
          if (['open', 'retest', 'validated'].includes(status)) {
            if (v.severity in sevStats) {
              sevStats[v.severity as keyof Omit<VulnStats, 'total'>]++;
            }
          }
          
          // Retest stats
          const retest = v.retest_status || 'no_retest';
          if (retest in retStats) {
            retStats[retest as keyof RetestStats]++;
          }
        });
        
        setVulnStats(sevStats);
        setStatusStats(statStats);
        setRetestStats(retStats);
      }

    } catch (error) {
      const appError = handleSupabaseError(error as Error, {
        showToast: true,
        auditAction: 'project.view',
        context: { projectId },
      });
      setLoadError(new Error(appError.userMessage));
    } finally {
      setLoading(false);
    }
  }, [projectId, handleSupabaseError]);

  const handleSave = useCallback(async () => {
    if (!project) return;
    setSaving(true);

    try {
      const updateData: Record<string, unknown> = {
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        environment: environment || null,
        model_external: modelExternal || null,
        model_internal: modelInternal || null,
        rules_of_engagement: rulesOfEngagement || null,
        scope: scope as unknown as Json,
      };

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) {
        handleSupabaseError(error, {
          showToast: true,
          auditAction: 'project.update',
          context: { projectId, projectName: project.name },
        });
        return;
      }

      toast({ title: 'Project updated successfully' });
      auditSuccess('project.update', {
        resourceType: 'project',
        resourceId: projectId,
        resourceName: project.name,
        details: { updatedFields: Object.keys(updateData) },
      });
      onRefresh();
    } catch (error) {
      handleSupabaseError(error as Error, {
        showToast: true,
        auditAction: 'project.update',
        context: { projectId },
      });
    } finally {
      setSaving(false);
    }
  }, [project, description, startDate, endDate, environment, modelExternal, modelInternal, rulesOfEngagement, scope, projectId, handleSupabaseError, toast, onRefresh]);

  const addScopeItem = () => {
    if (!newScopeItem.trim()) return;
    const key = activeScopeTab as keyof ProjectScope;
    if (!scope[key].includes(newScopeItem.trim())) {
      setScope(prev => ({
        ...prev,
        [key]: [...prev[key], newScopeItem.trim()]
      }));
    }
    setNewScopeItem('');
  };

  const removeScopeItem = (key: keyof ProjectScope, item: string) => {
    setScope(prev => ({
      ...prev,
      [key]: prev[key].filter(i => i !== item)
    }));
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const key = activeScopeTab as keyof ProjectScope;
      const uniqueItems = [...new Set([...scope[key], ...lines])];
      setScope(prev => ({
        ...prev,
        [key]: uniqueItems
      }));
      toast({ title: `Imported ${lines.length} items` });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPermissionBadge = (permission: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      read: { label: 'Read', className: 'bg-blue-500/20 text-blue-400' },
      read_write: { label: 'Read/Write', className: 'bg-green-500/20 text-green-400' },
      read_write_add: { label: 'Full Access', className: 'bg-purple-500/20 text-purple-400' },
    };
    const variant = variants[permission] || variants.read;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getScopeLabel = (key: string) => {
    const labels: Record<string, string> = {
      fqdns: 'FQDNs',
      urls: 'URLs',
      ips: 'IPs',
      mobile_apps: 'Mobile Apps',
      emails: 'Emails',
      phone_numbers: 'Phone Numbers',
    };
    return labels[key] || key;
  };

  const getTotalScopeItems = () => {
    return Object.values(scope).reduce((acc, arr) => acc + arr.length, 0);
  };

  if (loading) {
    return (
      <div className="h-full bg-background p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{projectName}</h1>
            <p className="text-muted-foreground text-sm">Project Dashboard</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SubmitVulnerabilityDialog
              projectId={projectId}
              projectName={projectName}
              onSuccess={onRefresh}
            />
            <ShareDialog
              resourceType="project"
              resourceId={projectId}
              resourceName={projectName}
            />
          </div>
        </div>

        <Separator />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <TabsList className="w-fit">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="attack-vector" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t.ui?.attackVector || 'Attack Vector'}</span>
                <span className="sm:hidden">Attack</span>
              </TabsTrigger>
              <TabsTrigger value="remediation" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t.ui?.remediationStrategy || 'Remediation'}</span>
                <span className="sm:hidden">Remed.</span>
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Recommendations</span>
                <span className="sm:hidden">Recom.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="bg-card/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{fileStats.total}</p>
                      <p className="text-[10px] text-muted-foreground">Files</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <FolderOpen className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{folderCount}</p>
                      <p className="text-[10px] text-muted-foreground">Folders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-warning/10">
                      <Bug className="h-4 w-4 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-bold">{vulnStats.total}</p>
                      <p className="text-[10px] text-muted-foreground">Vulnerabilities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10">
                      <Users className="h-4 w-4 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{participants.length + 1}</p>
                      <p className="text-[10px] text-muted-foreground">Team</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10">
                      <Globe className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{getTotalScopeItems()}</p>
                      <p className="text-[10px] text-muted-foreground">Scope Items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-4">
          <VulnerabilityChart vulnStats={vulnStats} />
          <StatusChart statusStats={statusStats} />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <RetestChart retestStats={retestStats} />
          <ProjectStatsChart fileStats={fileStats} folderCount={folderCount} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Project Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Project Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter project description..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={environment} onValueChange={(v) => setEnvironment(v as typeof environment)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(environment === 'external' || environment === 'both') && (
                <div className="space-y-2">
                  <Label>External Model</Label>
                  <Select value={modelExternal} onValueChange={(v) => setModelExternal(v as typeof modelExternal)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="black_box">Black Box</SelectItem>
                      <SelectItem value="gray_box">Gray Box</SelectItem>
                      <SelectItem value="white_box">White Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(environment === 'internal' || environment === 'both') && (
                <div className="space-y-2">
                  <Label>Internal Model</Label>
                  <Select value={modelInternal} onValueChange={(v) => setModelInternal(v as typeof modelInternal)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="black_box">Black Box</SelectItem>
                      <SelectItem value="gray_box">Gray Box</SelectItem>
                      <SelectItem value="white_box">White Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Rules of Engagement</Label>
                <Textarea
                  value={rulesOfEngagement}
                  onChange={(e) => setRulesOfEngagement(e.target.value)}
                  placeholder="Define testing rules, limitations, and agreements..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium">Created:</span> {project ? formatDate(project.created_at) : '-'}</p>
                <p><span className="font-medium">Last Updated:</span> {project ? formatDate(project.updated_at) : '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Scope of Work */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Scope of Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeScopeTab} onValueChange={setActiveScopeTab}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto">
                  {Object.keys(scope).map(key => (
                    <TabsTrigger key={key} value={key} className="text-[10px] sm:text-xs px-1 py-1.5">
                      {getScopeLabel(key)}
                      {scope[key as keyof ProjectScope].length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">
                          {scope[key as keyof ProjectScope].length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.keys(scope).map(key => (
                  <TabsContent key={key} value={key} className="space-y-3 mt-3">
                    <div className="flex gap-2">
                      <Input
                        value={newScopeItem}
                        onChange={(e) => setNewScopeItem(e.target.value)}
                        placeholder={`Add ${getScopeLabel(key).toLowerCase()}...`}
                        onKeyDown={(e) => e.key === 'Enter' && addScopeItem()}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={addScopeItem}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Label className="cursor-pointer">
                        <Button size="sm" variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4" />
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          className="hidden"
                          onChange={handleCSVUpload}
                        />
                      </Label>
                    </div>

                    <ScrollArea className="h-[180px] border rounded-md p-2">
                      {scope[key as keyof ProjectScope].length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          No {getScopeLabel(key).toLowerCase()} added yet
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {scope[key as keyof ProjectScope].map((item, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between bg-muted/50 rounded px-2 py-1 text-sm group"
                            >
                              <span className="truncate flex-1 font-mono text-xs">{item}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => removeScopeItem(key as keyof ProjectScope, item)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Participants */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Owner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">👤</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">You</p>
                    <p className="text-xs text-muted-foreground">Project Owner</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary">Owner</Badge>
              </div>

              {participants.map((participant, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm">{participant.email[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[120px]">{participant.email}</p>
                      <p className="text-xs text-muted-foreground">Collaborator</p>
                    </div>
                  </div>
                  {getPermissionBadge(participant.permission)}
                </div>
              ))}

              {participants.length === 0 && (
                <div className="text-center py-6 text-muted-foreground col-span-full">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No collaborators yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">File Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Notes', count: fileStats.notes, color: 'bg-green-500' },
                { label: 'Code', count: fileStats.code, color: 'bg-yellow-500' },
                { label: 'Images', count: fileStats.images, color: 'bg-pink-500' },
                { label: 'Reports', count: fileStats.reports, color: 'bg-cyan-500' },
                { label: 'Other', count: fileStats.other, color: 'bg-gray-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm">{item.label}: {item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
            </Card>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Project Settings
            </Button>
          </TabsContent>

          {/* Attack Vector Tab */}
          <TabsContent value="attack-vector">
            <AttackVectorTab projectId={projectId} />
          </TabsContent>

          {/* Remediation Strategy Tab */}
          <TabsContent value="remediation">
            <RemediationStrategyTab projectId={projectId} />
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <RecommendationsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
