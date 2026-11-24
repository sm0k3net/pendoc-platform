-- Fix security warnings

-- 1. Fix the client_stats view - add security invoker to use caller's permissions
DROP VIEW IF EXISTS public.client_stats;
CREATE VIEW public.client_stats 
WITH (security_invoker = true)
AS
SELECT 
  c.id as client_id,
  c.user_id,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT v.id) as total_vulnerabilities,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'open') as open_vulnerabilities,
  COUNT(DISTINCT v.id) FILTER (WHERE v.retest_status = 'waiting') as waiting_retest
FROM public.clients c
LEFT JOIN public.projects p ON p.client_id = c.id
LEFT JOIN public.vulnerabilities v ON v.project_id = p.id
GROUP BY c.id, c.user_id;

-- 2. Fix the update_updated_at_column function to have explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;