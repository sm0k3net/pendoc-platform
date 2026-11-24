import { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, FileText, FileCode, Plus, MoreHorizontal, FolderPlus, Upload, Trash2, Edit, Share2, Download, Bug, FileOutput, Users, ImageIcon, Lock, LockOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectedItem } from '@/pages/Dashboard';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from '@/components/ui/label';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CreateProjectDialog } from './dialogs/CreateProjectDialog';
import { CreateFolderDialog } from './dialogs/CreateFolderDialog';
import { CreateFileDialog } from './dialogs/CreateFileDialog';
import { UploadFileDialog } from './dialogs/UploadFileDialog';
import { ShareDialog } from './dialogs/ShareDialog';
import { RenameDialog } from './dialogs/RenameDialog';
import { ExportProjectDialog } from './ExportProjectDialog';
import { SubmitVulnerabilityDialog } from './dialogs/SubmitVulnerabilityDialog';
import { GenerateReportDialog } from './dialogs/GenerateReportDialog';
import { VulnerabilityDatabaseNode } from './VulnerabilityDatabaseNode';
import { ReportRegistryNode } from './ReportRegistryNode';

type TreeItemType = 'file' | 'folder';
type TreeItemKey = `${TreeItemType}:${string}`;

type DragPayloadV1 = { type: TreeItemType; id: string; isLocked?: boolean };
type DragPayloadV2 = { items: DragPayloadV1[] };

type FlatFolder = { id: string; name: string; parent_id: string | null };

const ROOT_DESTINATION_VALUE = '__root__';

function makeTreeKey(type: TreeItemType, id: string): TreeItemKey {
  return `${type}:${id}`;
}

function parseDragPayload(raw: string): DragPayloadV1[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as DragPayloadV2).items)
  ) {
    return (parsed as DragPayloadV2).items
      .filter((it) => it && typeof it === 'object')
      .map((it) => ({
        type: (it as DragPayloadV1).type,
        id: (it as DragPayloadV1).id,
        isLocked: (it as DragPayloadV1).isLocked,
      }))
      .filter((it) => (it.type === 'file' || it.type === 'folder') && typeof it.id === 'string');
  }

  if (parsed && typeof parsed === 'object') {
    const v1 = parsed as DragPayloadV1;
    if ((v1.type === 'file' || v1.type === 'folder') && typeof v1.id === 'string') {
      return [{ type: v1.type, id: v1.id, isLocked: v1.isLocked }];
    }
  }

  return [];
}

type SelectionContextValue = {
  selectedKeys: Set<TreeItemKey>;
  isKeySelected: (key: TreeItemKey) => boolean;
  onItemClick: (e: React.MouseEvent, item: { type: TreeItemType; id: string; name: string }) => void;
  getDragItemsForKey: (key: TreeItemKey, fallback: DragPayloadV1) => DragPayloadV1[];
  clearSelection: () => void;
  ensureKeySelected: (
    e: React.MouseEvent,
    item: { type: TreeItemType; id: string; name: string },
  ) => void;
  openBulkMoveDialog: () => void;
  openBulkDeleteDialog: () => void;
};

const TreeSelectionContext = createContext<SelectionContextValue | null>(null);

function useTreeSelection() {
  const value = useContext(TreeSelectionContext);
  if (!value) throw new Error('useTreeSelection must be used within ProjectTree');
  return value;
}
interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id?: string;
}

interface FolderData {
  id: string;
  name: string;
  parent_id: string | null;
  user_id?: string;
  is_locked?: boolean;
}

interface FileData {
  id: string;
  name: string;
  file_type: string;
  mime_type: string | null;
  folder_id?: string | null;
  project_id?: string;
  user_id?: string;
  is_locked?: boolean;
}

interface ProjectTreeProps {
  project: Project;
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  onSetSelectedProject: (id: string) => void;
  onRefresh: () => void;
  refreshTrigger: number;
  isShared?: boolean;
}

export function ProjectTree({ project, onSelectItem, selectedItem, onSetSelectedProject, onRefresh, refreshTrigger, isShared = false }: ProjectTreeProps) {
  const [expanded, setExpanded] = useState(false);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [rootDropZoneActive, setRootDropZoneActive] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<TreeItemKey>>(() => new Set());
  const itemMetaRef = useRef<Map<TreeItemKey, DragPayloadV1>>(new Map());
    const registerMeta = useCallback((meta: DragPayloadV1) => {
      itemMetaRef.current.set(makeTreeKey(meta.type, meta.id), meta);
    }, []);

  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveDestination, setBulkMoveDestination] = useState<string>(ROOT_DESTINATION_VALUE);
  const [allProjectFolders, setAllProjectFolders] = useState<FlatFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const folderOptions = useMemo(() => {
    const childrenByParent = new Map<string | null, FlatFolder[]>();
    for (const f of allProjectFolders) {
      const key = f.parent_id ?? null;
      const arr = childrenByParent.get(key);
      if (arr) arr.push(f);
      else childrenByParent.set(key, [f]);
    }
    for (const [key, arr] of childrenByParent) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
      childrenByParent.set(key, arr);
    }

    const options: Array<{ id: string; label: string }> = [];
    const walk = (parentId: string | null, depth: number) => {
      const children = childrenByParent.get(parentId ?? null) ?? [];
      for (const child of children) {
        const prefix = depth > 0 ? `${'—'.repeat(depth)} ` : '';
        options.push({ id: child.id, label: `${prefix}${child.name}` });
        walk(child.id, depth + 1);
      }
    };
    walk(null, 0);
    return options;
  }, [allProjectFolders]);

  const fetchAllProjectFolders = useCallback(async () => {
    if (foldersLoading) return;
    setFoldersLoading(true);
    const { data, error } = await supabase
      .from('folders')
      .select('id, name, parent_id')
      .eq('project_id', project.id);

    if (error) {
      toast({ title: 'Error loading folders', description: error.message, variant: 'destructive' });
      setAllProjectFolders([]);
    } else {
      setAllProjectFolders((data ?? []) as FlatFolder[]);
    }
    setFoldersLoading(false);
  }, [foldersLoading, project.id, toast]);

  const getSelectedItems = useCallback(() => {
    const items: Array<{ type: TreeItemType; id: string }> = [];
    for (const key of selectedKeys) {
      const [type, id] = key.split(':');
      if ((type === 'file' || type === 'folder') && id) {
        items.push({ type: type as TreeItemType, id });
      }
    }
    return items;
  }, [selectedKeys]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const openBulkMoveDialog = useCallback(async () => {
    await fetchAllProjectFolders();
    setBulkMoveDestination(ROOT_DESTINATION_VALUE);
    setBulkMoveOpen(true);
  }, [fetchAllProjectFolders]);

  const openBulkDeleteDialog = useCallback(() => {
    setBulkDeleteOpen(true);
  }, []);

  const bulkMoveSelected = useCallback(
    async (destinationFolderId: string | null) => {
      if (bulkWorking) return;
      setBulkWorking(true);

      try {
        const selected = getSelectedItems();
        const fileIds = selected.filter((s) => s.type === 'file').map((s) => s.id);
        const folderIds = selected.filter((s) => s.type === 'folder').map((s) => s.id);

        const parentById = new Map<string, string | null>(allProjectFolders.map((f) => [f.id, f.parent_id]));
        const isCircularMove = (movingFolderId: string, destId: string | null) => {
          if (!destId) return false;
          if (destId === movingFolderId) return true;
          let current: string | null = destId;
          while (current) {
            if (current === movingFolderId) return true;
            current = parentById.get(current) ?? null;
          }
          return false;
        };

        const [{ data: filesData, error: filesError }, { data: foldersData, error: foldersError }] = await Promise.all([
          fileIds.length
            ? supabase
                .from('files')
                .select('id, name, folder_id, is_locked')
                .in('id', fileIds)
            : Promise.resolve({ data: [], error: null } as any),
          folderIds.length
            ? supabase
                .from('folders')
                .select('id, name, parent_id, is_locked')
                .in('id', folderIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        if (filesError) throw filesError;
        if (foldersError) throw foldersError;

        let moved = 0;
        let skippedLocked = 0;
        let skippedDuplicate = 0;
        let skippedNoop = 0;
        let skippedInvalid = 0;
        let errors = 0;

        const filesToMove = (filesData ?? []) as Array<{ id: string; name: string; folder_id: string | null; is_locked?: boolean }>;
        for (const f of filesToMove) {
          if (f.is_locked) {
            skippedLocked++;
            continue;
          }

          if ((f.folder_id ?? null) === (destinationFolderId ?? null)) {
            skippedNoop++;
            continue;
          }

          const dupQuery = supabase
            .from('files')
            .select('id')
            .eq('project_id', project.id)
            .eq('name', f.name)
            .neq('id', f.id)
            .limit(1);

          const { data: dup } = destinationFolderId
            ? await dupQuery.eq('folder_id', destinationFolderId)
            : await dupQuery.is('folder_id', null);

          if (dup && dup.length > 0) {
            skippedDuplicate++;
            continue;
          }

          const { error } = await supabase.from('files').update({ folder_id: destinationFolderId }).eq('id', f.id);
          if (error) errors++;
          else moved++;
        }

        const foldersToMove = (foldersData ?? []) as Array<{ id: string; name: string; parent_id: string | null; is_locked?: boolean }>;
        for (const f of foldersToMove) {
          if (f.is_locked) {
            skippedLocked++;
            continue;
          }

          if (destinationFolderId && isCircularMove(f.id, destinationFolderId)) {
            skippedInvalid++;
            continue;
          }

          if ((f.parent_id ?? null) === (destinationFolderId ?? null)) {
            skippedNoop++;
            continue;
          }

          const dupQuery = supabase
            .from('folders')
            .select('id')
            .eq('project_id', project.id)
            .eq('name', f.name)
            .neq('id', f.id)
            .limit(1);

          const { data: dup } = destinationFolderId
            ? await dupQuery.eq('parent_id', destinationFolderId)
            : await dupQuery.is('parent_id', null);

          if (dup && dup.length > 0) {
            skippedDuplicate++;
            continue;
          }

          const { error } = await supabase.from('folders').update({ parent_id: destinationFolderId }).eq('id', f.id);
          if (error) errors++;
          else moved++;
        }

        if (moved > 0) {
          toast({
            title: `Moved ${moved} item${moved === 1 ? '' : 's'}`,
            description:
              skippedLocked || skippedDuplicate || skippedNoop || skippedInvalid || errors
                ? `Skipped: ${skippedLocked} locked, ${skippedDuplicate} duplicate, ${skippedNoop} already there, ${skippedInvalid} invalid. Errors: ${errors}.`
                : undefined,
          });
          setBulkMoveOpen(false);
          clearSelection();
          onRefresh();
        } else {
          toast({
            title: 'No items moved',
            description: `Skipped: ${skippedLocked} locked, ${skippedDuplicate} duplicate, ${skippedNoop} already there, ${skippedInvalid} invalid. Errors: ${errors}.`,
            variant: errors ? 'destructive' : undefined,
          });
        }
      } catch (err: any) {
        toast({ title: 'Bulk move failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
      } finally {
        setBulkWorking(false);
      }
    },
    [
      allProjectFolders,
      bulkWorking,
      clearSelection,
      getSelectedItems,
      onRefresh,
      project.id,
      toast,
    ],
  );

  const bulkDeleteSelected = useCallback(async () => {
    if (bulkWorking) return;
    setBulkWorking(true);

    try {
      const selected = getSelectedItems();
      const fileIds = selected.filter((s) => s.type === 'file').map((s) => s.id);
      const folderIds = selected.filter((s) => s.type === 'folder').map((s) => s.id);

      const [{ data: filesData, error: filesError }, { data: foldersData, error: foldersError }] = await Promise.all([
        fileIds.length
          ? supabase.from('files').select('id, is_locked').in('id', fileIds)
          : Promise.resolve({ data: [], error: null } as any),
        folderIds.length
          ? supabase.from('folders').select('id, is_locked').in('id', folderIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (filesError) throw filesError;
      if (foldersError) throw foldersError;

      const deletableFileIds = ((filesData ?? []) as Array<{ id: string; is_locked?: boolean }>).filter((f) => !f.is_locked).map((f) => f.id);
      const deletableFolderIds = ((foldersData ?? []) as Array<{ id: string; is_locked?: boolean }>).filter((f) => !f.is_locked).map((f) => f.id);
      const lockedCount =
        ((filesData ?? []) as Array<{ id: string; is_locked?: boolean }>).filter((f) => f.is_locked).length +
        ((foldersData ?? []) as Array<{ id: string; is_locked?: boolean }>).filter((f) => f.is_locked).length;

      let deleted = 0;
      let errors = 0;

      if (deletableFileIds.length) {
        const { error } = await supabase.from('files').delete().in('id', deletableFileIds);
        if (error) errors++;
        else deleted += deletableFileIds.length;
      }

      if (deletableFolderIds.length) {
        const { error } = await supabase.from('folders').delete().in('id', deletableFolderIds);
        if (error) errors++;
        else deleted += deletableFolderIds.length;
      }

      if (deleted > 0) {
        toast({
          title: `Deleted ${deleted} item${deleted === 1 ? '' : 's'}`,
          description: lockedCount || errors ? `Skipped: ${lockedCount} locked. Errors: ${errors}.` : undefined,
        });
        setBulkDeleteOpen(false);
        clearSelection();
        onRefresh();
      } else {
        toast({
          title: 'No items deleted',
          description: `Skipped: ${lockedCount} locked. Errors: ${errors}.`,
          variant: errors ? 'destructive' : undefined,
        });
      }
    } catch (err: any) {
      toast({ title: 'Bulk delete failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setBulkWorking(false);
    }
  }, [bulkWorking, clearSelection, getSelectedItems, onRefresh, toast]);

  // Listen for drag end events globally to hide drop zone
  useEffect(() => {
    const handleDragEnd = () => setRootDropZoneActive(false);
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

  useEffect(() => {
    if (expanded) {
      fetchProjectContents();
    }
  }, [expanded, project.id, refreshTrigger]);

  const fetchProjectContents = async () => {
    const { data: foldersData } = await supabase
      .from('folders')
      .select('*')
      .eq('project_id', project.id)
      .is('parent_id', null)
      .order('name');

    const { data: filesData } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', project.id)
      .is('folder_id', null)
      .order('name');

    setFolders(foldersData || []);
    setFiles(filesData || []);
  };

  const handleProjectClick = () => {
    setSelectedKeys(new Set());
    onSelectItem({ type: 'project', id: project.id, name: project.name });
    onSetSelectedProject(project.id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleDeleteProject = async () => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    if (error) {
      toast({ title: 'Error deleting project', variant: 'destructive' });
    } else {
      toast({ title: 'Project deleted' });
      onRefresh();
    }
  };

  const handleCreateRawExportsFolder = async () => {
    if (!user) {
      toast({ title: 'You must be signed in to create folders', variant: 'destructive' });
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from('folders')
      .select('id')
      .eq('project_id', project.id)
      .is('parent_id', null)
      .ilike('name', 'raw exports')
      .limit(1);

    if (existingError) {
      toast({ title: 'Error checking folders', description: existingError.message, variant: 'destructive' });
      return;
    }

    if (existing && existing.length > 0) {
      toast({ title: 'Raw Exports folder already exists' });
      return;
    }

    const { error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        project_id: project.id,
        parent_id: null,
        name: 'Raw Exports',
      });

    if (error) {
      toast({ title: 'Error creating folder', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Raw Exports folder created' });
    onRefresh();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setRootDropZoneActive(false);

    const dragData = e.dataTransfer.getData('application/json');
    const items = parseDragPayload(dragData);
    if (items.length === 0) return;

    let moved = 0;
    let skippedLocked = 0;
    let skippedDuplicate = 0;
    let skippedNoop = 0;
    let errors = 0;

    for (const item of items) {
      if (item.isLocked) {
        skippedLocked++;
        continue;
      }

      if (item.type === 'file') {
        const { data: existingFile, error: fetchError } = await supabase
          .from('files')
          .select('id, name, folder_id')
          .eq('id', item.id)
          .single();

        if (fetchError || !existingFile) {
          errors++;
          continue;
        }

        if (existingFile.folder_id === null) {
          skippedNoop++;
          continue;
        }

        const { data: duplicates } = await supabase
          .from('files')
          .select('id')
          .eq('project_id', project.id)
          .is('folder_id', null)
          .eq('name', existingFile.name)
          .neq('id', item.id);

        if (duplicates && duplicates.length > 0) {
          skippedDuplicate++;
          continue;
        }

        const { error } = await supabase
          .from('files')
          .update({ folder_id: null })
          .eq('id', item.id);

        if (error) {
          errors++;
        } else {
          moved++;
        }
      } else if (item.type === 'folder') {
        const { data: existingFolder, error: fetchError } = await supabase
          .from('folders')
          .select('id, name, parent_id')
          .eq('id', item.id)
          .single();

        if (fetchError || !existingFolder) {
          errors++;
          continue;
        }

        if (existingFolder.parent_id === null) {
          skippedNoop++;
          continue;
        }

        const { data: duplicates } = await supabase
          .from('folders')
          .select('id')
          .eq('project_id', project.id)
          .is('parent_id', null)
          .eq('name', existingFolder.name)
          .neq('id', item.id);

        if (duplicates && duplicates.length > 0) {
          skippedDuplicate++;
          continue;
        }

        const { error } = await supabase
          .from('folders')
          .update({ parent_id: null })
          .eq('id', item.id);

        if (error) {
          errors++;
        } else {
          moved++;
        }
      }
    }

    if (moved > 0) {
      toast({
        title: `Moved ${moved} item${moved === 1 ? '' : 's'} to project root`,
        description:
          skippedLocked || skippedDuplicate || skippedNoop || errors
            ? `Skipped: ${skippedLocked} locked, ${skippedDuplicate} duplicate, ${skippedNoop} already in root. Errors: ${errors}.`
            : undefined,
      });
      onRefresh();
    } else {
      toast({
        title: 'No items moved',
        description: `Skipped: ${skippedLocked} locked, ${skippedDuplicate} duplicate, ${skippedNoop} already in root. Errors: ${errors}.`,
        variant: errors ? 'destructive' : undefined,
      });
    }
  };

  const isKeySelected = useCallback(
    (key: TreeItemKey) => selectedKeys.has(key),
    [selectedKeys]
  );

  const onItemClick = useCallback(
    (e: React.MouseEvent, item: { type: TreeItemType; id: string; name: string }) => {
      const key = makeTreeKey(item.type, item.id);
      const isToggle = e.metaKey || e.ctrlKey;
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (isToggle) {
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        }
        return new Set([key]);
      });
      // Keep the existing single-item selection in sync (used by the main panel)
      onSelectItem({ type: item.type, id: item.id, name: item.name });
    },
    [onSelectItem],
  );

  const ensureKeySelected = useCallback(
    (e: React.MouseEvent, item: { type: TreeItemType; id: string; name: string }) => {
      const key = makeTreeKey(item.type, item.id);
      if (selectedKeys.has(key)) return;
      onItemClick(e, item);
    },
    [onItemClick, selectedKeys],
  );

  const getDragItemsForKey = useCallback(
    (key: TreeItemKey, fallback: DragPayloadV1) => {
      if (selectedKeys.has(key) && selectedKeys.size > 0) {
        const items: DragPayloadV1[] = [];
        for (const k of selectedKeys) {
          const meta = itemMetaRef.current.get(k);
          if (meta) items.push(meta);
        }
        // Ensure the dragged item is included even if meta wasn't registered yet
        if (!items.some((it) => it.type === fallback.type && it.id === fallback.id)) {
          items.push(fallback);
        }
        return items;
      }

      // If user drags an unselected item, treat it as a single-item drag.
      setSelectedKeys(new Set([key]));
      return [fallback];
    },
    [selectedKeys],
  );

  const selectionContextValue = useMemo<SelectionContextValue>(
    () => ({
      selectedKeys,
      isKeySelected,
      onItemClick,
      getDragItemsForKey,
      clearSelection,
      ensureKeySelected,
      openBulkMoveDialog,
      openBulkDeleteDialog,
    }),
    [
      selectedKeys,
      isKeySelected,
      onItemClick,
      getDragItemsForKey,
      clearSelection,
      ensureKeySelected,
      openBulkMoveDialog,
      openBulkDeleteDialog,
    ],
  );

  const isSelected = selectedItem.type === 'project' && selectedItem.id === project.id;
  const isOwner = user?.id === project.user_id;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start text-sm h-8 font-medium',
              isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
              dragOver && 'bg-primary/10 border-2 border-dashed border-primary'
            )}
            onClick={handleProjectClick}
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
            {expanded ? (
              <FolderOpen className="h-4 w-4 mr-2 ml-1 text-primary shrink-0" />
            ) : (
              <Folder className="h-4 w-4 mr-2 ml-1 text-primary shrink-0" />
            )}
            <span className="truncate flex-1 text-left">{project.name}</span>
            {isShared && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                <Users className="h-3 w-3 mr-1" />
                Shared
              </Badge>
            )}
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isOwner && (
            <>
              <SubmitVulnerabilityDialog
                projectId={project.id}
                projectName={project.name}
                onSuccess={onRefresh}
                trigger={
                  <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                    <Bug className="h-4 w-4 mr-2 text-warning" />
                    Submit Vulnerability
                  </ContextMenuItem>
                }
              />
              <ShareDialog
                resourceType="project"
                resourceId={project.id}
                resourceName={project.name}
                trigger={
                  <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </ContextMenuItem>
                }
              />
              <ExportProjectDialog
                projectId={project.id}
                projectName={project.name}
                trigger={
                  <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </ContextMenuItem>
                }
              />
              <GenerateReportDialog
                projectId={project.id}
                projectName={project.name}
                onSuccess={onRefresh}
                trigger={
                  <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                    <FileOutput className="h-4 w-4 mr-2 text-primary" />
                    Generate Report
                  </ContextMenuItem>
                }
              />
              <ContextMenuItem onClick={handleCreateRawExportsFolder}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Raw Exports Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => setRenameDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDeleteProject} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {expanded && (
        <TreeSelectionContext.Provider value={selectionContextValue}>
        <div className="ml-4 border-l border-sidebar-border pl-2">
          <VulnerabilityDatabaseNode
            projectId={project.id}
            onSelectItem={onSelectItem}
            selectedItem={selectedItem}
            onRefresh={onRefresh}
            refreshTrigger={refreshTrigger}
            onOpenDashboard={() => onSelectItem({ type: 'vulnerabilities_dashboard', id: project.id, name: 'Vulnerabilities Dashboard' })}
          />
          <ReportRegistryNode
            projectId={project.id}
            onSelectItem={onSelectItem}
            selectedItem={selectedItem}
            onRefresh={onRefresh}
            refreshTrigger={refreshTrigger}
            onOpenDashboard={() => onSelectItem({ type: 'reports_dashboard', id: 'reports', name: 'Reports Dashboard' })}
          />
          {folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              projectId={project.id}
              onSelectItem={onSelectItem}
              selectedItem={selectedItem}
              onRefresh={onRefresh}
              refreshTrigger={refreshTrigger}
              onSetRootDropZone={setRootDropZoneActive}
              registerMeta={registerMeta}
            />
          ))}
          {files.map((file) => (
            <FileNode
              key={file.id}
              file={file}
              onSelectItem={onSelectItem}
              selectedItem={selectedItem}
              onRefresh={onRefresh}
              onSetRootDropZone={setRootDropZoneActive}
              registerMeta={registerMeta}
            />
          ))}
          {/* Drop zone for moving items to project root */}
          {rootDropZoneActive && (folders.length > 0 || files.length > 0) && (
            <div
              className={cn(
                'mt-1 p-2 rounded border-2 border-dashed text-xs text-center transition-colors',
                dragOver 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragLeave={(e) => { e.stopPropagation(); setDragOver(false); }}
              onDrop={handleDrop}
            >
              ⬆ Move to project root
            </div>
          )}
        </div>

        {bulkMoveOpen && (
          <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move selected items</DialogTitle>
                <DialogDescription>
                  Move {selectedKeys.size} item{selectedKeys.size === 1 ? '' : 's'} to a destination folder.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label>Destination</Label>
                <Select value={bulkMoveDestination} onValueChange={setBulkMoveDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_DESTINATION_VALUE}>Project root</SelectItem>
                    {folderOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBulkMoveOpen(false)}
                  disabled={bulkWorking}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const dest = bulkMoveDestination === ROOT_DESTINATION_VALUE ? null : bulkMoveDestination;
                    await bulkMoveSelected(dest);
                  }}
                  disabled={bulkWorking || foldersLoading}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {bulkDeleteOpen && (
          <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete selected items?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete {selectedKeys.size} item{selectedKeys.size === 1 ? '' : 's'}. Locked items will be skipped.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={bulkWorking}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async (e) => {
                    e.preventDefault();
                    await bulkDeleteSelected();
                  }}
                  disabled={bulkWorking}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        </TreeSelectionContext.Provider>
      )}

      {/* Dialogs */}
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        resourceType="project"
        resourceId={project.id}
        currentName={project.name}
        onSuccess={onRefresh}
      />
    </div>
  );
}

function FolderNode({ 
  folder, 
  projectId, 
  onSelectItem, 
  selectedItem,
  onRefresh,
  refreshTrigger,
  onSetRootDropZone,
  registerMeta,
}: { 
  folder: FolderData; 
  projectId: string;
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  onRefresh: () => void;
  refreshTrigger: number;
  onSetRootDropZone?: (active: boolean) => void;
  registerMeta: (meta: DragPayloadV1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subFolders, setSubFolders] = useState<FolderData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [uploadFileDialogOpen, setUploadFileDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const selection = useTreeSelection();

  useEffect(() => {
    registerMeta({ type: 'folder', id: folder.id, isLocked: folder.is_locked });
  }, [registerMeta, folder.id, folder.is_locked]);

  useEffect(() => {
    if (expanded) {
      fetchFolderContents();
    }
  }, [expanded, folder.id, refreshTrigger]);

  const fetchFolderContents = async () => {
    const { data: foldersData } = await supabase
      .from('folders')
      .select('*')
      .eq('parent_id', folder.id)
      .eq('project_id', projectId)
      .order('name');

    const { data: filesData } = await supabase
      .from('files')
      .select('*')
      .eq('folder_id', folder.id)
      .eq('project_id', projectId)
      .order('name');

    setSubFolders(foldersData || []);
    setFiles(filesData || []);
  };

  const handleClick = (e: React.MouseEvent) => {
    selection.onItemClick(e, { type: 'folder', id: folder.id, name: folder.name });
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleDelete = async () => {
    if (folder.is_locked) {
      toast({ title: 'Cannot delete locked folder', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folder.id);

    if (error) {
      toast({ title: 'Error deleting folder', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Folder deleted' });
      onRefresh();
    }
  };

  const handleToggleLock = async () => {
    const { error } = await supabase
      .from('folders')
      .update({ is_locked: !folder.is_locked })
      .eq('id', folder.id);

    if (error) {
      toast({ title: 'Error updating folder', variant: 'destructive' });
    } else {
      toast({ title: folder.is_locked ? 'Folder unlocked' : 'Folder locked' });
      onRefresh();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const dragData = e.dataTransfer.getData('application/json');
    const items = parseDragPayload(dragData);
    if (items.length === 0) return;

    let moved = 0;
    let skippedLocked = 0;
    let skippedDuplicate = 0;
    let skippedNoop = 0;
    let skippedInvalid = 0;
    let errors = 0;

    for (const item of items) {
      if (item.id === folder.id) {
        skippedInvalid++;
        continue;
      }

      if (item.isLocked) {
        skippedLocked++;
        continue;
      }

      if (item.type === 'file') {
        const { data: existingFile, error: fetchError } = await supabase
          .from('files')
          .select('id, name, folder_id')
          .eq('id', item.id)
          .single();

        if (fetchError || !existingFile) {
          errors++;
          continue;
        }

        if (existingFile.folder_id === folder.id) {
          skippedNoop++;
          continue;
        }

        const { data: duplicates } = await supabase
          .from('files')
          .select('id')
          .eq('folder_id', folder.id)
          .eq('name', existingFile.name)
          .neq('id', item.id);

        if (duplicates && duplicates.length > 0) {
          skippedDuplicate++;
          continue;
        }

        const { error } = await supabase
          .from('files')
          .update({ folder_id: folder.id })
          .eq('id', item.id);

        if (error) {
          errors++;
        } else {
          moved++;
        }
      } else if (item.type === 'folder') {
        const { data: existingFolder, error: fetchError } = await supabase
          .from('folders')
          .select('id, name, parent_id')
          .eq('id', item.id)
          .single();

        if (fetchError || !existingFolder) {
          errors++;
          continue;
        }

        if (existingFolder.parent_id === folder.id) {
          skippedNoop++;
          continue;
        }

        // Prevent circular references: don't move a folder into its descendant
        let currentParentId: string | null = folder.id;
        let isCircular = false;
        while (currentParentId) {
          if (currentParentId === item.id) {
            isCircular = true;
            break;
          }
          const { data: parentFolder } = await supabase
            .from('folders')
            .select('parent_id')
            .eq('id', currentParentId)
            .single();
          currentParentId = parentFolder?.parent_id || null;
        }
        if (isCircular) {
          skippedInvalid++;
          continue;
        }

        const { data: duplicates } = await supabase
          .from('folders')
          .select('id')
          .eq('parent_id', folder.id)
          .eq('name', existingFolder.name)
          .neq('id', item.id);

        if (duplicates && duplicates.length > 0) {
          skippedDuplicate++;
          continue;
        }

        const { error } = await supabase
          .from('folders')
          .update({ parent_id: folder.id })
          .eq('id', item.id);

        if (error) {
          errors++;
        } else {
          moved++;
        }
      }
    }

    if (moved > 0) {
      toast({
        title: `Moved ${moved} item${moved === 1 ? '' : 's'} to "${folder.name}"`,
        description:
          skippedLocked || skippedDuplicate || skippedNoop || skippedInvalid || errors
            ? `Skipped: ${skippedLocked} locked, ${skippedDuplicate} duplicate, ${skippedNoop} already there, ${skippedInvalid} invalid. Errors: ${errors}.`
            : undefined,
      });
      onRefresh();
    } else {
      toast({
        title: 'No items moved',
        description: `Skipped: ${skippedLocked} locked, ${skippedDuplicate} duplicate, ${skippedNoop} already there, ${skippedInvalid} invalid. Errors: ${errors}.`,
        variant: errors ? 'destructive' : undefined,
      });
    }
  };

  const isSelected = selection.isKeySelected(makeTreeKey('folder', folder.id)) || (selectedItem.type === 'folder' && selectedItem.id === folder.id);
  const isOwner = user?.id === folder.user_id;
  const key = makeTreeKey('folder', folder.id);
  const isBulkContext = selection.selectedKeys.size > 1 && selection.isKeySelected(key);

  // Handler for folder drag - separate from file drag
  const handleFolderDragStart = (e: React.DragEvent) => {
    if (folder.is_locked) {
      e.preventDefault();
      return;
    }

    const key = makeTreeKey('folder', folder.id);
    const items = selection.getDragItemsForKey(key, { type: 'folder', id: folder.id, isLocked: folder.is_locked });
    e.dataTransfer.setData('application/json', JSON.stringify({ items }));
    e.dataTransfer.effectAllowed = 'move';
    onSetRootDropZone?.(true);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
      onDragLeave={(e) => { e.stopPropagation(); setDragOver(false); }}
      onDrop={handleDrop}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <Button
            variant="ghost"
            size="sm"
            draggable={!folder.is_locked}
            onDragStart={handleFolderDragStart}
            onContextMenu={(e) => selection.ensureKeySelected(e, { type: 'folder', id: folder.id, name: folder.name })}
            className={cn(
              'w-full justify-start text-sm h-7',
              isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
              dragOver && 'bg-primary/10 border-2 border-dashed border-primary'
            )}
            onClick={handleClick}
          >
            <span 
              onClick={handleToggleExpand}
              className="shrink-0 cursor-pointer hover:bg-muted rounded p-0.5 -ml-0.5"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
            {expanded ? (
              <FolderOpen className="h-3.5 w-3.5 mr-2 ml-1 text-warning shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 mr-2 ml-1 text-warning shrink-0" />
            )}
            <span className="truncate flex-1 text-left">{folder.name}</span>
            {folder.is_locked && (
              <Lock className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
            )}
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isOwner && (
            <>
              {isBulkContext ? (
                <>
                  <ContextMenuItem onClick={selection.openBulkMoveDialog}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Move to...
                  </ContextMenuItem>
                  <ContextMenuItem onClick={selection.openBulkDeleteDialog} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete selected
                  </ContextMenuItem>
                </>
              ) : (
                <>
              <ContextMenuItem onClick={() => setNewFolderDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setNewFileDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setUploadFileDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={() => setRenameDialogOpen(true)}
                disabled={folder.is_locked}
              >
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={handleToggleLock}>
                {folder.is_locked ? (
                  <>
                    <LockOpen className="h-4 w-4 mr-2" />
                    Unlock Folder
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Lock Folder
                  </>
                )}
              </ContextMenuItem>
              <ShareDialog
                resourceType="folder"
                resourceId={folder.id}
                resourceName={folder.name}
                trigger={
                  <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </ContextMenuItem>
                }
              />
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={handleDelete} 
                className="text-destructive"
                disabled={folder.is_locked}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
                </>
              )}
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Dialogs */}
      <CreateFolderDialog
        open={newFolderDialogOpen}
        onOpenChange={setNewFolderDialogOpen}
        projectId={projectId}
        parentFolderId={folder.id}
        onSuccess={onRefresh}
      />
      <CreateFileDialog
        open={newFileDialogOpen}
        onOpenChange={setNewFileDialogOpen}
        projectId={projectId}
        folderId={folder.id}
        onSuccess={onRefresh}
      />
      <UploadFileDialog
        open={uploadFileDialogOpen}
        onOpenChange={setUploadFileDialogOpen}
        projectId={projectId}
        folderId={folder.id}
        onSuccess={onRefresh}
      />
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        resourceType="folder"
        resourceId={folder.id}
        currentName={folder.name}
        projectId={projectId}
        parentFolderId={folder.parent_id}
        onSuccess={onRefresh}
      />

      {expanded && (
        <div className="ml-4 border-l border-sidebar-border pl-2">
          {subFolders.map((subFolder) => (
            <FolderNode
              key={subFolder.id}
              folder={subFolder}
              projectId={projectId}
              onSelectItem={onSelectItem}
              selectedItem={selectedItem}
              onRefresh={onRefresh}
              refreshTrigger={refreshTrigger}
              onSetRootDropZone={onSetRootDropZone}
              registerMeta={registerMeta}
            />
          ))}
          {files.map((file) => (
            <FileNode
              key={file.id}
              file={file}
              onSelectItem={onSelectItem}
              selectedItem={selectedItem}
              onRefresh={onRefresh}
              onSetRootDropZone={onSetRootDropZone}
              registerMeta={registerMeta}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileNode({ 
  file, 
  onSelectItem, 
  selectedItem,
  onRefresh,
  onSetRootDropZone,
  registerMeta,
}: { 
  file: FileData; 
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  onRefresh: () => void;
  onSetRootDropZone?: (active: boolean) => void;
  registerMeta: (meta: DragPayloadV1) => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const selection = useTreeSelection();

  useEffect(() => {
    registerMeta({ type: 'file', id: file.id, isLocked: file.is_locked });
  }, [registerMeta, file.id, file.is_locked]);

  const getFileIcon = () => {
    if (file.mime_type?.startsWith('image/')) {
      return <ImageIcon className="h-3.5 w-3.5 mr-2 text-accent shrink-0" />;
    }
    if (file.file_type === 'code' || file.name.match(/\.(js|ts|py|php|go|sh|rb|java|c|cpp|h|css|html|xml|json)$/i)) {
      return <FileCode className="h-3.5 w-3.5 mr-2 text-terminal shrink-0" />;
    }
    return <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />;
  };

  const handleClick = (e: React.MouseEvent) => {
    selection.onItemClick(e, { type: 'file', id: file.id, name: file.name });
  };

  const handleDelete = async () => {
    if (file.is_locked) {
      toast({ title: 'Cannot delete locked file', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', file.id);

    if (error) {
      toast({ title: 'Error deleting file', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'File deleted' });
      onRefresh();
    }
  };

  const handleToggleLock = async () => {
    const { error } = await supabase
      .from('files')
      .update({ is_locked: !file.is_locked })
      .eq('id', file.id);

    if (error) {
      toast({ title: 'Error updating file', variant: 'destructive' });
    } else {
      toast({ title: file.is_locked ? 'File unlocked' : 'File locked' });
      onRefresh();
    }
  };

  const isSelected = selection.isKeySelected(makeTreeKey('file', file.id)) || (selectedItem.type === 'file' && selectedItem.id === file.id);
  const isOwner = user?.id === file.user_id;
  const key = makeTreeKey('file', file.id);
  const isBulkContext = selection.selectedKeys.size > 1 && selection.isKeySelected(key);

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start text-sm h-7',
            isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground'
          )}
          onClick={handleClick}
          onContextMenu={(e) => selection.ensureKeySelected(e, { type: 'file', id: file.id, name: file.name })}
          draggable={!file.is_locked}
          onDragStart={(e) => {
            e.stopPropagation(); // Prevent folder from being dragged
            if (file.is_locked) {
              e.preventDefault();
              return;
            }

            const key = makeTreeKey('file', file.id);
            const items = selection.getDragItemsForKey(key, { type: 'file', id: file.id, isLocked: file.is_locked });
            e.dataTransfer.setData('application/json', JSON.stringify({ items }));
            e.dataTransfer.effectAllowed = 'move';
            onSetRootDropZone?.(true);
          }}
        >
          {getFileIcon()}
          <span className="truncate flex-1 text-left">{file.name}</span>
          {file.is_locked && (
            <Lock className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
          )}
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {isOwner && (
          <>
            {isBulkContext ? (
              <>
                <ContextMenuItem onClick={selection.openBulkMoveDialog}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move to...
                </ContextMenuItem>
                <ContextMenuItem onClick={selection.openBulkDeleteDialog} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete selected
                </ContextMenuItem>
              </>
            ) : (
              <>
                <ContextMenuItem 
                  onClick={() => setRenameDialogOpen(true)}
                  disabled={file.is_locked}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={handleToggleLock}>
                  {file.is_locked ? (
                    <>
                      <LockOpen className="h-4 w-4 mr-2" />
                      Unlock File
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Lock File
                    </>
                  )}
                </ContextMenuItem>
                <ShareDialog
                  resourceType="file"
                  resourceId={file.id}
                  resourceName={file.name}
                  trigger={
                    <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </ContextMenuItem>
                  }
                />
                <ContextMenuSeparator />
                <ContextMenuItem 
                  onClick={handleDelete} 
                  className="text-destructive"
                  disabled={file.is_locked}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </ContextMenuItem>
              </>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>

    {/* Dialogs */}
    <RenameDialog
      open={renameDialogOpen}
      onOpenChange={setRenameDialogOpen}
      resourceType="file"
      resourceId={file.id}
      currentName={file.name}
      projectId={file.project_id}
      folderId={file.folder_id}
      onSuccess={onRefresh}
    />
  </>
  );
}
