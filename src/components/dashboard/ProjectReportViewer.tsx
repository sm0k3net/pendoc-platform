import { materializeNoteImages } from '@/lib/noteImages';
import { standaloneReport } from '@/lib/sanitize';
import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

interface ProjectReportViewerProps {
  reportId: string;
  reportName: string;
  onRefresh: () => void;
}

interface ReportData {
  id: string;
  name: string;
  html_content: string;
  report_type: string;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

export function ProjectReportViewer({ reportId, reportName, onRefresh }: ProjectReportViewerProps) {
  const { toast } = useToast();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewInNewTab, setViewInNewTab] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      setReport(data ? { ...data, html_content: await materializeNoteImages(data.html_content, true) } : null);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({ title: 'Error loading report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;

    const blob = new Blob([standaloneReport(report.html_content)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.replace(/[^a-z0-9]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Report downloaded' });
  };

  const handleOpenInNewTab = () => {
    if (!report) return;

    const blob = new Blob([standaloneReport(report.html_content)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDelete = async () => {
    if (!report) return;

    try {
      const { error } = await supabase
        .from('project_reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;

      toast({ title: 'Report deleted' });
      onRefresh();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({ title: 'Error deleting report', variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Report not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            {report.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>Generated: {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}</span>
            <span>•</span>
            <span>{formatFileSize(report.file_size)}</span>
            <Badge variant="secondary" className="text-xs">
              {report.report_type === 'penetration_test' ? 'Penetration Test' : report.report_type}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download HTML
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
                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this report? This action cannot be undone.
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
        </div>
      </div>

      {/* Report Content in iframe */}
      <div className="flex-1 p-4 overflow-hidden">
        <Card className="h-full overflow-hidden">
          <CardContent className="p-0 h-full">
            <iframe
              srcDoc={standaloneReport(report.html_content)}
              className="w-full h-full border-0"
              title={report.name}
              sandbox=""
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
