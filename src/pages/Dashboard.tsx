import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { MainContent } from '@/components/dashboard/MainContent';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export interface SelectedItem {
  type: 'file' | 'folder' | 'project' | 'project_report' | 'client' | 'client_dashboard' | 'reports_dashboard' | 'vulnerabilities_dashboard' | null;
  id: string | null;
  name: string | null;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: null, id: null, name: null });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingUserType, setCheckingUserType] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const vulnId = searchParams.get('vuln');
    const projectId = searchParams.get('project');
    if (vulnId) {
      setSelectedItem({ type: 'file', id: `vuln-${vulnId}`, name: 'Vulnerability' });
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('vuln');
        return next;
      }, { replace: true });
      return;
    }

    if (projectId) {
      setSelectedItem({ type: 'project', id: projectId, name: 'Project' });
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('project');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Check if user is a client - if so, redirect to client dashboard
  useEffect(() => {
    const checkUserType = async () => {
      if (!user) {
        setCheckingUserType(false);
        return;
      }

      try {
        // Check if user has active client access (meaning they are a client)
        const { data: clientAccess } = await supabase
          .from('client_access')
          .select('id')
          .eq('client_user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (clientAccess) {
          // User is a client, redirect to client dashboard
          navigate('/client');
          return;
        }
      } catch (error) {
        console.error('Error checking user type:', error);
      } finally {
        setCheckingUserType(false);
      }
    };

    if (user) {
      checkUserType();
    }
  }, [user, navigate]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSelectItem = (item: SelectedItem) => {
    setSelectedItem(item);
    // Close sidebar on mobile only when a file is selected (to view content)
    // Keep sidebar open for project/folder selection (navigation/expansion)
    if (isMobile && item.type === 'file') {
      setSidebarOpen(false);
    }
  };

  const handleWorkspaceShortcut = (view: 'vulnerabilities' | 'reports') => {
    if (view === 'vulnerabilities') {
      setSelectedItem({
        type: 'vulnerabilities_dashboard',
        id: 'workspace-vulnerabilities',
        name: 'Vulnerabilities',
      });
      return;
    }

    setSelectedItem({
      type: 'reports_dashboard',
      id: 'workspace-reports',
      name: 'Reports',
    });
  };

  if (loading || checkingUserType) {
    return (
      <div className="h-dvh flex flex-col bg-background overflow-hidden">
        {/* Header skeleton */}
        <div className="h-14 border-b bg-card/50 flex items-center px-4 gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-5 w-24" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar skeleton (hidden on mobile) */}
          <div className="hidden md:flex flex-col w-64 border-r p-4 gap-3">
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          {/* Content skeleton */}
          <div className="flex-1 p-4 sm:p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Derive the selected project ID from the selected item
  const selectedProjectId = selectedItem.type === 'project' ? selectedItem.id : null;

  // Mobile Layout with Sheet
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col bg-background overflow-hidden">
        <DashboardHeader 
          contextLabel={selectedItem.name || undefined}
          onSelectWorkspaceView={handleWorkspaceShortcut}
          mobileMenuButton={
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[92vw] max-w-sm h-[100dvh] overflow-hidden border-r border-border bg-sidebar/95 backdrop-blur-xl">
                <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
                  <DashboardSidebar 
                    onSelectItem={handleSelectItem} 
                    selectedItem={selectedItem}
                    refreshTrigger={refreshTrigger}
                    onRefresh={handleRefresh}
                    selectedProjectId={selectedProjectId}
                  />
                </div>
              </SheetContent>
            </Sheet>
          }
        />
        <div className="flex-1 overflow-y-auto min-h-0 bg-gradient-to-b from-background to-background/95">
          <MainContent 
            selectedItem={selectedItem} 
            onRefresh={handleRefresh}
            onSelectWorkspaceView={handleWorkspaceShortcut}
          />
        </div>
      </div>
    );
  }

  // Desktop Layout with Resizable Panels
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <DashboardHeader
        contextLabel={selectedItem.name || undefined}
        onSelectWorkspaceView={handleWorkspaceShortcut}
      />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full overflow-y-auto">
              <DashboardSidebar 
                onSelectItem={setSelectedItem} 
                selectedItem={selectedItem}
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
                selectedProjectId={selectedProjectId}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="h-full overflow-y-auto">
              <MainContent 
                selectedItem={selectedItem} 
                onRefresh={handleRefresh}
                onSelectWorkspaceView={handleWorkspaceShortcut}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
