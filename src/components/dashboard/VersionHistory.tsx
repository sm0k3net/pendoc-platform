import { useState, useEffect, useCallback } from 'react';
import { History, RotateCcw, Loader2, Clock, User, ChevronDown, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';

interface FileVersion {
  id: string;
  version_number: number;
  content: string | null;
  size_bytes: number | null;
  change_summary: string | null;
  created_by: string;
  created_at: string;
  creator_email?: string;
}

interface VersionHistoryProps {
  fileId: string;
  fileName: string;
  currentContent: string;
  onRollback: (content: string) => void;
  trigger?: React.ReactNode;
}

export function VersionHistory({ fileId, fileName, currentContent, onRollback, trigger }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [rollbackVersion, setRollbackVersion] = useState<FileVersion | null>(null);
  const [rolling, setRolling] = useState(false);
  const { toast } = useToast();

  const fetchVersions = useCallback(async () => {
    if (!fileId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('file_versions')
        .select('*')
        .eq('file_id', fileId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      // Fetch creator emails
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(v => v.created_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', creatorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        
        setVersions(data.map(v => ({
          ...v,
          creator_email: profileMap.get(v.created_by) || 'Unknown'
        })));
      } else {
        setVersions([]);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: 'Failed to load version history',
        description: 'Could not fetch version history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [fileId, toast]);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open, fetchVersions]);

  const handleRollback = async () => {
    if (!rollbackVersion) return;
    setRolling(true);

    try {
      const { data, error } = await supabase.rpc('rollback_file_version', {
        p_file_id: fileId,
        p_version_id: rollbackVersion.id
      });

      if (error || !data) throw error ?? new Error('The version could not be restored');

      toast({
        title: 'Version restored',
        description: `Rolled back to version ${rollbackVersion.version_number}`
      });

      // Notify parent to reload content
      if (rollbackVersion.content) {
        onRollback(rollbackVersion.content);
      }

      setRollbackVersion(null);
      setOpen(false);
    } catch (error: any) {
      console.error('Rollback error:', error);
      toast({
        title: 'Rollback failed',
        description: error.message || 'Could not restore version',
        variant: 'destructive'
      });
    } finally {
      setRolling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const getRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const truncateContent = (content: string | null, maxLength: number = 200) => {
    if (!content) return 'No content';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getContentDiff = (versionContent: string | null) => {
    if (!versionContent || !currentContent) return null;
    const currentLines = currentContent.split('\n').length;
    const versionLines = versionContent.split('\n').length;
    const lineDiff = currentLines - versionLines;
    
    if (lineDiff > 0) {
      return `+${lineDiff} lines`;
    } else if (lineDiff < 0) {
      return `${lineDiff} lines`;
    }
    return 'Same lines';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              {fileName} - {versions.length} version{versions.length !== 1 ? 's' : ''} saved
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No version history yet</p>
                <p className="text-xs mt-1">Versions are created automatically when you save changes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Current version indicator */}
                <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">Current</Badge>
                      <span className="text-sm text-muted-foreground">Working version</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Version list */}
                {versions.map((version) => (
                  <Collapsible
                    key={version.id}
                    open={expandedVersion === version.id}
                    onOpenChange={(isOpen) => setExpandedVersion(isOpen ? version.id : null)}
                  >
                    <div className="rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <CollapsibleTrigger className="w-full p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedVersion === version.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Version {version.version_number}</span>
                                {version.change_summary && (
                                  <span className="text-xs text-muted-foreground">
                                    - {version.change_summary}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {getRelativeTime(version.created_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {version.creator_email}
                                </span>
                                {version.size_bytes && (
                                  <span>{(version.size_bytes / 1024).toFixed(1)} KB</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRollbackVersion(version);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0">
                          <Separator className="mb-3" />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Created: {formatDate(version.created_at)}
                              </span>
                              {getContentDiff(version.content) && (
                                <Badge variant="secondary" className="text-xs">
                                  {getContentDiff(version.content)}
                                </Badge>
                              )}
                            </div>
                            <div className="bg-muted/50 rounded-md p-3 font-mono text-xs max-h-32 overflow-auto">
                              <pre className="whitespace-pre-wrap break-words">
                                {truncateContent(version.content, 500)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Last 50 versions are kept. Older versions are automatically removed.
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={!!rollbackVersion} onOpenChange={(open) => !open && setRollbackVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version {rollbackVersion?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current content with version {rollbackVersion?.version_number} from{' '}
              {rollbackVersion && getRelativeTime(rollbackVersion.created_at)}.
              <br /><br />
              Your current content will be saved as a new version before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rolling}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={rolling}>
              {rolling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Version
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
