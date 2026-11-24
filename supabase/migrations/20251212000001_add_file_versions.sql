-- Document Version History Migration
-- Tracks changes to files with rollback capability

-- Create file_versions table
CREATE TABLE IF NOT EXISTS public.file_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT,
    storage_path TEXT,
    size_bytes BIGINT,
    change_summary TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique version numbers per file
    CONSTRAINT unique_file_version UNIQUE (file_id, version_number)
);

-- Create indexes for efficient queries
CREATE INDEX idx_file_versions_file_id ON public.file_versions(file_id);
CREATE INDEX idx_file_versions_created_at ON public.file_versions(created_at DESC);
CREATE INDEX idx_file_versions_file_version ON public.file_versions(file_id, version_number DESC);

-- Enable RLS
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_versions
-- Users can view versions of files they own or have shared access to
CREATE POLICY "Users can view versions of own files"
    ON public.file_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = file_versions.file_id
            AND f.user_id = auth.uid()
        )
    );

-- Users can view versions of shared files
CREATE POLICY "Users can view versions of shared files"
    ON public.file_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.files f
            JOIN public.shares s ON (
                (s.resource_type = 'file' AND s.resource_id = f.id) OR
                (s.resource_type = 'folder' AND s.resource_id = f.folder_id) OR
                (s.resource_type = 'project' AND s.resource_id = f.project_id)
            )
            WHERE f.id = file_versions.file_id
            AND s.shared_with_user_id = auth.uid()
        )
    );

-- Only file owners can create versions
CREATE POLICY "Users can create versions for own files"
    ON public.file_versions FOR INSERT
    WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = file_versions.file_id
            AND f.user_id = auth.uid()
        )
    );

-- Users with write access to shared files can create versions
CREATE POLICY "Users with write access can create versions"
    ON public.file_versions FOR INSERT
    WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.files f
            JOIN public.shares s ON (
                (s.resource_type = 'file' AND s.resource_id = f.id) OR
                (s.resource_type = 'folder' AND s.resource_id = f.folder_id) OR
                (s.resource_type = 'project' AND s.resource_id = f.project_id)
            )
            WHERE f.id = file_versions.file_id
            AND s.shared_with_user_id = auth.uid()
            AND s.permission IN ('read_write', 'read_write_add')
        )
    );

-- Only file owners can delete versions
CREATE POLICY "Users can delete versions of own files"
    ON public.file_versions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = file_versions.file_id
            AND f.user_id = auth.uid()
        )
    );

-- Function to auto-create version on file update
CREATE OR REPLACE FUNCTION create_file_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Only create version if content changed
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        -- Get next version number
        SELECT COALESCE(MAX(version_number), 0) + 1
        INTO next_version
        FROM public.file_versions
        WHERE file_id = OLD.id;
        
        -- Insert version with old content
        INSERT INTO public.file_versions (
            file_id,
            version_number,
            content,
            storage_path,
            size_bytes,
            change_summary,
            created_by
        ) VALUES (
            OLD.id,
            next_version,
            OLD.content,
            OLD.storage_path,
            OLD.size_bytes,
            'Auto-saved version',
            COALESCE(auth.uid(), OLD.user_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-versioning
DROP TRIGGER IF EXISTS trigger_create_file_version ON public.files;
CREATE TRIGGER trigger_create_file_version
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION create_file_version();

-- Function to rollback to a specific version
CREATE OR REPLACE FUNCTION rollback_file_version(
    p_file_id UUID,
    p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_content TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user owns the file
    IF NOT EXISTS (
        SELECT 1 FROM public.files
        WHERE id = p_file_id AND user_id = v_user_id
    ) THEN
        -- Check if user has write access via shares
        IF NOT EXISTS (
            SELECT 1 FROM public.files f
            JOIN public.shares s ON (
                (s.resource_type = 'file' AND s.resource_id = f.id) OR
                (s.resource_type = 'folder' AND s.resource_id = f.folder_id) OR
                (s.resource_type = 'project' AND s.resource_id = f.project_id)
            )
            WHERE f.id = p_file_id
            AND s.shared_with_user_id = v_user_id
            AND s.permission IN ('read_write', 'read_write_add')
        ) THEN
            RAISE EXCEPTION 'Access denied';
        END IF;
    END IF;
    
    -- Get the version content
    SELECT content INTO v_content
    FROM public.file_versions
    WHERE file_id = p_file_id AND version_number = p_version_number;
    
    IF v_content IS NULL THEN
        RAISE EXCEPTION 'Version not found';
    END IF;
    
    -- Update the file with version content (this will trigger auto-versioning)
    UPDATE public.files
    SET content = v_content, updated_at = now()
    WHERE id = p_file_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function to limit versions per file (keep last 50 versions)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.file_versions
    WHERE file_id = NEW.file_id
    AND version_number NOT IN (
        SELECT version_number
        FROM public.file_versions
        WHERE file_id = NEW.file_id
        ORDER BY version_number DESC
        LIMIT 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup trigger
DROP TRIGGER IF EXISTS trigger_cleanup_old_versions ON public.file_versions;
CREATE TRIGGER trigger_cleanup_old_versions
    AFTER INSERT ON public.file_versions
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_versions();

-- Add comment for documentation
COMMENT ON TABLE public.file_versions IS 'Stores version history for files with rollback capability';
COMMENT ON FUNCTION rollback_file_version IS 'Rolls back a file to a specific version number';
