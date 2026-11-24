import { functionUrl, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Download, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ExportProjectDialogProps {
  projectId: string;
  projectName: string;
  trigger?: React.ReactNode;
}

export function ExportProjectDialog({ projectId, projectName, trigger }: ExportProjectDialogProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

  const handleExport = async () => {
    if (!session?.access_token) {
      toast({ title: 'Please log in to export', variant: 'destructive' });
      return;
    }

    setExporting(true);

    try {
      // Use fetch directly to get binary response
      const response = await fetch(
        functionUrl('export-project'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            password: usePassword ? password : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Project exported successfully' });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }

    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Project
          </DialogTitle>
          <DialogDescription>
            Export “{projectName}” as a ZIP archive with all folders and files included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-password"
              checked={usePassword}
              onCheckedChange={(checked) => setUsePassword(checked as boolean)}
            />
            <Label htmlFor="use-password" className="flex items-center gap-2 cursor-pointer">
              <Lock className="h-4 w-4" />
              Password protect ZIP file
            </Label>
          </div>

          {usePassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password for ZIP file"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You'll need this password to extract the ZIP file
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="cyber"
              onClick={handleExport}
              disabled={exporting || (usePassword && !password)}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export ZIP
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
