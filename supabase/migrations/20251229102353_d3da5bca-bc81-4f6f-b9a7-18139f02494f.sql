-- Add remaining missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update validate_client_token function to return all needed fields
DROP FUNCTION IF EXISTS public.validate_client_token(TEXT);
DROP FUNCTION IF EXISTS public.validate_client_token(TEXT);
CREATE FUNCTION public.validate_client_token(p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  id UUID,
  client_id UUID,
  client_email TEXT,
  client_name TEXT,
  client_user_id UUID,
  project_id UUID,
  project_name TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.is_active AND (ca.expires_at IS NULL OR ca.expires_at > now()) as is_valid,
    ca.id,
    ca.client_id,
    ca.client_email,
    ca.client_name,
    ca.client_user_id,
    ca.project_id,
    p.name as project_name,
    ca.expires_at
  FROM client_access ca
  LEFT JOIN projects p ON ca.project_id = p.id
  WHERE ca.access_token = p_token;
END;
$$;

-- Update link_client_to_access to accept access_id
DROP FUNCTION IF EXISTS public.link_client_to_access(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.link_client_to_access(p_token TEXT, p_user_id UUID, p_access_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_access_id IS NOT NULL THEN
    UPDATE client_access
    SET client_user_id = p_user_id, last_login_at = now()
    WHERE id = p_access_id;
  ELSE
    UPDATE client_access
    SET client_user_id = p_user_id, last_login_at = now()
    WHERE access_token = p_token;
  END IF;
  
  RETURN FOUND;
END;
$$;

-- Update update_client_last_login to accept access_id
DROP FUNCTION IF EXISTS public.update_client_last_login(TEXT);
CREATE OR REPLACE FUNCTION public.update_client_last_login(p_token TEXT, p_access_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_access_id IS NOT NULL THEN
    UPDATE client_access
    SET last_login_at = now()
    WHERE id = p_access_id;
  ELSE
    UPDATE client_access
    SET last_login_at = now()
    WHERE access_token = p_token;
  END IF;
  
  RETURN FOUND;
END;
$$;

-- Update admin_confirm_client_email to accept access_id
DROP FUNCTION IF EXISTS public.admin_confirm_client_email(UUID);
CREATE OR REPLACE FUNCTION public.admin_confirm_client_email(p_user_id UUID, p_access_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN TRUE;
END;
$$;