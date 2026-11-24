-- Migration to fix circular references and recover orphaned files and folders
-- This fixes items that have been "lost" due to circular parent references

-- First, temporarily disable lock triggers to allow fixing orphaned items
DROP TRIGGER IF EXISTS check_folder_lock_trigger ON public.folders;
DROP TRIGGER IF EXISTS check_file_lock_trigger ON public.files;
DROP TRIGGER IF EXISTS check_file_parent_lock_trigger ON public.files;
DROP TRIGGER IF EXISTS check_folder_parent_lock_trigger ON public.folders;

-- Create a function to detect if a folder has a circular reference
CREATE OR REPLACE FUNCTION has_circular_reference(folder_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_id UUID;
  visited_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  current_id := folder_uuid;
  
  WHILE current_id IS NOT NULL LOOP
    -- Check if we've already visited this folder
    IF current_id = ANY(visited_ids) THEN
      RETURN TRUE;
    END IF;
    
    -- Add to visited
    visited_ids := array_append(visited_ids, current_id);
    
    -- Get the parent
    SELECT parent_id INTO current_id FROM public.folders WHERE id = current_id;
  END LOOP;
  
  RETURN FALSE;
END;
$$;

-- Fix all folders with circular references by moving them to project root
UPDATE public.folders f
SET parent_id = NULL
WHERE has_circular_reference(f.id);

-- Now fix folders where parent_id references a non-existent folder
UPDATE public.folders f
SET parent_id = NULL
WHERE f.parent_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.folders p WHERE p.id = f.parent_id);

-- Fix files where folder_id references a non-existent folder
UPDATE public.files f
SET folder_id = NULL
WHERE f.folder_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.folders fo WHERE fo.id = f.folder_id);

-- Clean up the helper function
DROP FUNCTION IF EXISTS has_circular_reference(UUID);

-- Re-enable the lock triggers
CREATE TRIGGER check_folder_lock_trigger
  BEFORE UPDATE OR DELETE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION check_folder_not_locked();

CREATE TRIGGER check_file_lock_trigger
  BEFORE UPDATE OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION check_file_not_locked();

CREATE TRIGGER check_file_parent_lock_trigger
  BEFORE UPDATE OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION check_parent_folder_not_locked();

CREATE TRIGGER check_folder_parent_lock_trigger
  BEFORE UPDATE OR DELETE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION check_parent_folder_not_locked_for_folders();

-- Add a database trigger to PREVENT circular references in the future
CREATE OR REPLACE FUNCTION prevent_circular_folder_reference()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  max_depth INTEGER := 100; -- Prevent infinite loops
  depth INTEGER := 0;
BEGIN
  -- Only check if parent_id is being set
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Can't be your own parent
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A folder cannot be its own parent';
  END IF;
  
  -- Walk up the chain to check for circular reference
  current_id := NEW.parent_id;
  
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Cannot move folder into its own subfolder (circular reference)';
    END IF;
    
    SELECT parent_id INTO current_id FROM public.folders WHERE id = current_id;
    depth := depth + 1;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS prevent_circular_folder_trigger ON public.folders;
CREATE TRIGGER prevent_circular_folder_trigger
  BEFORE INSERT OR UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION prevent_circular_folder_reference();

-- Update foreign key constraints to prevent orphaning
ALTER TABLE public.folders 
DROP CONSTRAINT IF EXISTS folders_parent_id_fkey;

ALTER TABLE public.folders
ADD CONSTRAINT folders_parent_id_fkey 
FOREIGN KEY (parent_id) 
REFERENCES public.folders(id) 
ON DELETE SET NULL;

ALTER TABLE public.files 
DROP CONSTRAINT IF EXISTS files_folder_id_fkey;

ALTER TABLE public.files
ADD CONSTRAINT files_folder_id_fkey 
FOREIGN KEY (folder_id) 
REFERENCES public.folders(id) 
ON DELETE SET NULL;
