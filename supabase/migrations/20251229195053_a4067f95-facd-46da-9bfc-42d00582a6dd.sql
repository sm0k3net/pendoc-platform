-- Update the cleanup function to use 90 days retention
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleaned up audit logs older than 90 days';
END;
$$;

