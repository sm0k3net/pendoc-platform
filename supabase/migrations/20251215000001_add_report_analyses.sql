-- Migration: add report_analyses and report_analysis_runs tables
-- Purpose: persist AI gap analysis / comparison results per report for cache and history,
--          and audit log every analysis run.

-- ─── report_analyses ──────────────────────────────────────────────────────────
-- Stores the AI-generated analysis (JSON + rendered HTML) keyed by report + content hash.
-- type: 'gap' = gap analysis of a single report
--       'compare' = side-by-side comparison (report_id stores "id1::id2")
CREATE TABLE IF NOT EXISTS public.report_analyses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     TEXT        NOT NULL,                -- project_reports.id or "id1::id2" for compare
  type          TEXT        NOT NULL CHECK (type IN ('gap', 'compare')),
  content_hash  TEXT        NOT NULL,                -- SHA-256 of the report content (used as cache key)
  analysis_json TEXT        NOT NULL,                -- raw JSON returned by the AI model
  html_report   TEXT        NOT NULL,                -- rendered HTML report
  model         TEXT        NOT NULL,                -- 'deepseek' | 'openai-gpt-4o-mini' | ...
  created_by    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_report_analyses_lookup
  ON public.report_analyses (report_id, type, content_hash);

-- RLS
ALTER TABLE public.report_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own analyses"
  ON public.report_analyses FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own analyses"
  ON public.report_analyses FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- ─── report_analysis_runs ─────────────────────────────────────────────────────
-- Audit log: one row per AI analysis/comparison invocation.
-- status lifecycle: 'started' → 'streaming' | 'completed' | 'failed'
CREATE TABLE IF NOT EXISTS public.report_analysis_runs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  report_id  TEXT,                                -- project_reports.id (NULL for comparisons)
  action     TEXT        NOT NULL,                -- 'gap-analysis' | 'compare'
  status     TEXT        NOT NULL DEFAULT 'started'
               CHECK (status IN ('started', 'streaming', 'completed', 'failed')),
  model      TEXT,                                -- AI model used (filled on completion)
  note       TEXT,                                -- error message or extra context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep an index on user + action for audit queries
CREATE INDEX IF NOT EXISTS idx_report_analysis_runs_user
  ON public.report_analysis_runs (user_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_report_analysis_runs_updated_at
  BEFORE UPDATE ON public.report_analysis_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.report_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit runs"
  ON public.report_analysis_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit runs"
  ON public.report_analysis_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audit runs"
  ON public.report_analysis_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
