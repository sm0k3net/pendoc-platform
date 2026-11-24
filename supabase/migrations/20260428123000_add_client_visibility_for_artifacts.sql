ALTER TABLE public.attack_vectors
ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.remediation_strategies
ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.recommendations
ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Clients can view attack vectors in their projects" ON public.attack_vectors;
CREATE POLICY "Clients can view shared attack vectors in their projects"
  ON public.attack_vectors
  FOR SELECT
  USING (is_client_for_project(project_id) AND client_visible = true);

DROP POLICY IF EXISTS "Clients can view remediation strategies for their projects" ON public.remediation_strategies;
CREATE POLICY "Clients can view shared remediation strategies for their projects"
  ON public.remediation_strategies
  FOR SELECT
  USING (is_client_for_project(project_id) AND client_visible = true);

DROP POLICY IF EXISTS "Clients can view recommendations for their projects" ON public.recommendations;
CREATE POLICY "Clients can view shared recommendations for their projects"
  ON public.recommendations
  FOR SELECT
  USING (is_client_for_project(project_id) AND client_visible = true);

CREATE INDEX IF NOT EXISTS idx_attack_vectors_client_visible ON public.attack_vectors(project_id, client_visible);
CREATE INDEX IF NOT EXISTS idx_remediation_strategies_client_visible ON public.remediation_strategies(project_id, client_visible);
CREATE INDEX IF NOT EXISTS idx_recommendations_client_visible ON public.recommendations(project_id, client_visible);