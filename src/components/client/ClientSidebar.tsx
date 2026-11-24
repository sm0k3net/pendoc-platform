import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Bug, FileText, LayoutDashboard, FileCode, Building2, FolderOpen, Target, Wrench, Lightbulb, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ClientSelectedItem } from '@/pages/ClientDashboard';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ClientProject {
  id: string;
  name: string;
  description: string | null;
}

interface ClientSidebarProps {
  clientId: string;
  clientName: string;
  projects: ClientProject[];
  onSelectItem: (item: ClientSelectedItem) => void;
  selectedItem: ClientSelectedItem;
}

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  status: string;
  retest_status: string;
  project_id: string;
}

interface Report {
  id: string;
  name: string;
  created_at: string;
  project_id: string;
}

interface ProjectReport {
  id: string;
  client_visible?: boolean;
  name: string;
  created_at: string;
  project_id: string;
}

interface Artifact {
  type: 'attack_vector' | 'remediation_strategy' | 'recommendations';
  id: string;
  client_visible?: boolean;
  updated_at: string;
  project_id: string;
}

interface ProjectData {
  vulnerabilities: Vulnerability[];
  rawExports: Report[];
  rawExportsAvailable: boolean;
  projectReports: ProjectReport[];
  artifacts: Artifact[];
}

export function ClientSidebar({ clientId, clientName, projects, onSelectItem, selectedItem }: ClientSidebarProps) {
  const { t } = useLanguage();
  const [projectData, setProjectData] = useState<Record<string, ProjectData>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (projects.length > 0) {
      fetchAllProjectsData();
      // Auto-expand first project
      const firstProjectId = projects[0].id;
      setExpandedProjects({ [firstProjectId]: true });
      setExpandedSections({ [firstProjectId]: { vulnerabilities: true, rawExports: false, reports: false, artifacts: false } });
    }
  }, [projects]);

  const fetchAllProjectsData = useCallback(async () => {
    setLoading(true);
    try {
      const projectIds = projects.map(p => p.id);

      // Fetch vulnerabilities for all projects
      const { data: vulns, error: vulnsError } = await supabase
        .from('vulnerabilities')
        .select('id, title, severity, status, retest_status, project_id')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (vulnsError) throw vulnsError;

      // Fetch Raw Exports folders for all projects
      const { data: rawExportFolders, error: rawFolderError } = await supabase
        .from('folders')
        .select('id, name, project_id, parent_id')
        .in('project_id', projectIds)
        .ilike('name', 'raw exports');

      if (rawFolderError) throw rawFolderError;

      const rawExportFolderIds = (rawExportFolders || []).map((folder) => folder.id);
      const rawExportProjectIds = new Set((rawExportFolders || []).map((folder) => folder.project_id));

      // Fetch raw exports for all projects (files inside Raw Exports folders)
      const { data: reportFiles, error: reportsError } = rawExportFolderIds.length
        ? await supabase
            .from('files')
            .select('id, name, created_at, project_id')
            .in('folder_id', rawExportFolderIds)
            .eq('file_type', 'report')
            .order('created_at', { ascending: false })
        : { data: [], error: null };

      if (reportsError) throw reportsError;

      // Fetch project reports for all projects
      const { data: reports, error: projectReportsError } = await supabase
        .from('project_reports')
        .select('id, name, created_at, project_id, client_visible')
        .in('project_id', projectIds)
        .eq('client_visible', true)
        .order('created_at', { ascending: false });

      if (projectReportsError) {
        console.error('Error fetching project reports:', projectReportsError);
      }

      // Fetch attack vectors for all projects
      const { data: attackVectors, error: avError } = await supabase
        .from('attack_vectors')
        .select('id, updated_at, project_id, client_visible')
        .in('project_id', projectIds);

      if (avError) console.error('Error fetching attack vectors:', avError);

      // Fetch remediation strategies for all projects
      const { data: remediations, error: rsError } = await supabase
        .from('remediation_strategies')
        .select('id, updated_at, project_id, client_visible')
        .in('project_id', projectIds);

      if (rsError) console.error('Error fetching remediation strategies:', rsError);

      // Fetch recommendations for all projects
      const { data: recommendations, error: recError } = await supabase
        .from('recommendations')
        .select('id, updated_at, project_id, client_visible')
        .in('project_id', projectIds);

      if (recError) console.error('Error fetching recommendations:', recError);

      // Organize data by project
      const dataByProject: Record<string, ProjectData> = {};
      projectIds.forEach(projectId => {
        const artifacts: Artifact[] = [];
        
        const av = (attackVectors || []).find(a => a.project_id === projectId && a.client_visible === true);
        if (av) artifacts.push({ type: 'attack_vector', id: av.id, client_visible: av.client_visible, updated_at: av.updated_at || '', project_id: projectId });
        
        const rs = (remediations || []).find(r => r.project_id === projectId && r.client_visible === true);
        if (rs) artifacts.push({ type: 'remediation_strategy', id: rs.id, client_visible: rs.client_visible, updated_at: rs.updated_at, project_id: projectId });
        
        const rec = (recommendations || []).find(r => r.project_id === projectId && r.client_visible === true);
        if (rec) artifacts.push({ type: 'recommendations', id: rec.id, client_visible: rec.client_visible, updated_at: rec.updated_at, project_id: projectId });

        dataByProject[projectId] = {
          vulnerabilities: (vulns || []).filter(v => v.project_id === projectId),
          rawExports: (reportFiles || []).filter(r => r.project_id === projectId),
          rawExportsAvailable: rawExportProjectIds.has(projectId),
          projectReports: (reports || []).filter(r => r.project_id === projectId),
          artifacts,
        };
      });

      setProjectData(dataByProject);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [projects]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
    // Initialize sections if not already
    if (!expandedSections[projectId]) {
      setExpandedSections(prev => ({
        ...prev,
        [projectId]: { vulnerabilities: true, rawExports: false, reports: false, artifacts: false },
      }));
    }
  };

  const toggleSection = (projectId: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [section]: !prev[projectId]?.[section],
      },
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      case 'info': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fixed': return <Badge variant="outline" className="text-green-500 border-green-500 text-[10px] px-1">Fixed</Badge>;
      case 'accepted': return <Badge variant="outline" className="text-blue-500 border-blue-500 text-[10px] px-1">Accepted</Badge>;
      case 'ignored': return <Badge variant="outline" className="text-gray-500 border-gray-500 text-[10px] px-1">Ignored</Badge>;
      default: return null;
    }
  };

  const isSelected = (type: string, id: string) => {
    return selectedItem.type === type && selectedItem.id === id;
  };

  const getTotalOpenVulnerabilities = () => {
    return Object.values(projectData).reduce((total, data) => 
      total + data.vulnerabilities.filter(v => !v.status || ['open', 'retest', 'validated'].includes(v.status)).length, 0);
  };
  
  const getOpenVulnerabilities = (vulns: Vulnerability[]) => {
    return vulns.filter(v => !v.status || ['open', 'retest', 'validated'].includes(v.status));
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'attack_vector': return <Target className="h-3 w-3 text-red-400" />;
      case 'remediation_strategy': return <Wrench className="h-3 w-3 text-blue-400" />;
      case 'recommendations': return <Lightbulb className="h-3 w-3 text-yellow-400" />;
      default: return <Package className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getArtifactLabel = (type: string) => {
    switch (type) {
      case 'attack_vector': return 'Attack Vector';
      case 'remediation_strategy': return 'Remediation Strategy';
      case 'recommendations': return 'Recommendations';
      default: return type;
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Client Header / Overview */}
      <div className="p-3 border-b border-sidebar-border">
        <button
          className={cn(
            "w-full flex items-center gap-3 rounded-lg p-3 transition-all",
            selectedItem.type === 'overview'
              ? "bg-primary/10 ring-1 ring-primary/20"
              : "hover:bg-sidebar-accent/50"
          )}
          onClick={() => onSelectItem({ type: 'overview', id: clientId, name: clientName })}
        >
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-semibold text-sm truncate">{clientName}</p>
            <p className="text-[10px] text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''} • {getTotalOpenVulnerabilities()} open
            </p>
          </div>
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          <button
            onClick={() => onSelectItem({ type: 'vulnerabilities', id: clientId, name: 'All Vulnerabilities' })}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-2 text-sm font-medium rounded-md transition-colors mb-2",
              selectedItem.type === 'vulnerabilities'
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Layers className="h-4 w-4 text-primary" />
            <span>All Vulnerabilities</span>
          </button>

          {/* Projects List */}
          {projects.map((project) => {
            const data = projectData[project.id] || { vulnerabilities: [], rawExports: [], rawExportsAvailable: false, projectReports: [], artifacts: [] };
            const openVulns = getOpenVulnerabilities(data.vulnerabilities);
            const isProjectExpanded = expandedProjects[project.id];
            const sections = expandedSections[project.id] || { vulnerabilities: false, rawExports: false, reports: false, artifacts: false };

            return (
              <div key={project.id} className="mb-2">
                {/* Project Header */}
                <button
                  onClick={() => toggleProject(project.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    selectedItem.type === 'project' && selectedItem.id === project.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  {isProjectExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <FolderOpen className="h-4 w-4 text-cyan-500" />
                  <span className="truncate flex-1 text-left">{project.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {openVulns.length}
                  </Badge>
                </button>

                {isProjectExpanded && (
                  <div className="ml-4 border-l border-sidebar-border pl-2 mt-1">
                    {/* Project Dashboard Link */}
                    <button
                      onClick={() => onSelectItem({ type: 'project', id: project.id, name: project.name, projectId: project.id })}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                        isSelected('project', project.id)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      )}
                    >
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <span>Dashboard</span>
                    </button>

                    {/* Vulnerabilities Section */}
                    <div className="mt-1">
                      <button
                        onClick={() => toggleSection(project.id, 'vulnerabilities')}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                          selectedItem.type === 'vulnerabilities' && selectedItem.projectId === project.id
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        {sections.vulnerabilities ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <Bug className="h-4 w-4 text-orange-500" />
                        <span>Vulnerabilities</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {openVulns.length}
                        </Badge>
                      </button>

                      {sections.vulnerabilities && (
                        <div className="mt-0.5 space-y-0.5 pl-4">
                          {loading ? (
                            <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                              Loading...
                            </div>
                          ) : openVulns.length === 0 ? (
                            <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                              No open vulnerabilities
                            </div>
                          ) : (
                            openVulns.map((vuln) => (
                              <button
                                key={vuln.id}
                                onClick={() => onSelectItem({ 
                                  type: 'vulnerability', 
                                  id: vuln.id, 
                                  name: vuln.title,
                                  projectId: project.id 
                                })}
                                className={cn(
                                  "flex items-center gap-2 w-full px-2 py-1 text-xs text-left rounded-md transition-colors",
                                  isSelected('vulnerability', vuln.id)
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                )}
                              >
                                <Badge className={cn("text-[9px] px-1 py-0", getSeverityColor(vuln.severity))}>
                                  {vuln.severity.charAt(0).toUpperCase()}
                                </Badge>
                                <span className="truncate flex-1">{vuln.title}</span>
                                {getStatusBadge(vuln.status)}
                              </button>
                            ))
                          )}
                          {openVulns.length > 0 && (
                            <button
                              onClick={() => onSelectItem({ type: 'vulnerabilities', id: project.id, name: 'Vulnerabilities', projectId: project.id })}
                              className="flex items-center gap-1 w-full px-2 py-1 text-[10px] text-primary hover:underline"
                            >
                              View all →
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Raw Exports Section */}
                    {(data.rawExportsAvailable || data.rawExports.length > 0) && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleSection(project.id, 'rawExports')}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md"
                        >
                          {sections.rawExports ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <FileCode className="h-4 w-4 text-blue-500" />
                          <span>Raw Exports</span>
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {data.rawExports.length}
                          </Badge>
                        </button>

                        {sections.rawExports && (
                          <div className="mt-0.5 space-y-0.5 pl-4">
                            {data.rawExports.length === 0 ? (
                              <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                                No raw exports uploaded yet
                              </div>
                            ) : (
                              data.rawExports.map((report) => (
                                <button
                                  key={report.id}
                                  onClick={() => onSelectItem({ 
                                    type: 'report', 
                                    id: report.id, 
                                    name: report.name,
                                    projectId: project.id 
                                  })}
                                  className={cn(
                                    "flex items-center gap-2 w-full px-2 py-1 text-xs text-left rounded-md transition-colors",
                                    isSelected('report', report.id)
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                      : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                  )}
                                >
                                  <FileCode className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{report.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Project Reports Section */}
                    {data.projectReports.length > 0 && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleSection(project.id, 'reports')}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md"
                        >
                          {sections.reports ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <FileText className="h-4 w-4 text-green-500" />
                          <span>Shared Reports</span>
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {data.projectReports.length}
                          </Badge>
                        </button>

                        {sections.reports && (
                          <div className="mt-0.5 space-y-0.5 pl-4">
                            {data.projectReports.map((report) => (
                              <button
                                key={report.id}
                                onClick={() => onSelectItem({ 
                                  type: 'project_report', 
                                  id: report.id, 
                                  name: report.name,
                                  projectId: project.id 
                                })}
                                className={cn(
                                  "flex items-center gap-2 w-full px-2 py-1 text-xs text-left rounded-md transition-colors",
                                  isSelected('project_report', report.id)
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                )}
                              >
                                <FileText className="h-3 w-3 text-green-500" />
                                <div className="flex-1 min-w-0">
                                  <span className="truncate block">{report.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(report.created_at), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Artifacts Section */}
                    {data.artifacts.length > 0 && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleSection(project.id, 'artifacts')}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md"
                        >
                          {sections.artifacts ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <Package className="h-4 w-4 text-purple-500" />
                          <span>Shared Artifacts</span>
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {data.artifacts.length}
                          </Badge>
                        </button>

                        {sections.artifacts && (
                          <div className="mt-0.5 space-y-0.5 pl-4">
                            {data.artifacts.map((artifact) => (
                              <button
                                key={artifact.id}
                                onClick={() => onSelectItem({ 
                                  type: 'artifact', 
                                  id: artifact.id, 
                                  name: getArtifactLabel(artifact.type),
                                  projectId: project.id,
                                  artifactType: artifact.type
                                })}
                                className={cn(
                                  "flex items-center gap-2 w-full px-2 py-1 text-xs text-left rounded-md transition-colors",
                                  isSelected('artifact', artifact.id)
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                )}
                              >
                                {getArtifactIcon(artifact.type)}
                                <div className="flex-1 min-w-0">
                                  <span className="truncate block">{getArtifactLabel(artifact.type)}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {artifact.updated_at ? format(new Date(artifact.updated_at), 'MMM d, yyyy') : 'N/A'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No projects available
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
