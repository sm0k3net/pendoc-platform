-- Create attack_vectors table for storing generated attack scenarios
CREATE TABLE public.attack_vectors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  diagram text,
  description text NOT NULL,
  timeline jsonb DEFAULT '[]'::jsonb,
  vulnerability_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attack_vectors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view attack vectors in their projects"
  ON public.attack_vectors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = attack_vectors.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert attack vectors in their projects"
  ON public.attack_vectors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = attack_vectors.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update attack vectors in their projects"
  ON public.attack_vectors FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = attack_vectors.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete attack vectors in their projects"
  ON public.attack_vectors FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = attack_vectors.project_id AND p.user_id = auth.uid()
  ));

-- Clients can view attack vectors
CREATE POLICY "Clients can view attack vectors in their projects"
  ON public.attack_vectors FOR SELECT
  USING (is_client_for_project(project_id));

-- Index for fast lookup
CREATE INDEX idx_attack_vectors_project_id ON public.attack_vectors(project_id);

-- Unique constraint - one attack vector per project
CREATE UNIQUE INDEX idx_attack_vectors_unique_project ON public.attack_vectors(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_attack_vectors_updated_at
  BEFORE UPDATE ON public.attack_vectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();