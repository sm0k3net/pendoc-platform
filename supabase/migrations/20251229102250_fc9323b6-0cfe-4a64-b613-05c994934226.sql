-- Add missing columns that the existing code expects

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add missing columns to vulnerabilities table
ALTER TABLE public.vulnerabilities 
ADD COLUMN IF NOT EXISTS likelihood TEXT,
ADD COLUMN IF NOT EXISTS owasp_category TEXT,
ADD COLUMN IF NOT EXISTS owasp_item TEXT,
ADD COLUMN IF NOT EXISTS tool TEXT,
ADD COLUMN IF NOT EXISTS execution_command TEXT,
ADD COLUMN IF NOT EXISTS detailed_description TEXT,
ADD COLUMN IF NOT EXISTS status_reason TEXT,
ADD COLUMN IF NOT EXISTS retest_requested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS retest_requested_at TIMESTAMPTZ;

-- Add missing columns to project_reports table
ALTER TABLE public.project_reports 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add missing columns to files table (user_id for ownership tracking)
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add missing columns to folders table (user_id for ownership tracking)
ALTER TABLE public.folders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create file_versions table for version history
CREATE TABLE IF NOT EXISTS public.file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  content TEXT,
  size_bytes BIGINT DEFAULT 0,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(file_id, version_number)
);

ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage versions of files in their projects"
  ON public.file_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.files f
      JOIN public.projects p ON f.project_id = p.id
      WHERE f.id = file_versions.file_id AND p.user_id = auth.uid()
    )
  );

-- Create rollback function for file versions
CREATE OR REPLACE FUNCTION public.rollback_file_version(p_file_id UUID, p_version_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content TEXT;
  v_current_version INTEGER;
BEGIN
  -- Get the content from the version to rollback to
  SELECT content INTO v_content 
  FROM file_versions 
  WHERE id = p_version_id AND file_id = p_file_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get current max version
  SELECT COALESCE(MAX(version_number), 0) INTO v_current_version
  FROM file_versions
  WHERE file_id = p_file_id;
  
  -- Create a new version with the rolled back content
  INSERT INTO file_versions (file_id, version_number, content, change_summary, created_by)
  VALUES (p_file_id, v_current_version + 1, v_content, 'Rollback to previous version', auth.uid());
  
  -- Update the file content
  UPDATE files SET content = v_content, updated_at = now()
  WHERE id = p_file_id;
  
  RETURN TRUE;
END;
$$;

-- Update handle_new_user to also populate display_name and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;