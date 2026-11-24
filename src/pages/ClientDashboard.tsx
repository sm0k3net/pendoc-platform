import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Settings, Bell, Building2, LayoutDashboard, Layers, ChevronRight, Home, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { ClientSidebar } from '@/components/client/ClientSidebar';
import { ClientMainContent } from '@/components/client/ClientMainContent';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export interface ClientSelectedItem {
  type: 'vulnerability' | 'project' | 'report' | 'project_report' | 'overview' | 'artifact' | 'vulnerabilities' | null;
  id: string | null;
  name: string | null;
  projectId?: string;
  artifactType?: 'attack_vector' | 'remediation_strategy' | 'recommendations';
}

interface Notification {
  id: string;
  notification_type: string;
  message: string | null;
  vulnerability_id: string | null;
  project_id: string;
  is_read: boolean;
  created_at: string;
}

interface ClientProject {
  id: string;
  name: string;
  description: string | null;
}

export default function ClientDashboard() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedItem, setSelectedItem] = useState<ClientSelectedItem>({ type: 'overview', id: null, name: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientAccess, setClientAccess] = useState<any>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [clientInfo, setClientInfo] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?mode=login&type=client');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkClientAccess();
    }
  }, [user]);

  // Fetch notifications when client access and projects are loaded
  useEffect(() => {
    if (clientAccess?.id && clientProjects.length >= 0) {
      fetchNotifications();
    }
  }, [clientAccess?.id, clientProjects]);

  const checkClientAccess = async () => {
    try {
      // Check for client access (client-level access)
      const { data, error } = await supabase
        .from('client_access')
        .select(`
          *,
          client:clients(id, company_name, company_logo_url, company_website, is_active)
        `)
        .eq('client_user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();

      if (error) {
        console.error('Client access query error:', error);
        throw error;
      }

      if (!data || !data.client_id) {
        // No active client access found
        console.log('No client access found for user');
        navigate('/');
        return;
      }

      setClientAccess(data);
      setClientInfo(data.client);

      // Fetch all projects for this client
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description')
        .eq('client_id', data.client_id)
        .order('name');

      if (projectsError) {
        console.error('Projects query error:', projectsError);
      }
      setClientProjects(projects || []);

    } catch (error) {
      console.error('Error checking client access:', error);
      navigate('/');
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchNotifications = async () => {
    if (!clientAccess?.id) return;
    
    try {
      // Query notifications where client_access_id matches OR where it's for projects under this client
      const { data, error } = await supabase
        .from('client_notifications')
        .select('*, vulnerability_title, project_name, target_url')
        .eq('client_access_id', clientAccess.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Notification query error:', error);
        // Fallback: try simpler query
        const { data: fallbackData } = await supabase
          .from('client_notifications')
          .select('*')
          .eq('client_access_id', clientAccess.id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        setNotifications(fallbackData || []);
        setUnreadCount(fallbackData?.filter(n => !n.is_read).length || 0);
        return;
      }
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!clientAccess?.id) return;
    try {
      await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .eq('client_access_id', clientAccess.id)
        .eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationRead(notification.id);
    if (notification.vulnerability_id) {
      setSelectedItem({
        type: 'vulnerability',
        id: notification.vulnerability_id,
        name: (notification as any).vulnerability_title || notification.message,
        projectId: notification.project_id
      });
    }
  };

  const handleSelectItem = (item: ClientSelectedItem) => {
    setSelectedItem(item);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const openOverview = () => {
    setSelectedItem({ type: 'overview', id: clientId, name: clientName });
  };

  const openAllVulnerabilities = () => {
    setSelectedItem({ type: 'vulnerabilities', id: clientId, name: 'All Vulnerabilities' });
  };

  // Build breadcrumb trail
  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [];
    if (!clientAccess) return crumbs;

    const cId = clientAccess.client_id;
    const cName = clientInfo?.company_name || 'Organization';

    crumbs.push({ label: t.clientPortal.overview, onClick: () => setSelectedItem({ type: 'overview', id: cId, name: cName }) });

    if (selectedItem.type === 'overview') return crumbs;

    if (selectedItem.type === 'vulnerabilities' && !selectedItem.projectId) {
      crumbs.push({ label: t.clientPortal.allVulnerabilities });
      return crumbs;
    }

    if (selectedItem.projectId) {
      const projName = clientProjects.find(p => p.id === selectedItem.projectId)?.name || 'Project';
      crumbs.push({
        label: projName,
        onClick: () => setSelectedItem({ type: 'project', id: selectedItem.projectId!, name: projName, projectId: selectedItem.projectId }),
      });
    }

    if (selectedItem.type === 'project') return crumbs;

    if (selectedItem.type === 'vulnerabilities') {
      crumbs.push({ label: t.clientPortal.vulnerabilities });
    } else if (selectedItem.type === 'vulnerability') {
      crumbs.push({ label: selectedItem.name || t.clientPortal.vulnerability });
    } else if (selectedItem.type === 'report' || selectedItem.type === 'project_report') {
      crumbs.push({ label: selectedItem.name || t.clientPortal.report });
    } else if (selectedItem.type === 'artifact') {
      crumbs.push({ label: selectedItem.name || t.clientPortal.artifact });
    }

    return crumbs;
  }, [selectedItem, clientAccess, clientInfo, clientProjects, t]);

  const BreadcrumbBar = () => {
    if (breadcrumbs.length <= 1) return null;
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto scrollbar-none">
        <Home className="h-3 w-3 flex-shrink-0" />
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {crumb.onClick && i < breadcrumbs.length - 1 ? (
              <button onClick={crumb.onClick} className="hover:text-foreground transition-colors truncate max-w-[160px]">
                {crumb.label}
              </button>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[200px]">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Skeleton header */}
        <div className="h-14 border-b px-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-32" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        {/* Skeleton body */}
        <div className="flex flex-1">
          <div className="hidden md:block w-64 border-r p-4 space-y-3">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !clientAccess) return null;

  const clientId = clientAccess.client_id;
  const clientName = clientInfo?.company_name || 'Organization';

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[88vw] max-w-sm h-[100dvh] overflow-hidden">
                <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
                  <ClientSidebar 
                    clientId={clientId}
                    clientName={clientName}
                    projects={clientProjects}
                    onSelectItem={handleSelectItem}
                    selectedItem={selectedItem}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm truncate max-w-[150px]">{clientName}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[calc(100vw-1rem)] max-w-sm p-0">
                <div className="p-3 border-b flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{t.clientPortal.notifications || 'Notifications'}</h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllNotificationsRead}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t.clientPortal.markAllRead || 'Mark all read'}
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-64">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {t.clientPortal.noNotifications || 'No notifications'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map(notification => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                            !notification.is_read ? 'bg-primary/5' : ''
                          }`}
                        >
                          <p className="text-sm line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/client/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t.clientPortal.settings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t.clientPortal.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* Mobile Breadcrumb */}
        {breadcrumbs.length > 1 && (
          <div className="px-4 py-1.5 border-b border-border bg-muted/30">
            <BreadcrumbBar />
          </div>
        )}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ClientMainContent 
            selectedItem={selectedItem}
            clientId={clientId}
            clientName={clientName}
            clientInfo={clientInfo}
            projects={clientProjects}
            notifications={notifications}
            onSelectItem={handleSelectItem}
          />
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">{clientName}</span>
          <span className="text-sm text-muted-foreground">• {t.clientPortal.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden xl:flex items-center gap-1 mr-1">
            <Button variant="ghost" size="sm" onClick={openOverview}>
              <LayoutDashboard className="h-4 w-4 mr-1" />
              {t.clientPortal.overview}
            </Button>
            <Button variant="ghost" size="sm" onClick={openAllVulnerabilities}>
              <Layers className="h-4 w-4 mr-1" />
              {t.clientPortal.vulnerabilities}
            </Button>
          </div>
          <ThemeToggle />
          <LanguageToggle />
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b flex items-center justify-between">
                <h4 className="font-semibold text-sm">{t.clientPortal.notifications || 'Notifications'}</h4>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllNotificationsRead}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t.clientPortal.markAllRead || 'Mark all read'}
                  </Button>
                )}
              </div>
              <ScrollArea className="h-64">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {t.clientPortal.noNotifications || 'No notifications'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map(notification => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                          !notification.is_read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <p className="text-sm line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="hidden sm:inline">{user.email}</span>
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/client/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                {t.clientPortal.settings}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t.clientPortal.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {/* Desktop Breadcrumb */}
      {breadcrumbs.length > 1 && (
        <div className="px-6 py-1.5 border-b border-border bg-muted/30">
          <BreadcrumbBar />
        </div>
      )}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full overflow-y-auto">
              <ClientSidebar 
                clientId={clientId}
                clientName={clientName}
                projects={clientProjects}
                onSelectItem={handleSelectItem}
                selectedItem={selectedItem}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="h-full overflow-y-auto">
              <ClientMainContent 
                selectedItem={selectedItem}
                clientId={clientId}
                clientName={clientName}
                clientInfo={clientInfo}
                projects={clientProjects}
                notifications={notifications}
                onSelectItem={handleSelectItem}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
