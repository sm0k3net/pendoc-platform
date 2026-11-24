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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  folderId: string | null;
  onSuccess: () => void;
}

export function CreateFileDialog({ open, onOpenChange, projectId, folderId, onSuccess }: CreateFileDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [fileType, setFileType] = useState('note');
  const [loading, setLoading] = useState(false);

  const checkDuplicateName = async (fileName: string): Promise<boolean> => {
    const query = supabase
      .from('files')
      .select('id')
      .eq('project_id', projectId!)
      .eq('name', fileName.trim());
    
    if (folderId) {
      query.eq('folder_id', folderId);
    } else {
      query.is('folder_id', null);
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
        title: 'A file with this name already exists',
        description: 'Please choose a different name.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        project_id: projectId,
        folder_id: folderId,
        name: name.trim(),
        file_type: fileType,
        content: '',
      });

    if (error) {
      toast({
        title: 'Error creating file',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'File created successfully' });
      setName('');
      setFileType('note');
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dashboard.newFile}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">{t.dashboard.fileName}</Label>
            <Input
              id="fileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="findings.md"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>File Type</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
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
