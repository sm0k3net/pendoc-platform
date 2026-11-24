import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { auditSuccess } from '@/lib/audit';
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

interface Client {
  id: string;
  company_name: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientId?: string | null;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess, clientId }: CreateProjectDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleSupabaseError } = useErrorHandler();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);

  const dialogT = t.dialogs;

  useEffect(() => {
    if (open && user) {
      fetchClients();
      if (clientId) {
        setSelectedClientId(clientId);
      }
    }
  }, [open, user, clientId]);

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('user_id', user.id)
      .order('company_name');
    
    setClients(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          client_id: selectedClientId || null,
        })
        .select('id')
        .single();

      if (error) {
        handleSupabaseError(error, {
          showToast: true,
          auditAction: 'project.create',
          context: { projectName: name },
        });
      } else {
        toast({ title: dialogT?.projectCreated || 'Project created successfully' });
        auditSuccess('project.create', {
          resourceType: 'project',
          resourceId: data.id,
          resourceName: name,
        });
        setName('');
        setDescription('');
        setSelectedClientId(null);
        onOpenChange(false);
        onSuccess();
      }
    } catch (err) {
      handleSupabaseError(err as Error, {
        showToast: true,
        auditAction: 'project.create',
        context: { projectName: name },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dashboard.newProject}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {clients.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="clientSelect">{dialogT?.clientOptional || 'Client (Optional)'}</Label>
              <Select
                value={selectedClientId || 'none'}
                onValueChange={(value) => setSelectedClientId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={dialogT?.selectClient || 'Select a client...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{dialogT?.noClient || 'No client (standalone project)'}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="projectName">{t.dashboard.projectName}</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="KFC Penetration Testing"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectDesc">{t.dashboard.projectDescription}</Label>
            <Textarea
              id="projectDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Web application security assessment..."
              rows={3}
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
