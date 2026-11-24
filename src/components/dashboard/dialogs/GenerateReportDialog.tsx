import { standaloneReport } from '@/lib/sanitize';
import { materializeNoteImages } from '@/lib/noteImages';
import { functionUrl, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface GenerateReportDialogProps {
  projectId: string;
  projectName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function GenerateReportDialog({ projectId, projectName, trigger, onSuccess }: GenerateReportDialogProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState<'html' | 'pdf'>('html');
  const [reportLanguage, setReportLanguage] = useState<'en' | 'ru'>(language as 'en' | 'ru');
  const [shareWithClient, setShareWithClient] = useState(false);

  const handleGenerate = async () => {
    if (!session?.access_token) {
      toast({ title: t.report.pleaseLogin, variant: 'destructive' });
      return;
    }

    setGenerating(true);

    try {
      // Use fetch directly to handle different response types properly
      const response = await fetch(
        functionUrl('generate-report'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId, format, language: reportLanguage, shareWithClient }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t.report.error }));
        throw new Error(errorData.error || t.report.error);
      }

      if (format === 'html') {
        const htmlContent = standaloneReport(await materializeNoteImages(await response.text(), true));
        
        // Note: Report is already saved to database by the edge function
        // Just download the file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_report.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For PDF, open HTML in new window for print
        const data = await response.json();
        
        // Note: Report is already saved to database by the edge function
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.opener = null;
          printWindow.document.write(standaloneReport(await materializeNoteImages(data.html, true)));
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }

      toast({ title: t.report.generated });
      onSuccess?.();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: t.report.error,
        description: error.message,
        variant: 'destructive',
      });
    }

    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            {t.report.generate}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t.report.generatePentest}
          </DialogTitle>
          <DialogDescription>
            {t.report.generateFor} "{projectName}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>{t.report.language}</Label>
            <RadioGroup value={reportLanguage} onValueChange={(v) => setReportLanguage(v as 'en' | 'ru')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="en" id="lang-en" />
                <Label htmlFor="lang-en" className="cursor-pointer">{t.report.english}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ru" id="lang-ru" />
                <Label htmlFor="lang-ru" className="cursor-pointer">{t.report.russian}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>{t.report.format}</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'html' | 'pdf')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html" className="cursor-pointer">{t.report.htmlDownload}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="cursor-pointer">{t.report.pdfPrint}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
            <div className="space-y-1">
              <Label className="cursor-pointer">Share in client portal</Label>
              <p className="text-xs text-muted-foreground">
                Off by default. Enable only when this report is ready for client access.
              </p>
            </div>
            <Switch checked={shareWithClient} onCheckedChange={setShareWithClient} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t.dashboard.cancel}</Button>
            <Button variant="cyber" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.report.generating}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {t.common.generate}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
