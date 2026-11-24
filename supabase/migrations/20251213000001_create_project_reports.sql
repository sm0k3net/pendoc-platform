-- Create project_reports table to store generated reports
CREATE TABLE IF NOT EXISTS project_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    html_content TEXT NOT NULL,
    report_type TEXT DEFAULT 'penetration_test',
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_user_id ON project_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_created_at ON project_reports(created_at);

-- Enable RLS
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_reports

-- Project owners can do everything with their reports
CREATE POLICY "Project owners can manage their reports"
    ON project_reports FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_reports.project_id
            AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_reports.project_id
            AND p.user_id = auth.uid()
        )
    );

-- Clients with access can view reports for their projects
CREATE POLICY "Clients can view reports for their projects"
    ON project_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_access ca
            WHERE ca.project_id = project_reports.project_id
            AND ca.client_user_id = auth.uid()
            AND ca.is_active = true
            AND (ca.expires_at IS NULL OR ca.expires_at > now())
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER project_reports_updated_at
    BEFORE UPDATE ON project_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_project_reports_updated_at();

-- Grant permissions
GRANT ALL ON project_reports TO authenticated;
