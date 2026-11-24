import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Mail, Clock, Bell, Eye, EyeOff, Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface ClientAccessManagerProps {
  clientId: string;
  clientName: string;
  onRefresh: () => void;
}

interface ClientAccess {
  id: string;
  client_id: string;
  owner_id: string;
  client_user_id: string | null;
  client_email: string;
  client_name: string | null;
  access_token: string;
  is_active: boolean;
  last_login_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientNotification {
  id: string;
  project_id: string;
  client_access_id: string;
  notification_type: string;
  vulnerability_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  vulnerability?: {
    title: string;
  };
  client?: {
    client_name: string | null;
    client_email: string;
  };
}

export function ClientAccessManager({ clientId, clientName, onRefresh }: ClientAccessManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientAccess[]>([]);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientAccess | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  
  // Form state for adding/editing client
  const [clientEmail, setClientEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    fetchClients();
    fetchNotifications();
  }, [clientId]);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('client_access')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({ title: 'Error loading clients', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  const fetchNotifications = useCallback(async () => {
    try {
      // Get all projects under this client
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId);

      if (!projects || projects.length === 0) {
        setNotifications([]);
        return;
      }

      const projectIds = projects.map(p => p.id);

      const { data, error } = await supabase
        .from('client_notifications')
        .select(`
          *,
          vulnerability:vulnerabilities(title),
          client:client_access(client_name, client_email)
        `)
        .in('project_id', projectIds)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data as unknown as ClientNotification[]) || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [clientId]);

  const handleAddClient = async () => {
    if (!clientEmail.trim()) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: newAccess, error } = await supabase
        .from('client_access')
        .insert({
          client_id: clientId,
          owner_id: user?.id,
          client_email: clientEmail.trim().toLowerCase(),
          client_name: contactName.trim() || null,
          expires_at: expiresAt || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'This email already has access to this client', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      const { sendEventNotification } = await import('@/lib/emailNotifications');
      const sent = await sendEventNotification({ invitationId: newAccess.id });
      if (!sent) {
        toast({ title: 'Invitation email was not sent', description: 'Copy the invitation token and send it to the client securely.' });
      }

      toast({ title: 'Client access created successfully' });
      setShowAddDialog(false);
      resetForm();
      fetchClients();
      onRefresh();
    } catch (error) {
      console.error('Error adding client:', error);
      toast({ title: 'Error creating client access', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (client: ClientAccess) => {
    try {
      const { error } = await supabase
        .from('client_access')
        .update({ is_active: !client.is_active })
        .eq('id', client.id);

      if (error) throw error;

      toast({ 
        title: client.is_active ? 'Client access disabled' : 'Client access enabled' 
      });
      fetchClients();
    } catch (error) {
      console.error('Error toggling client status:', error);
      toast({ title: 'Error updating client status', variant: 'destructive' });
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from('client_access')
        .delete()
        .eq('id', selectedClient.id);

      if (error) throw error;

      toast({ title: 'Client access removed' });
      setShowDeleteDialog(false);
      setSelectedClient(null);
      fetchClients();
      onRefresh();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({ title: 'Error removing client access', variant: 'destructive' });
    }
  };

  const handleRegenerateToken = async (client: ClientAccess) => {
    try {
      // Generate a new token on the client side (in production, this should be done server-side)
      const newToken = crypto.randomUUID() + crypto.randomUUID();
      
      const { error } = await supabase
        .from('client_access')
        .update({ access_token: newToken })
        .eq('id', client.id);

      if (error) throw error;

      toast({ title: 'Access token regenerated' });
      fetchClients();
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast({ title: 'Error regenerating token', variant: 'destructive' });
    }
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast({ title: 'Token copied to clipboard' });
    } catch (error) {
      console.error('Error copying token:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Get all projects under this client
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId);

      if (!projects || projects.length === 0) return;

      const projectIds = projects.map(p => p.id);

      const { error } = await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .in('project_id', projectIds)
        .eq('is_read', false);

      if (error) throw error;
      toast({ title: 'All notifications marked as read' });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const resetForm = () => {
    setClientEmail('');
    setContactName('');
    setExpiresAt('');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'retest_request':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationMessage = (notification: ClientNotification) => {
    const clientName = notification.client?.client_name || notification.client?.client_email || 'Client';
    const vulnTitle = notification.vulnerability?.title || 'a vulnerability';
    
    switch (notification.notification_type) {
      case 'comment':
        return `${clientName} commented on "${vulnTitle}"`;
      case 'retest_request':
        return `${clientName} requested re-test for "${vulnTitle}"`;
      default:
        return notification.message || 'New notification';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Access Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Client Access
              </CardTitle>
              <CardDescription>
                Grant external clients read-only access to view project progress and vulnerabilities
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No clients have been granted access yet.</p>
              <p className="text-sm">Add a client to allow them to view project progress.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Access Token</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.client_name || 'Unnamed Client'}</p>
                          <p className="text-sm text-muted-foreground">{client.client_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={client.is_active}
                            onCheckedChange={() => handleToggleActive(client)}
                          />
                          <Badge variant={client.is_active ? "default" : "secondary"}>
                            {client.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(client.last_login_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.expires_at ? (
                          <Badge variant={new Date(client.expires_at) < new Date() ? "destructive" : "outline"}>
                            {formatDate(client.expires_at)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate">
                            {showTokens[client.id] ? client.access_token : '••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowTokens(prev => ({ ...prev, [client.id]: !prev[client.id] }))}
                          >
                            {showTokens[client.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyToken(client.access_token)}
                          >
                            {copiedToken === client.access_token ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateToken(client)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            New Token
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Client Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Client Notifications
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {notifications.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Recent comments and re-test requests from clients
              </CardDescription>
            </div>
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                Mark All Read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No new notifications</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    {getNotificationIcon(notification.notification_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{getNotificationMessage(notification)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkNotificationRead(notification.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The client will receive an invitation email with login instructions.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name (Optional)</Label>
              <Input
                id="contactName"
                placeholder="John Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Access Expires (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent access.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClient} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Client Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove access for{' '}
              <strong>{selectedClient?.client_name || selectedClient?.client_email}</strong>?
              They will no longer be able to view this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground">
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
