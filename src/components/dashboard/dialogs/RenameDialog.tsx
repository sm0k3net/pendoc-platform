import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: 'folder' | 'file' | 'project';
  resourceId: string;
  currentName: string;
  projectId?: string;
  parentFolderId?: string | null;
  folderId?: string | null;
  onSuccess: () => void;
}

export function RenameDialog({ 
  open, 
  onOpenChange, 
  resourceType, 
  resourceId, 
  currentName, 
  projectId,
  parentFolderId,
  folderId,
  onSuccess 
}: RenameDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  // Reset name when dialog opens with new resource
  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const checkDuplicateName = async (newName: string): Promise<boolean> => {
    if (resourceType === 'project') {
      // Projects are unique per user - this is handled at DB level
      return false;
    }
    
    if (resourceType === 'folder') {
      // Check for duplicate folder names in same parent
      const query = supabase
        .from('folders')
        .select('id')
        .eq('project_id', projectId!)
        .eq('name', newName.trim())
        .neq('id', resourceId);
      
      if (parentFolderId) {
        query.eq('parent_id', parentFolderId);
      } else {
        query.is('parent_id', null);
      }
      
      const { data } = await query;
      return (data?.length || 0) > 0;
    }
    
    if (resourceType === 'file') {
      // Check for duplicate file names in same folder
      const query = supabase
        .from('files')
        .select('id')
        .eq('project_id', projectId!)
        .eq('name', newName.trim())
        .neq('id', resourceId);
      
      if (folderId) {
        query.eq('folder_id', folderId);
      } else {
        query.is('folder_id', null);
      }
      
      const { data } = await query;
      return (data?.length || 0) > 0;
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) {
      onOpenChange(false);
      return;
    }

    setLoading(true);

    // Check for duplicate names
    const isDuplicate = await checkDuplicateName(name);
    if (isDuplicate) {
      toast({
        title: `A ${resourceType} with this name already exists`,
        description: 'Please choose a different name.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    let error;
    
    if (resourceType === 'folder') {
      const result = await supabase
        .from('folders')
        .update({ name: name.trim() })
        .eq('id', resourceId);
      error = result.error;
    } else if (resourceType === 'file') {
      const result = await supabase
        .from('files')
        .update({ name: name.trim() })
        .eq('id', resourceId);
      error = result.error;
    } else if (resourceType === 'project') {
      const result = await supabase
        .from('projects')
        .update({ name: name.trim() })
        .eq('id', resourceId);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error renaming ${resourceType}`,
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} renamed successfully` });
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  const getTitle = () => {
    switch (resourceType) {
      case 'folder': return 'Rename Folder';
      case 'file': return 'Rename File';
      case 'project': return 'Rename Project';
      default: return 'Rename';
    }
  };

  const getLabel = () => {
    switch (resourceType) {
      case 'folder': return 'Folder Name';
      case 'file': return 'File Name';
      case 'project': return 'Project Name';
      default: return 'Name';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resourceName">{getLabel()}</Label>
            <Input
              id="resourceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={currentName}
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.dashboard.cancel}
            </Button>
            <Button type="submit" variant="cyber" disabled={loading || !name.trim()}>
              Rename
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
