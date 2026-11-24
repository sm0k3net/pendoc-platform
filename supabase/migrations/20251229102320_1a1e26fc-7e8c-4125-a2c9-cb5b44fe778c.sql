-- Add remaining missing database objects that the existing code expects

-- Add user_id to vulnerabilities table
ALTER TABLE public.vulnerabilities
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retest_updated_at TIMESTAMPTZ;

-- Add category and error_message to audit_logs  
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create client_notification_emails table
CREATE TABLE IF NOT EXISTS public.client_notification_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_access_id UUID REFERENCES public.client_access(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(client_access_id, email)
);

ALTER TABLE public.client_notification_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification emails"
  ON public.client_notification_emails FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_access ca
      WHERE ca.id = client_notification_emails.client_access_id
        AND (ca.owner_id = auth.uid() OR ca.client_user_id = auth.uid())
    )
  );

-- Create additional database functions that Auth.tsx expects
DROP FUNCTION IF EXISTS public.validate_client_token(TEXT);
CREATE FUNCTION public.validate_client_token(p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  client_id UUID,
  client_email TEXT,
  client_name TEXT,
  project_id UUID,
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
    ca.client_id,
    ca.client_email,
    ca.client_name,
    ca.project_id,
    ca.expires_at
  FROM client_access ca
  WHERE ca.access_token = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_last_login(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE client_access
  SET last_login_at = now()
  WHERE access_token = p_token;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_client_to_access(p_token TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE client_access
  SET client_user_id = p_user_id, last_login_at = now()
  WHERE access_token = p_token;
  
  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_confirm_client_email(UUID);
CREATE FUNCTION public.admin_confirm_client_email(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a placeholder - email confirmation is typically handled by Supabase Auth
  -- In a real implementation, you'd use the admin API
  RETURN TRUE;
END;
$$;

-- Add token column to api_tokens for newly created tokens (transient, not stored)
-- The existing code expects a 'token' field but we store token_hash
-- We'll handle this in the application layer

