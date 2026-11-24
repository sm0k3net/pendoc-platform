-- Create clients table for organizing projects under clients
-- This adds a hierarchy: User -> Clients -> Projects
-- Client Access and Branding are now at the client level

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    company_logo_url TEXT,
    company_website TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    -- Branding settings (moved from project level)
    branding JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create client_contacts table for multiple contact persons (up to 5)
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add client_id to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients (drop existing first to make idempotent)
DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
CREATE POLICY "Users can manage their own clients"
    ON clients FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE client_access ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Allow clients to view their client record
DROP POLICY IF EXISTS "Client users can view their client organization" ON clients;
CREATE POLICY "Client users can view their client organization"
    ON clients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca
            WHERE ca.client_id = clients.id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- RLS Policies for client_contacts
DROP POLICY IF EXISTS "Users can manage contacts for their clients" ON client_contacts;
CREATE POLICY "Users can manage contacts for their clients"
    ON client_contacts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_contacts.client_id
            AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_contacts.client_id
            AND c.user_id = auth.uid()
        )
    );

-- Update client_access to reference clients table instead of projects
-- The client_id column becomes the main reference

-- Make project_id nullable since access is now at client level
ALTER TABLE client_access ALTER COLUMN project_id DROP NOT NULL;

-- Create index for client_access client_id
CREATE INDEX IF NOT EXISTS idx_client_access_client_id ON client_access(client_id);

-- Create trigger for updated_at on clients
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();

-- Grant permissions
GRANT ALL ON clients TO authenticated;
GRANT ALL ON client_contacts TO authenticated;

-- Drop and recreate view for client statistics (to handle column name changes)
DROP VIEW IF EXISTS client_stats;
CREATE VIEW client_stats AS
SELECT 
    c.id as client_id,
    c.user_id,
    c.company_name,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(DISTINCT v.id) as total_vulnerabilities,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'open') as open_vulnerabilities,
    COUNT(DISTINCT v.id) FILTER (WHERE v.retest_status = 'waiting') as waiting_retest,
    COUNT(DISTINCT v.id) FILTER (WHERE v.severity = 'critical' AND v.status = 'open') as critical_open,
    COUNT(DISTINCT v.id) FILTER (WHERE v.severity = 'high' AND v.status = 'open') as high_open
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
LEFT JOIN vulnerabilities v ON v.project_id = p.id
GROUP BY c.id, c.user_id, c.company_name;

-- Grant select on the view
GRANT SELECT ON client_stats TO authenticated;

-- RLS Policies for projects - allow client users to view projects in their organization
DROP POLICY IF EXISTS "Client users can view projects in their organization" ON projects;
CREATE POLICY "Client users can view projects in their organization"
    ON projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca
            WHERE ca.client_id = projects.client_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- RLS Policies for vulnerabilities - allow client users to view vulnerabilities in their projects
DROP POLICY IF EXISTS "Client users can view vulnerabilities in their organization" ON vulnerabilities;
CREATE POLICY "Client users can view vulnerabilities in their organization"
    ON vulnerabilities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN client_access ca ON ca.client_id = p.client_id
            WHERE p.id = vulnerabilities.project_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- RLS Policies for files - allow client users to view files (reports) in their projects
DROP POLICY IF EXISTS "Client users can view files in their organization" ON files;
CREATE POLICY "Client users can view files in their organization"
    ON files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN client_access ca ON ca.client_id = p.client_id
            WHERE p.id = files.project_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- RLS Policies for project_reports - allow client users to view generated reports
DROP POLICY IF EXISTS "Client users can view project reports in their organization" ON project_reports;
CREATE POLICY "Client users can view project reports in their organization"
    ON project_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN client_access ca ON ca.client_id = p.client_id
            WHERE p.id = project_reports.project_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- RLS Policies for client_notifications - allow client users to view their notifications
DROP POLICY IF EXISTS "Client users can view their notifications" ON client_notifications;
CREATE POLICY "Client users can view their notifications"
    ON client_notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca
            WHERE ca.id = client_notifications.client_access_id
            AND ca.client_user_id = auth.uid()
        )
    );

-- Allow client users to update their notifications (mark as read)
DROP POLICY IF EXISTS "Client users can update their notifications" ON client_notifications;
CREATE POLICY "Client users can update their notifications"
    ON client_notifications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca
            WHERE ca.id = client_notifications.client_access_id
            AND ca.client_user_id = auth.uid()
        )
    );

-- RLS Policies for vulnerability_comments - allow client users to view and add comments
DROP POLICY IF EXISTS "Client users can view comments in their organization" ON vulnerability_comments;
CREATE POLICY "Client users can view comments in their organization"
    ON vulnerability_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vulnerabilities v
            JOIN projects p ON p.id = v.project_id
            JOIN client_access ca ON ca.client_id = p.client_id
            WHERE v.id = vulnerability_comments.vulnerability_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

DROP POLICY IF EXISTS "Client users can add comments to vulnerabilities" ON vulnerability_comments;
CREATE POLICY "Client users can add comments to vulnerabilities"
    ON vulnerability_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vulnerabilities v
            JOIN projects p ON p.id = v.project_id
            JOIN client_access ca ON ca.client_id = p.client_id
            WHERE v.id = vulnerability_comments.vulnerability_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );

-- RLS Policies for vulnerabilities - allow client users to update retest_status
DROP POLICY IF EXISTS "Client users can request retest" ON vulnerabilities;
CREATE POLICY "Client users can request retest"
    ON vulnerabilities FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN client_access ca ON ca.client_id = p.client_id
            WHERE p.id = vulnerabilities.project_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN client_access ca ON ca.client_id = p.client_id
            WHERE p.id = vulnerabilities.project_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
        )
    );
