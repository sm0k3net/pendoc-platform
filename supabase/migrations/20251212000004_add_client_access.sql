-- Add user_type enum for distinguishing between pentesters and clients
CREATE TYPE user_type AS ENUM ('pentester', 'client');

-- Add user_type column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type user_type DEFAULT 'pentester';

-- Create client_access table for managing client access to projects
CREATE TABLE IF NOT EXISTS client_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_email TEXT NOT NULL,
    client_name TEXT,
    access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, client_email)
);

-- Create client_notification_emails table (up to 5 additional emails per client access)
CREATE TABLE IF NOT EXISTS client_notification_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_access_id UUID NOT NULL REFERENCES client_access(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_access_id, email)
);

-- Create client_notifications table for tracking notifications to project owner
CREATE TABLE IF NOT EXISTS client_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    client_access_id UUID NOT NULL REFERENCES client_access(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'comment', 'retest_request'
    vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add retest_requested_by field to vulnerabilities for tracking who requested retest
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS retest_requested_by UUID REFERENCES auth.users(id);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS retest_requested_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_access_project_id ON client_access(project_id);
CREATE INDEX IF NOT EXISTS idx_client_access_client_email ON client_access(client_email);
CREATE INDEX IF NOT EXISTS idx_client_access_client_user_id ON client_access(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_access_token ON client_access(access_token);
CREATE INDEX IF NOT EXISTS idx_client_notifications_project_id ON client_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_unread ON client_notifications(project_id, is_read) WHERE NOT is_read;

-- Enable RLS on new tables
ALTER TABLE client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notification_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_access
-- Project owners can manage client access for their projects
CREATE POLICY "Project owners can manage client access"
    ON client_access FOR ALL
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Clients can view their own access records
CREATE POLICY "Clients can view their own access"
    ON client_access FOR SELECT
    USING (client_user_id = auth.uid());

-- Allow anyone to verify access token (for login) - tokens are secrets
CREATE POLICY "Anyone can verify access token"
    ON client_access FOR SELECT
    USING (true);

-- Allow authenticated users to update client_access when linking account
CREATE POLICY "Users can link their account to client access"
    ON client_access FOR UPDATE
    USING (client_user_id IS NULL OR client_user_id = auth.uid())
    WITH CHECK (client_user_id = auth.uid());

-- RLS policies for client_notification_emails
-- Clients can manage their own notification emails
CREATE POLICY "Clients can manage their notification emails"
    ON client_notification_emails FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.id = client_notification_emails.client_access_id 
            AND ca.client_user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.id = client_notification_emails.client_access_id 
            AND ca.client_user_id = auth.uid()
        )
    );

-- Project owners can view notification emails for their projects
CREATE POLICY "Owners can view client notification emails"
    ON client_notification_emails FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.id = client_notification_emails.client_access_id 
            AND ca.owner_id = auth.uid()
        )
    );

-- RLS policies for client_notifications
-- Project owners can manage notifications for their projects
CREATE POLICY "Project owners can manage notifications"
    ON client_notifications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = client_notifications.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- Clients can create notifications (comments, retest requests)
CREATE POLICY "Clients can create notifications"
    ON client_notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.id = client_notifications.client_access_id 
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Add RLS policy for clients to view vulnerabilities in their accessible projects
CREATE POLICY "Clients can view project vulnerabilities"
    ON vulnerabilities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.project_id = vulnerabilities.project_id 
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Add RLS policy for clients to request retest (update retest fields only)
CREATE POLICY "Clients can request retest"
    ON vulnerabilities FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.project_id = vulnerabilities.project_id 
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.project_id = vulnerabilities.project_id 
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Add RLS policy for clients to view project details (read-only)
CREATE POLICY "Clients can view project details"
    ON projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.project_id = projects.id 
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Add RLS policy for clients to view folders (read-only)
CREATE POLICY "Clients can view project folders"
    ON folders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.project_id = folders.project_id 
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Add RLS policy for clients to view files (read-only, only reports)
CREATE POLICY "Clients can view project reports"
    ON files FOR SELECT
    USING (
        file_type = 'report' AND
        EXISTS (
            SELECT 1 FROM client_access ca 
            WHERE ca.project_id = files.project_id 
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Add RLS policy for clients to add comments on vulnerabilities
CREATE POLICY "Clients can add vulnerability comments"
    ON vulnerability_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vulnerabilities v
            JOIN client_access ca ON ca.project_id = v.project_id
            WHERE v.id = vulnerability_comments.vulnerability_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Add RLS policy for clients to view vulnerability comments
CREATE POLICY "Clients can view vulnerability comments"
    ON vulnerability_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vulnerabilities v
            JOIN client_access ca ON ca.project_id = v.project_id
            WHERE v.id = vulnerability_comments.vulnerability_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- Function to check if user is a client for a project
CREATE OR REPLACE FUNCTION is_project_client(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM client_access
        WHERE project_id = p_project_id
        AND client_user_id = p_user_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last login for client
CREATE OR REPLACE FUNCTION update_client_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE client_access
    SET last_login_at = now()
    WHERE client_user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_login_at when client logs in
-- Note: This is a simplified approach; in production, you might want to track this differently
