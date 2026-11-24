import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Trash2, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SelectedItem } from '@/pages/Dashboard';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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

interface ProjectReport {
  id: string;
  name: string;
  created_at: string;
  file_size: number | null;
}

interface ReportRegistryNodeProps {
  projectId: string;
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  onRefresh: () => void;
  refreshTrigger: number;
  onOpenDashboard?: () => void;
}

export function ReportRegistryNode({
  projectId,
  onSelectItem,
  selectedItem,
  onRefresh,
  refreshTrigger,
  onOpenDashboard,
}: ReportRegistryNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchReports();
  }, [projectId, refreshTrigger]);

  useEffect(() => {
    if (expanded) {
      fetchReports();
    }
  }, [expanded]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_reports')
      .select('id, name, created_at, file_size')
      .eq('project_id', projectId)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
    setLoading(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('project_reports')
        .update({ is_archived: true })
        .eq('id', reportId);

      if (error) throw error;

      toast({ title: 'Report archived' });
      fetchReports();
      onRefresh();
    } catch (error) {
      console.error('Error archiving report:', error);
      toast({ title: 'Error archiving report', variant: 'destructive' });
    }
  };

  const handleDownloadReport = async (report: ProjectReport) => {
    try {
      const { data, error } = await supabase
        .from('project_reports')
        .select('html_content')
        .eq('id', report.id)
        .single();

      if (error) throw error;

      const blob = new Blob([data.html_content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.replace(/[^a-z0-9]/gi, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Report downloaded' });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({ title: 'Error downloading report', variant: 'destructive' });
    }
  };

  // Don't render if no reports
  if (reports.length === 0 && !loading) {
    return null;
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleHeaderClick = () => {
    if (onOpenDashboard) {
      onOpenDashboard();
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'w-full justify-start text-sm h-7 font-medium text-green-600 dark:text-green-500'
        )}
        onClick={handleHeaderClick}
        title="Click for dashboard"
      >
        <span 
          onClick={handleToggleExpand}
          className="shrink-0 cursor-pointer hover:bg-muted rounded p-0.5 -ml-0.5"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
        <FileText className="h-3.5 w-3.5 mr-2 ml-1 shrink-0" />
        <span className="truncate flex-1 text-left">Reports</span>
        <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
          {reports.length}
        </Badge>
      </Button>

      {expanded && (
        <div className="ml-4 border-l border-sidebar-border pl-2">
          {reports.map((report) => (
            <ReportNode
              key={report.id}
              report={report}
              onSelectItem={onSelectItem}
              selectedItem={selectedItem}
              onDelete={() => handleDeleteReport(report.id)}
              onDownload={() => handleDownloadReport(report)}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportNode({
  report,
  onSelectItem,
  selectedItem,
  onDelete,
  onDownload,
  formatFileSize,
}: {
  report: ProjectReport;
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  onDelete: () => void;
  onDownload: () => void;
  formatFileSize: (bytes: number | null) => string;
}) {
  const isSelected = selectedItem.type === 'project_report' && selectedItem.id === report.id;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start text-sm h-auto py-1.5 px-2',
            isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground'
          )}
          onClick={() => onSelectItem({ type: 'project_report', id: report.id, name: report.name })}
        >
          <FileText className="h-3.5 w-3.5 mr-2 shrink-0 text-green-500" />
          <div className="flex-1 min-w-0 text-left">
            <span className="truncate block text-xs">{report.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
              {report.file_size && ` • ${formatFileSize(report.file_size)}`}
            </span>
          </div>
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onSelectItem({ type: 'project_report', id: report.id, name: report.name })}>
          <Eye className="h-4 w-4 mr-2" />
          View Report
        </ContextMenuItem>
        <ContextMenuItem onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download HTML
        </ContextMenuItem>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <ContextMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Report</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this report? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ContextMenuContent>
    </ContextMenu>
  );
}
