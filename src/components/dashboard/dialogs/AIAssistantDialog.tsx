import { useState } from 'react';
import { Bot, Sparkles, FileText, Shield, Calculator, Wrench, Users, Clock, MessageSquare, Loader2, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { auditSuccess, auditFailure } from '@/lib/audit';
import { supabase } from '@/integrations/supabase/client';

interface AIAssistantDialogProps {
  content: string;
  fileName?: string;
  fileType?: string;
  onInsertContent?: (content: string) => void;
  trigger?: React.ReactNode;
}

const AI_ACTIONS = [
  { id: 'summarize', name: 'Summarize', description: 'Create a concise summary of the content', icon: FileText },
  { id: 'report', name: 'Transform to Report', description: 'Convert into professional pentest report format', icon: Sparkles },
  { id: 'description', name: 'Professional Description', description: 'Create a well-structured vulnerability description', icon: MessageSquare },
  { id: 'vulnerabilities', name: 'Find Vulnerabilities', description: 'Identify and analyze security vulnerabilities', icon: Shield },
  { id: 'cvss', name: 'CVSS Scoring', description: 'Calculate CVSS scores for findings', icon: Calculator },
  { id: 'remediation', name: 'Remediation Steps', description: 'Generate detailed remediation guidance', icon: Wrench },
  { id: 'executive', name: 'Executive Summary', description: 'Create non-technical stakeholder summary', icon: Users },
  { id: 'timeline', name: 'Create Timeline', description: 'Generate event timeline from data', icon: Clock },
];

export function AIAssistantDialog({ content, fileName, fileType, onInsertContent, trigger }: AIAssistantDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { handleAIError } = useErrorHandler();

  const handleAction = async (action: string) => {
    if (!content?.trim()) {
      toast({ 
        title: 'No content to analyze', 
        description: 'Please add some content to the file first',
        variant: 'destructive' 
      });
      return;
    }

    setSelectedAction(action);
    setLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action,
          content,
          customPrompt: action === 'custom' ? customPrompt : undefined,
          fileType,
          fileName,
        },
      });

      if (error) {
        handleAIError(error as Error, {
          showToast: true,
          auditAction: 'ai.analyze',
          context: { action, fileName },
        });
        setSelectedAction(null);
        return;
      }

      if (data?.response) {
        setResponse(data.response);
        auditSuccess('ai.analyze', {
          resourceName: fileName,
          details: { action, responseLength: data.response.length },
        });
      } else {
        throw new Error('No response from AI');
      }
    } catch (error: any) {
      handleAIError(error, {
        showToast: true,
        auditAction: 'ai.analyze',
        context: { action, fileName },
      });
      setSelectedAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
    }
  };

  const handleInsert = () => {
    if (response && onInsertContent) {
      onInsertContent(response);
      toast({ title: 'Content inserted into editor' });
      setOpen(false);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedAction(null);
    setResponse(null);
    setCustomPrompt('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetState();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[600px] max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Assistant
            <span className="text-xs text-muted-foreground font-normal ml-2">
              Powered by PenDoc AI
            </span>
          </DialogTitle>
        </DialogHeader>

        {!selectedAction ? (
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            <p className="text-sm text-muted-foreground">
              Select an action to analyze your content with AI
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AI_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => handleAction(action.id)}
                  >
                    <Icon className="h-4 w-4 mr-3 shrink-0 text-primary" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{action.name}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Custom Request</span>
              </div>
              <Textarea
                placeholder="Enter your custom prompt... (e.g., 'Extract all IP addresses and ports')"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px] mb-2"
              />
              <Button 
                onClick={() => handleAction('custom')} 
                disabled={!customPrompt.trim()}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Send Custom Request
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {AI_ACTIONS.find(a => a.id === selectedAction)?.name || 'Custom Request'}
                </span>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                ← Back
              </Button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Analyzing content...</p>
                </div>
              </div>
            ) : response ? (
              <>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full max-h-[52dvh] border border-border rounded-lg bg-muted/30">
                    <div className="p-4 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {response}
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={handleCopy} className="flex-1">
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  {onInsertContent && (
                    <Button onClick={handleInsert} className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Insert into Editor
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
