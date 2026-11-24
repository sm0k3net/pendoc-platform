-- Add statuses to vuln_status enum
ALTER TYPE public.vulnerability_status ADD VALUE IF NOT EXISTS 'false_positive';
ALTER TYPE public.vulnerability_status ADD VALUE IF NOT EXISTS 'retest';
ALTER TYPE public.vulnerability_status ADD VALUE IF NOT EXISTS 'validated';

-- Add is_archived to project_reports
ALTER TABLE public.project_reports ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
