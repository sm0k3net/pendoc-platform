-- Add pentester_notifications table for notifying pentesters
CREATE TABLE public.pentester_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    vulnerability_id uuid REFERENCES public.vulnerabilities(id) ON DELETE CASCADE,
    notification_type text NOT NULL, -- 'comment', 'retest_request', 'mention'
    from_user_id uuid,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pentester_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.pentester_notifications FOR SELECT
USING (auth.uid() = user_id);

-- Policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.pentester_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for authenticated users to create notifications for others
CREATE POLICY "Authenticated users can create notifications"
ON public.pentester_notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.pentester_notifications FOR DELETE
USING (auth.uid() = user_id);

-- Add submitted_by column to vulnerabilities to track who submitted each vulnerability
ALTER TABLE public.vulnerabilities ADD COLUMN IF NOT EXISTS submitted_by uuid;
ALTER TABLE public.vulnerabilities ADD COLUMN IF NOT EXISTS submitted_by_name text;