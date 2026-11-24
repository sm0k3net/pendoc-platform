-- Allow clients to view remediation strategies for their projects
CREATE POLICY "Clients can view remediation strategies for their projects"
ON public.remediation_strategies
FOR SELECT
USING (is_client_for_project(project_id));
