import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Building2,
  BarChart3,
  Bell,
  Users,
  FolderOpen,
  Bug,
  AlertTriangle,
  RefreshCw,
  Globe,
  Mail,
  Phone,
  User,
  Calendar,
  ExternalLink,
  Palette,
  UserCheck,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { BrandingSettings } from './BrandingSettings';
import { ClientAccessManager } from './ClientAccessManager';
import { RecentActivityModal } from './RecentActivityModal';

interface ClientDashboardProps {
  clientId: string;
  clientName: string;
}

interface ClientData {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  company_website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
}

interface ClientStats {
  project_count: number;
  total_vulnerabilities: number;
  open_vulnerabilities: number;
  waiting_retest: number;
}

interface ProjectStats {
  id: string;
  name: string;
  total: number;
  open: number;
  fixed: number;
  retest: number;
  critical: number;
  high: number;
}

interface Notification {
  id: string;
  type: 'comment' | 'retest_request' | 'vulnerability';
  message: string;
  created_at: string;
  project_name: string;
  vulnerability_title?: string;
}

export function ClientDashboard({ clientId, clientName }: ClientDashboardProps) {
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch contacts
      const { data: contactsData } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false });

      setContacts(contactsData || []);

      // Fetch stats
      const { data: statsData } = await supabase
        .from('client_stats')
        .select('*')
        .eq('client_id', clientId)
        .single();

      setStats(statsData);

      // Fetch projects with detailed stats
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('client_id', clientId);

      if (projects && projects.length > 0) {
        const projectStatsPromises = projects.map(async (project) => {
          const { data: vulns } = await supabase
            .from('vulnerabilities')
            .select('status, severity')
            .eq('project_id', project.id);

          const vulnArray = vulns || [];
          return {
            id: project.id,
            name: project.name,
            total: vulnArray.length,
            open: vulnArray.filter(v => v.status === 'open').length,
            fixed: vulnArray.filter(v => v.status === 'fixed').length,
            retest: vulnArray.filter(v => v.status === 'retest').length,
            critical: vulnArray.filter(v => v.severity === 'critical').length,
            high: vulnArray.filter(v => v.severity === 'high').length,
          };
        });

        const resolvedStats = await Promise.all(projectStatsPromises);
        setProjectStats(resolvedStats);
      }

      // Fetch recent activity/notifications for this client's projects
      await fetchNotifications(projects?.map(p => p.id) || []);

    } catch (error: any) {
      toast({ title: 'Error loading client data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (projectIds: string[]) => {
    if (projectIds.length === 0) {
      setNotifications([]);
      return;
    }

    try {
      // Fetch recent audit logs for these projects (activity)
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('id, action, category, resource_type, resource_name, created_at, success')
        .in('resource_type', ['project', 'vulnerability', 'file', 'folder'])
        .order('created_at', { ascending: false })
        .limit(20);

      // Get recent vulnerability comments
      const { data: comments } = await supabase
        .from('vulnerability_comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          vulnerabilities!inner (
            id,
            title,
            project_id,
            projects!inner (name)
          )
        `)
        .in('vulnerabilities.project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent retest requests
      const { data: retestVulns } = await supabase
        .from('vulnerabilities')
        .select(`
          id,
          title,
          updated_at,
          retest_requested_at,
          projects!inner (name)
        `)
        .in('project_id', projectIds)
        .eq('retest_status', 'waiting')
        .order('retest_requested_at', { ascending: false, nullsFirst: false })
        .limit(5);

      // Get recent vulnerabilities added
      const { data: newVulns } = await supabase
        .from('vulnerabilities')
        .select('id, title, severity, created_at, projects!inner(name)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(5);

      const notificationsList: Notification[] = [];

      // Add new vulnerability notifications
      newVulns?.forEach((vuln: any) => {
        notificationsList.push({
          id: `vuln-${vuln.id}`,
          type: 'vulnerability',
          message: `New ${vuln.severity} vulnerability: ${vuln.title}`,
          created_at: vuln.created_at,
          project_name: vuln.projects?.name || 'Unknown',
          vulnerability_title: vuln.title,
        });
      });

      // Add comment notifications
      comments?.forEach((comment: any) => {
        notificationsList.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          message: `New comment on ${comment.vulnerabilities?.title}`,
          created_at: comment.created_at,
          project_name: comment.vulnerabilities?.projects?.name || 'Unknown',
          vulnerability_title: comment.vulnerabilities?.title,
        });
      });

      // Add retest notifications
      retestVulns?.forEach((vuln: any) => {
        notificationsList.push({
          id: `retest-${vuln.id}`,
          type: 'retest_request',
          message: 'Re-test requested',
          created_at: vuln.retest_requested_at || vuln.updated_at,
          project_name: vuln.projects?.name || 'Unknown',
          vulnerability_title: vuln.title,
        });
      });

      // Sort by date and limit
      notificationsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(notificationsList.slice(0, 10));
    } catch (error) {
      console.error('Error fetching activity:', error);
      setNotifications([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading client dashboard...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Client not found</div>
      </div>
    );
  }

  const handleRefresh = () => {
    fetchClientData();
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {client.company_logo_url ? (
              <AvatarImage src={client.company_logo_url} alt={client.company_name} />
            ) : null}
            <AvatarFallback className="bg-cyan-500/10 text-cyan-500 text-xl">
              {client.company_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {client.company_name}
              {!client.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Client since {format(new Date(client.created_at), 'MMM yyyy')}
            </p>
          </div>
        </div>

        <Separator />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="client-access" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Client Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Statistics Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <FolderOpen className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
                    <div className="text-3xl font-bold">{stats?.project_count || 0}</div>
                    <div className="text-sm text-muted-foreground">Projects</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Bug className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-3xl font-bold">{stats?.total_vulnerabilities || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Vulnerabilities</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-red-500">{stats?.open_vulnerabilities || 0}</div>
                    <div className="text-sm text-muted-foreground">Open Vulnerabilities</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <RefreshCw className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-yellow-500">{stats?.waiting_retest || 0}</div>
                    <div className="text-sm text-muted-foreground">Waiting Re-test</div>
                  </div>
                </div>

                {projectStats.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <h4 className="font-semibold mb-4">Per Project Breakdown</h4>
                    <div className="space-y-3">
                      {projectStats.map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="font-medium">{project.name}</div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-muted-foreground">{project.total} total</span>
                            {project.critical > 0 && (
                              <Badge variant="destructive">{project.critical} Critical</Badge>
                            )}
                            {project.high > 0 && (
                              <Badge className="bg-orange-500">{project.high} High</Badge>
                            )}
                            {project.open > 0 && (
                              <span className="text-red-500">{project.open} open</span>
                            )}
                            {project.retest > 0 && (
                              <span className="text-yellow-500">{project.retest} retest</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Notifications Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                    {notifications.length > 5 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7"
                        onClick={() => setActivityModalOpen(true)}
                      >
                        View all
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>Latest updates from this client's projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.slice(0, 5).map((notification) => (
                        <div key={notification.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          {notification.type === 'comment' ? (
                            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                          ) : notification.type === 'retest_request' ? (
                            <RefreshCw className="h-5 w-5 text-yellow-500 mt-0.5" />
                          ) : (
                            <Bug className="h-5 w-5 text-orange-500 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{notification.message}</div>
                            {notification.vulnerability_title && (
                              <div className="text-sm text-muted-foreground truncate">
                                {notification.vulnerability_title}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {notification.project_name} • {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Modal */}
              <RecentActivityModal 
                open={activityModalOpen} 
                onOpenChange={setActivityModalOpen}
              />

              {/* Client Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Client Information
                  </CardTitle>
                  <CardDescription>Company details and contacts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Company Info */}
                  {client.company_website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={client.company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {client.company_website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {client.notes && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="font-medium mb-1">Notes</div>
                      <div className="text-muted-foreground">{client.notes}</div>
                    </div>
                  )}

                  <Separator />

                  {/* Contacts */}
                  <div>
                    <h4 className="font-semibold mb-3">Contact Persons</h4>
                    {contacts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No contacts added</div>
                    ) : (
                      <div className="space-y-3">
                        {contacts.map((contact) => (
                          <div key={contact.id} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{contact.name || 'Unnamed'}</span>
                              {contact.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                              {contact.role && (
                                <span className="text-xs text-muted-foreground">• {contact.role}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-1 text-sm">
                              {contact.email && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <a href={`mailto:${contact.email}`} className="hover:text-primary">
                                    {contact.email}
                                  </a>
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <a href={`tel:${contact.phone}`} className="hover:text-primary">
                                    {contact.phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="mt-6">
            <BrandingSettings clientId={clientId} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="client-access" className="mt-6">
            <ClientAccessManager clientId={clientId} clientName={client.company_name} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}