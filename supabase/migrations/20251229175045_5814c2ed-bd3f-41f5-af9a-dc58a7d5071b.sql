-- Add RLS policies for clients to access data in projects associated with their client organization

-- First, create a helper function to check if a user is a client for a given project
CREATE OR REPLACE FUNCTION public.is_client_for_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM client_access ca
    JOIN projects p ON p.client_id = ca.client_id
    WHERE p.id = p_project_id
      AND ca.client_user_id = auth.uid()
      AND ca.is_active = true
  )
$$;

-- Add policy for clients to view vulnerabilities in their projects
CREATE POLICY "Clients can view vulnerabilities in their projects"
ON public.vulnerabilities
FOR SELECT
USING (public.is_client_for_project(project_id));

-- Add policy for clients to view files in their projects
CREATE POLICY "Clients can view files in their projects"
ON public.files
FOR SELECT
USING (public.is_client_for_project(project_id));

-- Add policy for clients to view project reports in their projects
CREATE POLICY "Clients can view project_reports in their projects"
ON public.project_reports
FOR SELECT
USING (public.is_client_for_project(project_id));

-- Add policy for clients to view projects associated with their client organization
CREATE POLICY "Clients can view their organization projects"
ON public.projects
FOR SELECT
USING (EXISTS (
  SELECT 1
  FROM client_access ca
  WHERE ca.client_id = projects.client_id
    AND ca.client_user_id = auth.uid()
    AND ca.is_active = true
));

-- Add policy for clients to insert comments on vulnerabilities they can access
CREATE POLICY "Clients can add comments on vulnerabilities they can access"
ON public.vulnerability_comments
FOR INSERT
WITH CHECK (public.is_client_for_project((
  SELECT v.project_id FROM vulnerabilities v WHERE v.id = vulnerability_comments.vulnerability_id
)));

-- Add policy for clients to view comments on vulnerabilities they can access
CREATE POLICY "Clients can view comments on vulnerabilities they can access"
ON public.vulnerability_comments
FOR SELECT
USING (public.is_client_for_project((
  SELECT v.project_id FROM vulnerabilities v WHERE v.id = vulnerability_comments.vulnerability_id
)));

-- Add policy for clients to update vulnerabilities (for retest requests only)
CREATE POLICY "Clients can request retests on vulnerabilities"
ON public.vulnerabilities
FOR UPDATE
USING (public.is_client_for_project(project_id));

-- Add policy for clients to view client information about their organization
CREATE POLICY "Clients can view their organization info"
ON public.clients
FOR SELECT
USING (EXISTS (
  SELECT 1
  FROM client_access ca
  WHERE ca.client_id = clients.id
    AND ca.client_user_id = auth.uid()
    AND ca.is_active = true
));