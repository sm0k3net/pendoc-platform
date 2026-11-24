import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  parentFolderId: string | null;
  onSuccess: () => void;
}

export function CreateFolderDialog({ open, onOpenChange, projectId, parentFolderId, onSuccess }: CreateFolderDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const checkDuplicateName = async (folderName: string): Promise<boolean> => {
    const query = supabase
      .from('folders')
      .select('id')
      .eq('project_id', projectId!)
      .eq('name', folderName.trim());
    
    if (parentFolderId) {
      query.eq('parent_id', parentFolderId);
    } else {
      query.is('parent_id', null);
    }
    
    const { data } = await query;
    return (data?.length || 0) > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId || !name.trim()) return;

    setLoading(true);

    // Check for duplicate names
    const isDuplicate = await checkDuplicateName(name);
    if (isDuplicate) {
      toast({
        title: 'A folder with this name already exists',
        description: 'Please choose a different name.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        project_id: projectId,
        parent_id: parentFolderId,
        name: name.trim(),
      });

    if (error) {
      toast({
        title: 'Error creating folder',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Folder created successfully' });
      setName('');
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dashboard.newFolder}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">{t.dashboard.folderName}</Label>
            <Input
              id="folderName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Scan Results"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.dashboard.cancel}
            </Button>
            <Button type="submit" variant="cyber" disabled={loading || !name.trim()}>
              {t.dashboard.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
