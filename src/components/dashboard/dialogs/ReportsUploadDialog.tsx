import { useState } from 'react';
import { Upload, FileCode, Loader2, Shield, Bug, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReportsUploadDialogProps {
  projectId: string | null;
  folderId: string | null;
  onSuccess: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SUPPORTED_TOOLS = [
  { id: 'acunetix', name: 'Acunetix', description: 'Import vulnerabilities from Acunetix XML reports', icon: Shield },
  { id: 'burpsuite', name: 'BurpSuite', description: 'Import vulnerabilities from BurpSuite XML reports', icon: Target },
  { id: 'nessus', name: 'Nessus', description: 'Import vulnerabilities from Nessus (.nessus) reports', icon: Bug },
  { id: 'nmap', name: 'Nmap', description: 'Convert Nmap XML reports to professional HTML', icon: FileCode },
];

export function ReportsUploadDialog({ projectId, folderId, onSuccess, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ReportsUploadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !user || !projectId || !selectedTool) return;
    
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      // Read file content
      const fileContent = await file.text();

      // Determine which edge function to call based on selected tool
      let functionName = 'process-nmap';
      if (selectedTool === 'acunetix') functionName = 'process-acunetix';
      else if (selectedTool === 'burpsuite') functionName = 'process-burpsuite';
      else if (selectedTool === 'nessus') functionName = 'process-nessus';

      // Call edge function to process report
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          xmlContent: fileContent,
          projectId,
          folderId,
          fileName: file.name
        }
      });

      if (error) throw error;

      // Show appropriate success message based on tool
      if (selectedTool === 'acunetix' || selectedTool === 'nessus' || selectedTool === 'burpsuite') {
        const stats = data?.stats;
        const toolNames: Record<string, string> = { acunetix: 'Acunetix', nessus: 'Nessus', burpsuite: 'BurpSuite' };
        const toolName = toolNames[selectedTool] || selectedTool;
        toast({ 
          title: `${toolName} report imported successfully`, 
          description: stats 
            ? `Imported ${stats.imported} vulnerabilities (${stats.severityCounts?.critical || 0} Critical, ${stats.severityCounts?.high || 0} High, ${stats.severityCounts?.medium || 0} Medium, ${stats.severityCounts?.low || 0} Low)${stats.skipped > 0 ? ` - ${stats.skipped} duplicates skipped` : ''}`
            : 'Vulnerabilities have been imported'
        });
      } else {
        toast({ title: 'Report processed successfully', description: 'HTML report has been created' });
      }
      
      setOpen(false);
      setSelectedTool(null);
      onSuccess();
    } catch (error: any) {
      console.error('Error processing report:', error);
      toast({ 
        title: 'Error processing report', 
        description: error.message || 'Failed to process report',
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Reports Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Security Tool Report</DialogTitle>
        </DialogHeader>
        
        {!selectedTool ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a tool to process its report
            </p>
            {SUPPORTED_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => setSelectedTool(tool.id)}
                >
                  <Icon className="h-5 w-5 mr-3 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">{tool.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Selected: {SUPPORTED_TOOLS.find(t => t.id === selectedTool)?.name}</p>
                <p className="text-sm text-muted-foreground">Upload XML report file</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTool(null)}>
                Change
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept={selectedTool === 'nessus' ? '.nessus,.xml' : '.xml'}
                onChange={handleFileUpload}
                disabled={uploading || !projectId}
                className="hidden"
                id="report-upload"
              />
              <label
                htmlFor="report-upload"
                className={`cursor-pointer flex flex-col items-center gap-2 ${
                  uploading || !projectId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-primary" />
                )}
                <span className="text-sm font-medium">
                  {uploading ? 'Processing report...' : 'Click to upload XML file'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Supports {selectedTool} XML format
                </span>
              </label>
            </div>
            
            {!projectId && (
              <p className="text-sm text-destructive">Please select a project first</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
