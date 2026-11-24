ALTER TABLE public.project_reports
ADD COLUMN IF NOT EXISTS client_visible BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_project_reports_client_visible
ON public.project_reports (client_visible);

DROP POLICY IF EXISTS "Clients can view reports for their projects" ON public.project_reports;
DROP POLICY IF EXISTS "Client users can view project reports in their organization" ON public.project_reports;

CREATE POLICY "Clients can view explicitly shared project reports"
ON public.project_reports
FOR SELECT
USING (
	client_visible = true
	AND EXISTS (
		SELECT 1
		FROM public.projects p
		JOIN public.client_access ca ON ca.client_id = p.client_id
		WHERE p.id = project_reports.project_id
			AND ca.client_user_id = auth.uid()
			AND ca.is_active = true
			AND (ca.expires_at IS NULL OR ca.expires_at > now())
	)
);
