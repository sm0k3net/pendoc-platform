-- CVE Enrichment Cache Table
-- Caches NVD and EPSS data to avoid hitting rate limits on public APIs
-- TTL: 7 days (entries older than 7 days are considered stale and re-fetched)

CREATE TABLE IF NOT EXISTS public.cve_cache (
  cve_id TEXT PRIMARY KEY,
  cvss_score NUMERIC(3,1),
  cvss_vector TEXT,
  cwe_id TEXT,
  cwe_description TEXT,
  epss_score NUMERIC(8,6),
  epss_percentile NUMERIC(8,6),
  description TEXT,
  "references" JSONB DEFAULT '[]'::jsonb,
  affected_products JSONB DEFAULT '[]'::jsonb,
  published_date TIMESTAMPTZ,
  last_modified_date TIMESTAMPTZ,
  raw_nvd_data JSONB,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for TTL-based cleanup queries
CREATE INDEX IF NOT EXISTS idx_cve_cache_cached_at ON public.cve_cache (cached_at);

-- Index for quick lookups by CVSS score (for filtering enriched results)
CREATE INDEX IF NOT EXISTS idx_cve_cache_cvss_score ON public.cve_cache (cvss_score);

-- Enable RLS
ALTER TABLE public.cve_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read from the cache (it's public CVE data)
CREATE POLICY "Authenticated users can read CVE cache"
  ON public.cve_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role (edge functions) can insert/update cache entries
-- This is enforced by the edge function using SUPABASE_SERVICE_ROLE_KEY

-- Comment explaining the TTL strategy
COMMENT ON TABLE public.cve_cache IS 'Cache for NVD and EPSS CVE enrichment data. Entries older than 7 days are re-fetched by the cve-enrichment edge function.';
COMMENT ON COLUMN public.cve_cache.epss_score IS 'EPSS probability score (0.0 to 1.0) - likelihood of exploitation in the next 30 days';
COMMENT ON COLUMN public.cve_cache.epss_percentile IS 'EPSS percentile rank (0.0 to 1.0) relative to all scored CVEs';
