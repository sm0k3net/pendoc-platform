-- Create share permission type enum
CREATE TYPE public.share_permission AS ENUM ('read', 'read_write', 'read_write_add');

-- Create share resource type enum
CREATE TYPE public.share_resource_type AS ENUM ('project', 'folder', 'file');

-- Create shares table for collaboration
CREATE TABLE public.shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type share_resource_type NOT NULL,
  resource_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID,
  permission share_permission NOT NULL DEFAULT 'read',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id, shared_with_email)
);

-- Enable RLS
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Create policies for shares table
CREATE POLICY "Users can view shares they own or are shared with"
ON public.shares
FOR SELECT
USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());

CREATE POLICY "Users can create shares for their own resources"
ON public.shares
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own shares"
ON public.shares
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own shares"
ON public.shares
FOR DELETE
USING (owner_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_shares_updated_at
BEFORE UPDATE ON public.shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function to check if user has access to a resource
CREATE OR REPLACE FUNCTION public.has_share_access(
  _user_id UUID,
  _resource_type share_resource_type,
  _resource_id UUID,
  _required_permission share_permission DEFAULT 'read'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shares
    WHERE resource_type = _resource_type
      AND resource_id = _resource_id
      AND shared_with_user_id = _user_id
      AND (
        _required_permission = 'read'
        OR (permission = 'read_write' AND _required_permission IN ('read', 'read_write'))
        OR permission = 'read_write_add'
      )
  )
$$;

-- Update RLS policies for projects to include shared access
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view own or shared projects"
ON public.projects
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_share_access(auth.uid(), 'project'::share_resource_type, id)
);

-- Update RLS policies for folders to include shared access
DROP POLICY IF EXISTS "Users can view their own folders" ON public.folders;
CREATE POLICY "Users can view own or shared folders"
ON public.folders
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_share_access(auth.uid(), 'folder'::share_resource_type, id)
  OR public.has_share_access(auth.uid(), 'project'::share_resource_type, project_id)
);

-- Update RLS policies for files to include shared access
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
CREATE POLICY "Users can view own or shared files"
ON public.files
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_share_access(auth.uid(), 'file'::share_resource_type, id)
  OR public.has_share_access(auth.uid(), 'folder'::share_resource_type, folder_id)
  OR public.has_share_access(auth.uid(), 'project'::share_resource_type, project_id)
);

-- Function to update shared_with_user_id when user exists
CREATE OR REPLACE FUNCTION public.update_share_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT id INTO NEW.shared_with_user_id
  FROM public.profiles
  WHERE email = NEW.shared_with_email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_share_user_id
BEFORE INSERT OR UPDATE ON public.shares
FOR EACH ROW
EXECUTE FUNCTION public.update_share_user_id();