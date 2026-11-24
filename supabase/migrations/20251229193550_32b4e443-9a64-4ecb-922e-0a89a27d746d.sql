-- Add vulnerability_title, project_name, and link fields to client_notifications
ALTER TABLE public.client_notifications 
ADD COLUMN IF NOT EXISTS vulnerability_title TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS target_url TEXT;

-- Add vulnerability_title, project_name, and link fields to pentester_notifications
ALTER TABLE public.pentester_notifications
ADD COLUMN IF NOT EXISTS vulnerability_title TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS target_url TEXT;

-- Create cleanup function for audit logs older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create a trigger function to create client notifications when relevant events happen
CREATE OR REPLACE FUNCTION public.notify_client_on_vulnerability_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_project_name TEXT;
  v_client_access RECORD;
BEGIN
  -- Get the project's client_id and name
  SELECT client_id, name INTO v_client_id, v_project_name
  FROM public.projects
  WHERE id = NEW.project_id;
  
  -- If no client associated, exit
  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Create notifications for all active client accesses for this client
  FOR v_client_access IN 
    SELECT id FROM public.client_access 
    WHERE client_id = v_client_id AND is_active = true
  LOOP
    INSERT INTO public.client_notifications (
      client_access_id,
      project_id,
      vulnerability_id,
      notification_type,
      message,
      vulnerability_title,
      project_name,
      target_url
    ) VALUES (
      v_client_access.id,
      NEW.project_id,
      NEW.id,
      'vulnerability',
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'New ' || COALESCE(NEW.severity, 'medium') || ' vulnerability: ' || NEW.title
        ELSE 'Vulnerability updated: ' || NEW.title
      END,
      NEW.title,
      v_project_name,
      '/client?vuln=' || NEW.id::text
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_notify_client_vulnerability ON public.vulnerabilities;
CREATE TRIGGER trg_notify_client_vulnerability
  AFTER INSERT ON public.vulnerabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_vulnerability_change();

-- Create trigger function for comments
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vulnerability RECORD;
  v_project RECORD;
  v_client_access RECORD;
  v_pentester_id UUID;
  v_comment_author_name TEXT;
BEGIN
  -- Get vulnerability and project info
  SELECT v.id, v.title, v.project_id, v.user_id INTO v_vulnerability
  FROM public.vulnerabilities v
  WHERE v.id = NEW.vulnerability_id;
  
  SELECT p.id, p.name, p.client_id, p.user_id INTO v_project
  FROM public.projects p
  WHERE p.id = v_vulnerability.project_id;
  
  -- Get commenter name
  SELECT COALESCE(display_name, email, 'Someone') INTO v_comment_author_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Check if commenter is a client (notify pentester)
  SELECT client_user_id INTO v_pentester_id
  FROM public.client_access
  WHERE client_user_id = NEW.user_id AND is_active = true
  LIMIT 1;
  
  IF v_pentester_id IS NOT NULL THEN
    -- Client commented, notify pentester (project owner)
    INSERT INTO public.pentester_notifications (
      user_id,
      notification_type,
      message,
      project_id,
      vulnerability_id,
      from_user_id,
      vulnerability_title,
      project_name,
      target_url
    ) VALUES (
      v_project.user_id,
      'comment',
      v_comment_author_name || ' commented on ' || v_vulnerability.title,
      v_project.id,
      v_vulnerability.id,
      NEW.user_id,
      v_vulnerability.title,
      v_project.name,
      '/dashboard?vuln=' || v_vulnerability.id::text
    );
  ELSE
    -- Pentester commented, notify clients
    IF v_project.client_id IS NOT NULL THEN
      FOR v_client_access IN 
        SELECT id FROM public.client_access 
        WHERE client_id = v_project.client_id AND is_active = true
      LOOP
        INSERT INTO public.client_notifications (
          client_access_id,
          project_id,
          vulnerability_id,
          notification_type,
          message,
          vulnerability_title,
          project_name,
          target_url
        ) VALUES (
          v_client_access.id,
          v_project.id,
          v_vulnerability.id,
          'comment',
          v_comment_author_name || ' replied to ' || v_vulnerability.title,
          v_vulnerability.title,
          v_project.name,
          '/client?vuln=' || v_vulnerability.id::text
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.vulnerability_comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.vulnerability_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

-- Create trigger function for retest requests
CREATE OR REPLACE FUNCTION public.notify_on_retest_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_requester_name TEXT;
BEGIN
  -- Only trigger when retest_status changes to 'waiting'
  IF NEW.retest_status = 'waiting' AND (OLD.retest_status IS NULL OR OLD.retest_status != 'waiting') THEN
    -- Get project info
    SELECT p.id, p.name, p.user_id INTO v_project
    FROM public.projects p
    WHERE p.id = NEW.project_id;
    
    -- Get requester name
    SELECT COALESCE(display_name, email, 'Client') INTO v_requester_name
    FROM public.profiles
    WHERE id = NEW.retest_requested_by;
    
    -- Notify pentester
    INSERT INTO public.pentester_notifications (
      user_id,
      notification_type,
      message,
      project_id,
      vulnerability_id,
      from_user_id,
      vulnerability_title,
      project_name,
      target_url
    ) VALUES (
      v_project.user_id,
      'retest_request',
      v_requester_name || ' requested re-test for ' || NEW.title,
      v_project.id,
      NEW.id,
      NEW.retest_requested_by,
      NEW.title,
      v_project.name,
      '/dashboard?vuln=' || NEW.id::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_notify_retest_request ON public.vulnerabilities;
CREATE TRIGGER trg_notify_retest_request
  AFTER UPDATE ON public.vulnerabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_retest_request();