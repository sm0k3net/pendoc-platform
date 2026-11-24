-- Fix 1: Allow users to see profiles of collaborators (project owners, shared users, clients)
-- This enables comment author names to be visible

CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Can view own profile
    auth.uid() = profile_id
    OR
    -- Can view profiles of project owners for projects I have access to (as client)
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_access ca ON ca.client_id = p.client_id
      WHERE p.user_id = profile_id
        AND ca.client_user_id = auth.uid()
        AND ca.is_active = true
    )
    OR
    -- Project owner can view client profiles
    EXISTS (
      SELECT 1 FROM client_access ca
      JOIN projects p ON p.client_id = ca.client_id
      WHERE ca.client_user_id = profile_id
        AND p.user_id = auth.uid()
    )
    OR
    -- Can view profiles of users who shared projects with me
    EXISTS (
      SELECT 1 FROM shares s
      JOIN projects p ON p.id = s.resource_id AND s.resource_type = 'project'
      WHERE (p.user_id = profile_id OR s.shared_with_email = (SELECT email FROM profiles WHERE id = profile_id))
        AND s.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR
    -- Can view profiles of users I shared projects with
    EXISTS (
      SELECT 1 FROM shares s
      WHERE s.owner_id = auth.uid()
        AND s.shared_with_email = (SELECT email FROM profiles WHERE id = profile_id)
    )
    OR
    -- Can view profile of project owner for shared projects
    EXISTS (
      SELECT 1 FROM shares s
      JOIN projects p ON p.id = s.resource_id AND s.resource_type = 'project'
      WHERE p.user_id = profile_id
        AND s.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
$$;

-- Drop old policy and create new one
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view accessible profiles"
ON public.profiles
FOR SELECT
USING (public.can_view_profile(id));

-- Fix 2: Add shared user policies for files
CREATE POLICY "Shared users can view files in shared projects"
ON public.files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = files.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Shared users can manage files with write access"
ON public.files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = files.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
      AND s.permission IN ('read_write', 'read_write_add')
  )
);

-- Fix 3: Add shared user policies for folders
CREATE POLICY "Shared users can view folders in shared projects"
ON public.folders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = folders.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Shared users can manage folders with write access"
ON public.folders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = folders.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
      AND s.permission IN ('read_write', 'read_write_add')
  )
);

-- Fix 4: Add shared user policies for project_reports
CREATE POLICY "Shared users can view reports in shared projects"
ON public.project_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = project_reports.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
  )
);

-- Fix 5: Add shared user policy for vulnerability INSERT
CREATE POLICY "Shared users can create vulnerabilities with write access"
ON public.vulnerabilities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = vulnerabilities.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
      AND s.permission IN ('read_write', 'read_write_add')
  )
);

-- Fix 6: Add shared user policy for vulnerability UPDATE (for collaborators)
CREATE POLICY "Shared users can update vulnerabilities with write access"
ON public.vulnerabilities
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = vulnerabilities.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
      AND s.permission IN ('read_write', 'read_write_add')
  )
);

-- Fix 7: Add shared users policy for vulnerability_comments
CREATE POLICY "Shared users can manage comments on shared project vulnerabilities"
ON public.vulnerability_comments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM vulnerabilities v
    JOIN shares s ON s.resource_type = 'project' AND s.resource_id = v.project_id
    WHERE v.id = vulnerability_comments.vulnerability_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
  )
);