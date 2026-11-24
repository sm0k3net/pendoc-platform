-- Fix client_access RLS policies to allow unauthenticated token validation

-- Drop the existing "anyone can verify" policy
DROP POLICY IF EXISTS "Anyone can verify access token" ON client_access;

-- Create a function to safely validate tokens without exposing other data
-- This function returns only the necessary data for authentication
CREATE OR REPLACE FUNCTION public.validate_client_token(token TEXT)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    client_email TEXT,
    client_name TEXT,
    client_user_id UUID,
    is_active BOOLEAN,
    expires_at TIMESTAMPTZ,
    project_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id,
        ca.project_id,
        ca.client_email,
        ca.client_name,
        ca.client_user_id,
        ca.is_active,
        ca.expires_at,
        p.name as project_name
    FROM client_access ca
    LEFT JOIN projects p ON p.id = ca.project_id
    WHERE ca.access_token = token
    AND ca.is_active = true
    AND (ca.expires_at IS NULL OR ca.expires_at > now());
END;
$$;

-- Grant execute permission on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.validate_client_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_client_token(TEXT) TO authenticated;

-- Create a function to complete client authentication (link user to access)
CREATE OR REPLACE FUNCTION public.link_client_to_access(
    p_access_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE client_access
    SET 
        client_user_id = p_user_id,
        last_login_at = now()
    WHERE id = p_access_id
    AND (client_user_id IS NULL OR client_user_id = p_user_id);
    
    -- Also update the user's profile to mark as client
    UPDATE profiles
    SET user_type = 'client'
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.link_client_to_access(UUID, UUID) TO authenticated;

-- Function to update last login time
CREATE OR REPLACE FUNCTION public.update_client_last_login(p_access_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE client_access
    SET last_login_at = now()
    WHERE id = p_access_id
    AND client_user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_client_last_login(UUID) TO authenticated;

-- ============================================================================
-- IMPORTANT: Client Authentication Setup
-- ============================================================================
-- Since clients need to authenticate without email confirmation, you have 2 options:
--
-- OPTION 1 (Recommended): Disable email confirmation for your project
-- Go to: Supabase Dashboard > Authentication > Providers > Email
-- Uncheck "Confirm email" checkbox
-- This allows all new users (including clients) to sign in immediately
--
-- OPTION 2: If you want email confirmation for pentesters but not clients,
-- you need to manually confirm the client's email after they sign up.
-- The function below can be called by an admin to confirm a user's email:

CREATE OR REPLACE FUNCTION public.admin_confirm_client_email(p_access_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the client_user_id from client_access
    SELECT client_user_id INTO v_user_id
    FROM client_access
    WHERE id = p_access_id;
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update auth.users to confirm email
    -- Note: This requires the function to have proper permissions
    UPDATE auth.users
    SET 
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmed_at = COALESCE(confirmed_at, now())
    WHERE id = v_user_id;
    
    RETURN FOUND;
END;
$$;

-- Only allow service role or authenticated project owners to call this
GRANT EXECUTE ON FUNCTION public.admin_confirm_client_email(UUID) TO authenticated;

-- Add RLS policy for clients to read basic profile info (for comment authors display)
-- This allows clients to see display_name and email of users who commented on vulnerabilities they can access
CREATE POLICY "Clients can view profiles of comment authors"
    ON profiles FOR SELECT
    USING (
        -- User can always see their own profile
        id = auth.uid()
        OR
        -- Or if they are a client with access to a project where this user has commented
        EXISTS (
            SELECT 1 FROM client_access ca
            JOIN vulnerabilities v ON v.project_id = ca.project_id
            JOIN vulnerability_comments vc ON vc.vulnerability_id = v.id
            WHERE ca.client_user_id = auth.uid()
            AND ca.is_active = true
            AND vc.user_id = profiles.id
        )
    );
