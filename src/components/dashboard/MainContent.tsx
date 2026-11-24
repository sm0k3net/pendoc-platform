import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Eye, Code, Share2, Bot, History, FolderOpen, Layers, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { auditSuccess, auditFailure } from '@/lib/audit';
import { InlineError, EmptyStateError } from '@/components/ErrorBoundary';
import { SelectedItem } from '@/pages/Dashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RichTextEditor } from './editor/RichTextEditor';
import { FileViewer } from './viewer/FileViewer';
import { ShareDialog } from './dialogs/ShareDialog';
import { AIAssistantDialog } from './dialogs/AIAssistantDialog';
import { WorkspaceAssistantDialog } from './dialogs/WorkspaceAssistantDialog';
import { ProjectDashboard } from './ProjectDashboard';
import { VulnerabilityViewer } from './VulnerabilityViewer';
import { ProjectReportViewer } from './ProjectReportViewer';
import { ClientDashboard } from './ClientDashboard';
import { VersionHistory } from './VersionHistory';
import { ReportsDashboard } from './ReportsDashboard';
import { VulnerabilitiesDashboard } from './VulnerabilitiesDashboard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MainContentProps {
  selectedItem: SelectedItem;
  onRefresh: () => void;
  onSelectWorkspaceView?: (view: 'vulnerabilities' | 'reports') => void;
}

interface FileData {
  id: string;
  name: string;
  content: string | null;
  file_type: string;
  mime_type: string | null;
  storage_path: string | null;
}

type ViewMode = 'edit' | 'view' | 'code';

export function MainContent({ selectedItem, onRefresh, onSelectWorkspaceView }: MainContentProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { handleSupabaseError, handleStorageError } = useErrorHandler();
  const [file, setFile] = useState<FileData | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  const isStructuredFile = (fileName: string, mimeType?: string | null) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return (
      ext === 'json' || ext === 'xml' || ext === 'html' || ext === 'htm' ||
      mimeType?.includes('json') || mimeType?.includes('xml') || mimeType?.includes('html')
    );
  };

  const isRichTextFile = (fileName: string, fileType: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    // Rich text for notes and documents, not for code files
    const codeExtensions = ['js', 'ts', 'py', 'php', 'go', 'sh', 'rb', 'java', 'c', 'cpp', 'h', 'css', 'json', 'xml', 'html', 'htm', 'yaml', 'yml', 'toml', 'sql'];
    return fileType === 'note' || (ext && !codeExtensions.includes(ext));
  };

  useEffect(() => {
    if (selectedItem.type === 'file' && selectedItem.id) {
      // Check if it's a vulnerability
      if (selectedItem.id.startsWith('vuln-')) {
        setFile(null);
        setContent('');
        setImageUrl(null);
      } else {
        fetchFile(selectedItem.id);
      }
    } else {
      setFile(null);
      setContent('');
      setImageUrl(null);
    }
  }, [selectedItem]);

  const fetchFile = useCallback(async (fileId: string) => {
    setLoading(true);
    setLoadError(null);
    
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .maybeSingle();

      if (error) {
        const appError = handleSupabaseError(error, {
          showToast: true,
          auditAction: 'file.view',
          context: { fileId },
        });
        setLoadError(new Error(appError.userMessage));
        setLoading(false);
        return;
      }

      if (data) {
        setFile(data);
        setContent(data.content || '');
        setViewMode('edit');

        // Audit successful file view
        auditSuccess('file.view', {
          resourceType: 'file',
          resourceId: data.id,
          resourceName: data.name,
        });

        if (data.mime_type?.startsWith('image/') && data.storage_path) {
          try {
            const { data: urlData, error: storageError } = await supabase.storage
              .from('files')
              .createSignedUrl(data.storage_path, 3600);
            
            if (storageError) {
              handleStorageError(storageError as Error, 'download', {
                showToast: false,
                context: { storagePath: data.storage_path },
              });
            }
            setImageUrl(urlData?.signedUrl || null);
          } catch (storageErr) {
            handleStorageError(storageErr as Error, 'download', {
              showToast: false,
            });
            setImageUrl(null);
          }
        } else {
          setImageUrl(null);
        }
      }
    } catch (err) {
      handleSupabaseError(err as Error, {
        showToast: true,
        context: { fileId },
      });
      setLoadError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [handleSupabaseError, handleStorageError]);

  const handleSave = useCallback(async () => {
    if (!file) return;
    setSaving(true);

    try {
      // Get current max version number
      const { data: versionData } = await supabase
        .from('file_versions')
        .select('version_number')
        .eq('file_id', file.id)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (versionData?.[0]?.version_number || 0) + 1;

      // Create a new version before updating
      const { error: versionError } = await supabase
        .from('file_versions')
        .insert({
          file_id: file.id,
          version_number: nextVersion,
          content: content,
          size_bytes: new TextEncoder().encode(content).length,
          change_summary: `Version ${nextVersion}`,
        });

      if (versionError) {
        console.error('Error creating version:', versionError);
        // Continue with save even if version creation fails
      }

      // Update the file
      const { error } = await supabase
        .from('files')
        .update({ content })
        .eq('id', file.id);

      if (error) {
        handleSupabaseError(error, {
          showToast: true,
          auditAction: 'file.update',
          context: { fileId: file.id, fileName: file.name },
        });
      } else {
        toast({ title: t.dashboard.saved });
        auditSuccess('file.update', {
          resourceType: 'file',
          resourceId: file.id,
          resourceName: file.name,
          details: { contentLength: content.length, version: nextVersion },
        });
      }
    } catch (err) {
      handleSupabaseError(err as Error, {
        showToast: true,
        auditAction: 'file.update',
        context: { fileId: file.id },
      });
    } finally {
      setSaving(false);
    }
  }, [file, content, handleSupabaseError, toast, t.dashboard.saved]);

  const handleExport = (format: 'txt' | 'md' | 'html' | 'pdf') => {
    if (!file || !content) return;

    let exportContent = content;
    let mimeType = 'text/plain';
    let extension = format;

    if (format === 'html') {
      exportContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${file.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    pre { background: #1a1a1a; color: #0f0; padding: 1rem; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${file.name}</h1>
  ${content}
</body>
</html>`;
      mimeType = 'text/html';
    } else if (format === 'md') {
      // Strip HTML tags for markdown export
      const stripped = content.replace(/<[^>]*>/g, '');
      exportContent = `# ${file.name}\n\n${stripped}`;
      mimeType = 'text/markdown';
    } else if (format === 'txt') {
      // Strip HTML tags for plain text
      const stripped = content.replace(/<[^>]*>/g, '');
      exportContent = stripped;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: `Exported as ${format.toUpperCase()}` });
  };

  if (!selectedItem.id) {
    return (
      <div className="h-full flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-3xl border-border/80 bg-card/60 shadow-lg shadow-primary/5 animate-fade-in">
          <CardContent className="pt-8 pb-7 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm shadow-primary/10">
              <FileText className="h-7 w-7 text-primary/80" />
            </div>
            <p className="text-lg font-semibold mb-2">Workspace is ready</p>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">{t.ui?.selectFileToView || 'Select a file or folder to view its contents'}</p>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Optimized for fast pentest workflow navigation
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-6 text-left">
              <div className="rounded-xl border border-border bg-background/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                <FolderOpen className="h-4 w-4 text-primary mb-2" />
                <p className="text-sm font-semibold">Browse project data</p>
                <p className="text-xs text-muted-foreground mt-1">Open files, notes, reports, and project dashboards from the sidebar.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                <Layers className="h-4 w-4 text-primary mb-2" />
                <p className="text-sm font-semibold">Review vulnerabilities</p>
                <p className="text-xs text-muted-foreground mt-1">Jump into the aggregated vulnerability view for prioritization and triage.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                <BarChart3 className="h-4 w-4 text-primary mb-2" />
                <p className="text-sm font-semibold">Generate reports</p>
                <p className="text-xs text-muted-foreground mt-1">Open report outputs and client-ready deliverables in one place.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {onSelectWorkspaceView && (
                <>
                <Button variant="outline" onClick={() => onSelectWorkspaceView('vulnerabilities')}>
                  <Layers className="h-4 w-4 mr-2" />
                  {t.ui?.allVulnerabilities || 'Open Vulnerabilities'}
                </Button>
                <Button variant="outline" onClick={() => onSelectWorkspaceView('reports')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t.ui?.reports || 'Open Reports'}
                </Button>
                </>
              )}
              <WorkspaceAssistantDialog
                trigger={
                  <Button variant="cyber">
                    <Bot className="h-4 w-4 mr-2" />
                    {t.ui?.aiAssistant || 'Open Assistant'}
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedItem.type === 'reports_dashboard') {
    return <ReportsDashboard />;
  }

  if (selectedItem.type === 'vulnerabilities_dashboard') {
    return <VulnerabilitiesDashboard projectId={selectedItem.id?.startsWith('workspace-') ? undefined : selectedItem.id || undefined} />;
  }

  if (selectedItem.type === 'folder') {
    return (
      <div className="h-full flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-xl border-border/80 bg-card/60 animate-fade-in">
          <CardContent className="pt-8 pb-7 text-center">
            <FolderOpen className="h-14 w-14 mx-auto mb-4 text-primary/80" />
            <p className="text-lg font-semibold">{selectedItem.name}</p>
            <p className="text-sm mt-2 text-muted-foreground">{t.ui?.selectFileToEdit || 'Select a file to edit or view'}</p>
            {selectedItem.id && (
              <div className="mt-5 flex justify-center">
                <ShareDialog
                  resourceType="folder"
                  resourceId={selectedItem.id}
                  resourceName={selectedItem.name || 'Folder'}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vulnerability viewer
  if (selectedItem.type === 'file' && selectedItem.id?.startsWith('vuln-')) {
    const vulnId = selectedItem.id.replace('vuln-', '');
    return (
      <VulnerabilityViewer
        vulnerabilityId={vulnId}
        onRefresh={onRefresh}
      />
    );
  }

  if (selectedItem.type === 'project') {
    return (
      <ProjectDashboard
        projectId={selectedItem.id!}
        projectName={selectedItem.name || 'Project'}
        onRefresh={onRefresh}
      />
    );
  }

  // Client info placeholder (when clicking on a client in sidebar)
  if (selectedItem.type === 'client' && selectedItem.id) {
    return (
      <ClientDashboard
        clientId={selectedItem.id}
        clientName={selectedItem.name || 'Client'}
      />
    );
  }

  // Client dashboard view
  if (selectedItem.type === 'client_dashboard' && selectedItem.id) {
    return (
      <ClientDashboard
        clientId={selectedItem.id}
        clientName={selectedItem.name || 'Client'}
      />
    );
  }

  if (loading) {
    return (
      <div className="h-full bg-background p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-[calc(100%-5rem)] w-full rounded-xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full p-4">
        <EmptyStateError
          error={loadError}
          onRetry={() => {
            if (selectedItem.id) {
              fetchFile(selectedItem.id);
            }
          }}
        />
      </div>
    );
  }

  if (!file && selectedItem.type === 'file') {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>File not found</p>
        </div>
      </div>
    );
  }

  // Project report viewer
  if (selectedItem.type === 'project_report' && selectedItem.id) {
    return (
      <ProjectReportViewer
        reportId={selectedItem.id}
        reportName={selectedItem.name || 'Report'}
        onRefresh={onRefresh}
      />
    );
  }

  if (!file) return null;

  // Image viewer
  if (file.mime_type?.startsWith('image/') && imageUrl) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold truncate">{file.name}</h2>
          <ShareDialog
            resourceType="file"
            resourceId={file.id}
            resourceName={file.name}
            trigger={
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                {t.share?.title || 'Share'}
              </Button>
            }
          />
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <img 
            src={imageUrl} 
            alt={file.name} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    );
  }

  const showStructuredViewer = isStructuredFile(file.name, file.mime_type);
  const showRichEditor = isRichTextFile(file.name, file.file_type);

  // Text/Code editor with optional view mode
  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-border gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h2 className="font-semibold truncate text-sm sm:text-base">{file.name}</h2>
          {showStructuredViewer && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="h-8 flex-shrink-0">
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="h-7 px-2 sm:px-3 text-xs">
                  <Code className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{t.editor?.editMode || 'Edit'}</span>
                </TabsTrigger>
                <TabsTrigger value="view" className="h-7 px-2 sm:px-3 text-xs">
                  <Eye className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{t.editor?.viewMode || 'View'}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap overflow-x-auto pb-1 sm:pb-0">
          {/* Version History */}
          <VersionHistory
            fileId={file.id}
            fileName={file.name}
            currentContent={content}
            onRollback={(restoredContent) => {
              setContent(restoredContent);
              fetchFile(file.id);
            }}
            trigger={
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t.ui?.history || 'History'}</span>
              </Button>
            }
          />
          {/* AI Assistant for non-rich-text files */}
          {!showRichEditor && (
            <AIAssistantDialog
              content={content}
              fileName={file.name}
              fileType={file.file_type}
              trigger={
                <Button variant="outline" size="sm">
                  <Bot className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t.ui?.aiAssistant || 'AI Assistant'}</span>
                </Button>
              }
            />
          )}
          <ShareDialog
            resourceType="file"
            resourceId={file.id}
            resourceName={file.name}
            trigger={
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t.share?.title || 'Share'}</span>
              </Button>
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t.dashboard.export}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('txt')}>
                {t.ui?.exportAsTxt || 'Export as TXT'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('md')}>
                {t.ui?.exportAsMd || 'Export as Markdown'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('html')}>
                {t.ui?.exportAsHtml || 'Export as HTML'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="cyber" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t.dashboard.saving : t.dashboard.save}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'view' && showStructuredViewer ? (
          <div className="h-full overflow-auto bg-card">
            <FileViewer content={content} fileName={file.name} mimeType={file.mime_type} />
          </div>
        ) : showRichEditor ? (
          <div className="h-full p-4">
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing..."
              fileName={file.name}
              fileType={file.file_type}
            />
          </div>
        ) : (
          <div className="h-full p-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full resize-none font-mono text-sm bg-card border-border"
              placeholder="Start typing..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
