-- Add is_locked field to folders table
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Add is_locked field to files table  
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Create a function to check if a folder can be modified (not locked)
CREATE OR REPLACE FUNCTION check_folder_not_locked()
RETURNS TRIGGER AS $$
BEGIN
  -- For DELETE operations, check if the folder being deleted is locked
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_locked = true THEN
      RAISE EXCEPTION 'Cannot delete a locked folder';
    END IF;
    RETURN OLD;
  END IF;
  
  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- If folder is locked, only allow updating is_locked field (to unlock)
    IF OLD.is_locked = true AND NEW.is_locked = true THEN
      -- Check if trying to change name or parent_id
      IF OLD.name != NEW.name OR OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        RAISE EXCEPTION 'Cannot rename or move a locked folder';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if a file can be modified (not locked)
CREATE OR REPLACE FUNCTION check_file_not_locked()
RETURNS TRIGGER AS $$
BEGIN
  -- For DELETE operations, check if the file being deleted is locked
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_locked = true THEN
      RAISE EXCEPTION 'Cannot delete a locked file';
    END IF;
    RETURN OLD;
  END IF;
  
  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- If file is locked, only allow updating content and is_locked field
    IF OLD.is_locked = true AND NEW.is_locked = true THEN
      -- Check if trying to change name or folder_id
      IF OLD.name != NEW.name OR OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
        RAISE EXCEPTION 'Cannot rename or move a locked file';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for folder lock checks
DROP TRIGGER IF EXISTS check_folder_lock_trigger ON public.folders;
CREATE TRIGGER check_folder_lock_trigger
  BEFORE UPDATE OR DELETE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION check_folder_not_locked();

-- Create triggers for file lock checks  
DROP TRIGGER IF EXISTS check_file_lock_trigger ON public.files;
CREATE TRIGGER check_file_lock_trigger
  BEFORE UPDATE OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION check_file_not_locked();

-- Also prevent deleting files inside locked folders
CREATE OR REPLACE FUNCTION check_parent_folder_not_locked()
RETURNS TRIGGER AS $$
DECLARE
  parent_locked BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Check if the file's parent folder is locked
    IF OLD.folder_id IS NOT NULL THEN
      SELECT is_locked INTO parent_locked FROM public.folders WHERE id = OLD.folder_id;
      IF parent_locked = true THEN
        RAISE EXCEPTION 'Cannot delete files from a locked folder';
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- If moving file out of a locked folder, prevent it
    IF OLD.folder_id IS NOT NULL AND OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      SELECT is_locked INTO parent_locked FROM public.folders WHERE id = OLD.folder_id;
      IF parent_locked = true THEN
        RAISE EXCEPTION 'Cannot move files out of a locked folder';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_file_parent_lock_trigger ON public.files;
CREATE TRIGGER check_file_parent_lock_trigger
  BEFORE UPDATE OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION check_parent_folder_not_locked();

-- Prevent deleting subfolders from locked parent folders
CREATE OR REPLACE FUNCTION check_parent_folder_not_locked_for_folders()
RETURNS TRIGGER AS $$
DECLARE
  parent_locked BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NOT NULL THEN
      SELECT is_locked INTO parent_locked FROM public.folders WHERE id = OLD.parent_id;
      IF parent_locked = true THEN
        RAISE EXCEPTION 'Cannot delete folders from a locked parent folder';
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- If moving folder out of a locked parent, prevent it
    IF OLD.parent_id IS NOT NULL AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
      SELECT is_locked INTO parent_locked FROM public.folders WHERE id = OLD.parent_id;
      IF parent_locked = true THEN
        RAISE EXCEPTION 'Cannot move folders out of a locked parent folder';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_folder_parent_lock_trigger ON public.folders;
CREATE TRIGGER check_folder_parent_lock_trigger
  BEFORE UPDATE OR DELETE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION check_parent_folder_not_locked_for_folders();
