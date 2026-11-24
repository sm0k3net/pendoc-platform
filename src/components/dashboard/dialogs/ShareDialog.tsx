import { useState, useEffect } from 'react';
import { Share2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

type ShareResourceType = 'project' | 'folder' | 'file';
type SharePermission = 'read' | 'read_write' | 'read_write_add';

interface Share {
  id: string;
  shared_with_email: string;
  permission: SharePermission;
}

interface ShareDialogProps {
  resourceType: ShareResourceType;
  resourceId: string;
  resourceName: string;
  trigger?: React.ReactNode;
}

export function ShareDialog({ resourceType, resourceId, resourceName, trigger }: ShareDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('read');
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShares = async () => {
    const { data, error } = await supabase
      .from('shares')
      .select('id, shared_with_email, permission')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (!error && data) {
      setShares(data as Share[]);
    }
  };

  useEffect(() => {
    if (open) {
      fetchShares();
    }
  }, [open, resourceId]);

  const handleShare = async () => {
    if (!email || !user) return;
    setLoading(true);

    const { error } = await supabase
      .from('shares')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        owner_id: user.id,
        shared_with_email: email.toLowerCase(),
        permission,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: t.share?.alreadyShared || 'Already shared with this user', variant: 'destructive' });
      } else {
        toast({ title: t.share?.error || 'Error sharing', variant: 'destructive' });
      }
    } else {
      toast({ title: t.share?.success || 'Shared successfully' });
      setEmail('');
      fetchShares();
    }
    setLoading(false);
  };

  const handleRemoveShare = async (shareId: string) => {
    const { error } = await supabase
      .from('shares')
      .delete()
      .eq('id', shareId);

    if (!error) {
      toast({ title: t.share?.removed || 'Access removed' });
      fetchShares();
    }
  };

  const getPermissionLabel = (perm: SharePermission) => {
    switch (perm) {
      case 'read': return t.share?.readOnly || 'Read Only';
      case 'read_write': return t.share?.readWrite || 'Read/Write';
      case 'read_write_add': return t.share?.readWriteAdd || 'Read/Write/Add';
    }
  };

  const getPermissionColor = (perm: SharePermission) => {
    switch (perm) {
      case 'read': return 'secondary';
      case 'read_write': return 'default';
      case 'read_write_add': return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            {t.share?.title || 'Share'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.share?.title || 'Share'} "{resourceName}"</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Add new share */}
          <div className="space-y-3">
            <Label>{t.share?.inviteByEmail || 'Invite by email'}</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={permission} onValueChange={(v) => setPermission(v as SharePermission)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">{t.share?.readOnly || 'Read Only'}</SelectItem>
                  <SelectItem value="read_write">{t.share?.readWrite || 'Read/Write'}</SelectItem>
                  <SelectItem value="read_write_add">{t.share?.readWriteAdd || 'Read/Write/Add'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleShare} disabled={!email || loading} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              {t.share?.invite || 'Invite'}
            </Button>
          </div>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label>{t.share?.sharedWith || 'Shared with'}</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate max-w-[180px]">{share.shared_with_email}</span>
                      <Badge variant={getPermissionColor(share.permission)} className="text-xs">
                        {getPermissionLabel(share.permission)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(share.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
