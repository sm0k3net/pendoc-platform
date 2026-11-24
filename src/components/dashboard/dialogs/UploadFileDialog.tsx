import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  folderId: string | null;
  onSuccess: () => void;
}

export function UploadFileDialog({ open, onOpenChange, projectId, folderId, onSuccess }: UploadFileDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId || !selectedFile) return;

    setLoading(true);

    try {
      const storagePath = `${user.id}/${projectId}/${Date.now()}_${selectedFile.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, selectedFile);

      if (uploadError) throw uploadError;

      // Determine file type
      let fileType = 'uploaded';
      let content: string | null = null;

      // If it's a text file, read the content
      if (selectedFile.type.startsWith('text/') || 
          selectedFile.name.match(/\.(txt|md|json|xml|html|css|js|ts|py|php|go|sh|rb|java|c|cpp|h)$/i)) {
        content = await selectedFile.text();
        fileType = 'code';
      }

      // Create file record
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          project_id: projectId,
          folder_id: folderId,
          name: selectedFile.name,
          file_type: fileType,
          mime_type: selectedFile.type,
          storage_path: storagePath,
          size_bytes: selectedFile.size,
          content,
        });

      if (dbError) throw dbError;

      toast({ title: 'File uploaded successfully' });
      setSelectedFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error uploading file',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dashboard.uploadFile}</DialogTitle>
          <DialogDescription>
            Upload files to this project. Files are stored securely and linked to your project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select File</Label>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              {selectedFile ? (
                <p className="text-sm font-medium">{selectedFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to select a file</p>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.dashboard.cancel}
            </Button>
            <Button type="submit" variant="cyber" disabled={loading || !selectedFile}>
              {loading ? 'Uploading...' : t.dashboard.uploadFile}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
