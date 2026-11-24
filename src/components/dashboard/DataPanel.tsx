import { useState, useEffect, useCallback } from 'react';
import { Plus, FolderPlus, FilePlus, Upload, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { EmptyStateError } from '@/components/ErrorBoundary';
import { ProjectTree } from './ProjectTree';
import { ClientNode } from './ClientNode';
import { CreateProjectDialog } from './dialogs/CreateProjectDialog';
import { CreateClientDialog } from './dialogs/CreateClientDialog';
import { EditClientDialog } from './dialogs/EditClientDialog';
import { CreateFolderDialog } from './dialogs/CreateFolderDialog';
import { CreateFileDialog } from './dialogs/CreateFileDialog';
import { UploadFileDialog } from './dialogs/UploadFileDialog';
import { ReportsUploadDialog } from './dialogs/ReportsUploadDialog';
import { SelectedItem } from '@/pages/Dashboard';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  client_id: string | null;
}

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

interface DataPanelProps {
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  refreshTrigger: number;
  onRefresh: () => void;
}

export function DataPanel({ onSelectItem, selectedItem, refreshTrigger, onRefresh }: DataPanelProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleSupabaseError } = useErrorHandler();
  const [clients, setClients] = useState<Client[]>([]);
  const [orphanProjects, setOrphanProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [showReportsUpload, setShowReportsUpload] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('company_name');

      if (clientsError) {
        console.warn('Clients table may not exist yet:', clientsError);
        setClients([]);
      } else {
        setClients(clientsData || []);
      }

      // Fetch orphan projects (projects without a client)
      const { data: orphanData, error: orphanError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .is('client_id', null)
        .order('created_at', { ascending: false });

      if (orphanError) {
        handleSupabaseError(orphanError, {
          showToast: true,
          context: { userId: user.id },
        });
        setLoadError(new Error('Failed to load projects'));
        setLoading(false);
        return;
      }
      
      setOrphanProjects(orphanData || []);

      // Fetch shared projects
      const { data: shares, error: sharesError } = await supabase
        .from('shares')
        .select('resource_id')
        .eq('resource_type', 'project')
        .eq('shared_with_email', user.email || '');

      if (sharesError) {
        // Don't fail completely for shared projects error
        console.warn('Failed to fetch shared projects:', sharesError);
      } else if (shares && shares.length > 0) {
        const sharedIds = shares.map(s => s.resource_id);
        const { data: sharedData } = await supabase
          .from('projects')
          .select('*')
          .in('id', sharedIds)
          .order('created_at', { ascending: false });

        setSharedProjects(sharedData || []);
      } else {
        setSharedProjects([]);
      }

    } catch (err) {
      handleSupabaseError(err as Error, {
        showToast: true,
      });
      setLoadError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, handleSupabaseError]);

  useEffect(() => {
    fetchProjects();
  }, [user, refreshTrigger]);

  const handleCreateSuccess = () => {
    fetchProjects();
    onRefresh();
  };

  const handleAddNew = (type: 'project' | 'client' | 'folder' | 'file' | 'upload' | 'reports') => {
    if (type === 'client') {
      setShowCreateClient(true);
    } else if (type === 'project') {
      // Get selected client if any
      if (selectedItem.type === 'client') {
        setSelectedClientId(selectedItem.id);
      }
      setShowCreateProject(true);
    } else if (selectedItem.type === 'project' || selectedItem.type === 'folder') {
      const projectId = selectedItem.type === 'project' ? selectedItem.id : selectedProjectId;
      const folderId = selectedItem.type === 'folder' ? selectedItem.id : null;
      
      setSelectedProjectId(projectId);
      setSelectedFolderId(folderId);
      
      if (type === 'folder') setShowCreateFolder(true);
      else if (type === 'file') setShowCreateFile(true);
      else if (type === 'upload') setShowUploadFile(true);
      else if (type === 'reports') setShowReportsUpload(true);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowEditClient(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Actions bar */}
      <div className="px-3 pb-2 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {t.ui?.newItem || 'New Item'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => handleAddNew('client')}>
              <Building2 className="h-4 w-4 mr-2" />
              {t.ui?.newClient || 'New Client'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddNew('project')}>
              <FolderPlus className="h-4 w-4 mr-2" />
              {t.dashboard.newProject}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {selectedItem.id && (
              <>
                <DropdownMenuItem onClick={() => handleAddNew('folder')}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  {t.dashboard.newFolder}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNew('file')}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  {t.dashboard.newFile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNew('upload')}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t.dashboard.uploadFile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNew('reports')}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t.ui?.reportsUpload || 'Reports Upload'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Projects tree */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 overscroll-contain">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {t.common.loading}
          </div>
        ) : loadError ? (
          <div className="py-4">
            <EmptyStateError
              title={t.ui?.failedToLoadProjects || 'Failed to load projects'}
              error={loadError}
              onRetry={fetchProjects}
            />
          </div>
        ) : clients.length === 0 && orphanProjects.length === 0 && sharedProjects.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm px-4">
            {t.dashboard.noProjects}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Clients with their projects */}
            {clients.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {t.ui?.clients || 'Clients'}
                </h3>
                <div className="space-y-1">
                  {clients.map((client) => (
                    <ClientNode
                      key={client.id}
                      client={client}
                      onSelectItem={onSelectItem}
                      selectedItem={selectedItem}
                      onSetSelectedProject={setSelectedProjectId}
                      onRefresh={onRefresh}
                      refreshTrigger={refreshTrigger}
                      onEditClient={handleEditClient}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Orphan Projects (without client) */}
            {orphanProjects.length > 0 && (
              <div>
                {clients.length > 0 && <Separator className="my-2" />}
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {t.ui?.myData || 'My Data'}
                </h3>
                <div className="space-y-1">
                  {orphanProjects.map((project) => (
                    <ProjectTree
                      key={project.id}
                      project={project}
                      onSelectItem={onSelectItem}
                      selectedItem={selectedItem}
                      onSetSelectedProject={setSelectedProjectId}
                      onRefresh={onRefresh}
                      refreshTrigger={refreshTrigger}
                      isShared={false}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {sharedProjects.length > 0 && (
              <div>
                <Separator className="my-2" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {t.ui?.sharedData || 'Shared Data'}
                </h3>
                <div className="space-y-1">
                  {sharedProjects.map((project) => (
                    <ProjectTree
                      key={project.id}
                      project={project}
                      onSelectItem={onSelectItem}
                      selectedItem={selectedItem}
                      onSetSelectedProject={setSelectedProjectId}
                      onRefresh={onRefresh}
                      refreshTrigger={refreshTrigger}
                      isShared={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onSuccess={handleCreateSuccess}
      />
      <EditClientDialog
        open={showEditClient}
        onOpenChange={setShowEditClient}
        client={editingClient}
        onSuccess={handleCreateSuccess}
      />
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={handleCreateSuccess}
        clientId={selectedClientId}
      />
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        projectId={selectedProjectId}
        parentFolderId={selectedFolderId}
        onSuccess={handleCreateSuccess}
      />
      <CreateFileDialog
        open={showCreateFile}
        onOpenChange={setShowCreateFile}
        projectId={selectedProjectId}
        folderId={selectedFolderId}
        onSuccess={handleCreateSuccess}
      />
      <UploadFileDialog
        open={showUploadFile}
        onOpenChange={setShowUploadFile}
        projectId={selectedProjectId}
        folderId={selectedFolderId}
        onSuccess={handleCreateSuccess}
      />
      <ReportsUploadDialog
        projectId={selectedProjectId}
        folderId={selectedFolderId}
        onSuccess={handleCreateSuccess}
        open={showReportsUpload}
        onOpenChange={setShowReportsUpload}
        trigger={<span className="hidden" />}
      />
    </div>
  );
}
