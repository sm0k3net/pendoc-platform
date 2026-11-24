-- Audit Logs table for tracking user actions
-- This migration creates the audit_logs table for comprehensive audit logging

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON public.audit_logs(success) WHERE NOT success;

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs" 
  ON public.audit_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own audit logs
CREATE POLICY "Users can insert their own audit logs" 
  ON public.audit_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Audit trail for tracking user actions and security events';
COMMENT ON COLUMN public.audit_logs.action IS 'Specific action performed (e.g., project.create, file.update)';
COMMENT ON COLUMN public.audit_logs.category IS 'Action category (auth, project, file, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource affected (project, file, folder, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'UUID of the affected resource';
COMMENT ON COLUMN public.audit_logs.details IS 'Additional context and metadata as JSON';
COMMENT ON COLUMN public.audit_logs.success IS 'Whether the action completed successfully';
COMMENT ON COLUMN public.audit_logs.error_message IS 'Error message if action failed';

-- Create function to auto-cleanup old audit logs (keep 90 days for free tier)
-- This helps manage storage on Supabase free tier
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create a pg_cron job to run cleanup weekly (if pg_cron is available)
-- Note: pg_cron may not be available on Supabase free tier
-- If not available, you can call the function manually or via a scheduled edge function
DO $$
BEGIN
  -- Try to create the cron job, ignore error if pg_cron is not available
  PERFORM cron.schedule(
    'cleanup-audit-logs',
    '0 3 * * 0', -- Every Sunday at 3 AM
    'SELECT public.cleanup_old_audit_logs()'
  );
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available, skipping automatic cleanup schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cleanup: %', SQLERRM;
END $$;
