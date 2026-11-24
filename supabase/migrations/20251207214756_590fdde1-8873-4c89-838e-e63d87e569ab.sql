-- Add branding fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;

-- Branding structure will contain:
-- {
--   "company_name": "string",
--   "company_logo_url": "string", 
--   "primary_color": "string (hex)",
--   "secondary_color": "string (hex)",
--   "footer_text": "string",
--   "show_confidential": boolean
-- }

COMMENT ON COLUMN public.projects.branding IS 'Report branding settings including company name, logo URL, colors, and footer text';