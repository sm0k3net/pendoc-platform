-- Replace RLS policies that incorrectly reference auth.users (not selectable by anon/authenticated)

-- projects: shared access
DROP POLICY IF EXISTS "Users can view shared projects" ON public.projects;
CREATE POLICY "Users can view shared projects"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = projects.id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
  )
);

-- shares: recipient can read shares without querying auth.users
DROP POLICY IF EXISTS "Users can see shares they received" ON public.shares;
CREATE POLICY "Users can see shares they received"
ON public.shares
FOR SELECT
USING (shared_with_email = (auth.jwt() ->> 'email'));

-- vulnerabilities: shared project visibility without querying auth.users
DROP POLICY IF EXISTS "Users can view vulnerabilities in shared projects" ON public.vulnerabilities;
CREATE POLICY "Users can view vulnerabilities in shared projects"
ON public.vulnerabilities
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.shares s
    WHERE s.resource_type = 'project'
      AND s.resource_id = vulnerabilities.project_id
      AND s.shared_with_email = (auth.jwt() ->> 'email')
  )
);