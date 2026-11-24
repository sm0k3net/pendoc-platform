-- Add policy for clients to view their own notifications
CREATE POLICY "Clients can view their notifications"
ON public.client_notifications
FOR SELECT
USING (
  client_access_id IN (
    SELECT id FROM client_access 
    WHERE client_user_id = auth.uid() AND is_active = true
  )
);

-- Add policy for clients to update their own notifications (mark as read)
CREATE POLICY "Clients can update their notifications"
ON public.client_notifications
FOR UPDATE
USING (
  client_access_id IN (
    SELECT id FROM client_access 
    WHERE client_user_id = auth.uid() AND is_active = true
  )
);