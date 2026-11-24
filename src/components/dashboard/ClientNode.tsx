import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building2, Folder, FolderOpen, MoreHorizontal, Trash2, Edit, Settings, Bell, BarChart3, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectedItem } from '@/pages/Dashboard';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { ProjectTree } from './ProjectTree';
import { CreateProjectDialog } from './dialogs/CreateProjectDialog';

interface Client {
  id: string;
  user_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  client_id: string | null;
}

interface ClientNodeProps {
  client: Client;
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  onSetSelectedProject: (id: string) => void;
  onRefresh: () => void;
  refreshTrigger: number;
  onEditClient: (client: Client) => void;
}

export function ClientNode({
  client,
  onSelectItem,
  selectedItem,
  onSetSelectedProject,
  onRefresh,
  refreshTrigger,
  onEditClient,
}: ClientNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [stats, setStats] = useState<{
    project_count: number;
    total_vulnerabilities: number;
    open_vulnerabilities: number;
    waiting_retest: number;
  } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (expanded) {
      fetchClientProjects();
      fetchClientStats();
    }
  }, [expanded, client.id, refreshTrigger]);

  const fetchClientProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching client projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const fetchClientStats = async () => {
    const { data, error } = await supabase
      .from('client_stats')
      .select('*')
      .eq('client_id', client.id)
      .single();

    if (!error && data) {
      setStats(data);
    }
  };

  const handleClientClick = () => {
    onSelectItem({ type: 'client', id: client.id, name: client.company_name });
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleDeleteClient = async () => {
    // Check if there are projects under this client
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id);

    if (count && count > 0) {
      toast({
        title: 'Cannot delete client',
        description: `This client has ${count} project(s). Please remove or reassign them first.`,
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', client.id);

    if (error) {
      toast({ title: 'Error deleting client', variant: 'destructive' });
    } else {
      toast({ title: 'Client deleted' });
      onRefresh();
    }
  };

  const isSelected = selectedItem.type === 'client' && selectedItem.id === client.id;
  const isOwner = user?.id === client.user_id;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start text-sm h-9 font-medium',
              isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
              !client.is_active && 'opacity-60'
            )}
            onClick={handleClientClick}
          >
            <span 
              onClick={handleToggleExpand}
              className="shrink-0 cursor-pointer hover:bg-muted rounded p-0.5 -ml-0.5"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <Building2 className="h-4 w-4 mr-2 ml-1 text-cyan-500 shrink-0" />
            <span className="truncate flex-1 text-left">{client.company_name}</span>
            {stats && stats.open_vulnerabilities > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                {stats.open_vulnerabilities}
              </Badge>
            )}
            {!client.is_active && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                Inactive
              </Badge>
            )}
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isOwner && (
            <>
              <ContextMenuItem onClick={() => setNewProjectDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onSelectItem({ type: 'client_dashboard', id: client.id, name: client.company_name })}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onEditClient(client)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleDeleteClient} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Dialogs */}
      <CreateProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
        onSuccess={onRefresh}
        clientId={client.id}
      />

      {expanded && (
        <div className="ml-4 border-l border-sidebar-border pl-2">
          {/* Client Stats Summary */}
          {stats && (
            <div className="mb-2 px-2 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>{stats.project_count} project(s)</span>
                <span>{stats.total_vulnerabilities} vulns</span>
              </div>
            </div>
          )}

          {/* Projects under this client */}
          {projects.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground italic">
              No projects yet
            </div>
          ) : (
            projects.map((project) => (
              <ProjectTree
                key={project.id}
                project={project}
                onSelectItem={onSelectItem}
                selectedItem={selectedItem}
                onSetSelectedProject={onSetSelectedProject}
                onRefresh={onRefresh}
                refreshTrigger={refreshTrigger}
                isShared={false}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
