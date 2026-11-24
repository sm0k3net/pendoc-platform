-- Create recommendations table to persist generated recommendations
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary TEXT NOT NULL,
  key_findings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  priority_matrix JSONB DEFAULT '{}'::jsonb,
  estimated_total_investment TEXT,
  expected_roi TEXT,
  project_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own recommendations"
ON public.recommendations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations"
ON public.recommendations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
ON public.recommendations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations"
ON public.recommendations
FOR DELETE
USING (auth.uid() = user_id);

-- Clients can view recommendations for their projects
CREATE POLICY "Clients can view recommendations for their projects"
ON public.recommendations
FOR SELECT
USING (is_client_for_project(project_id));

-- Create unique constraint for project_id (one recommendation per project)
CREATE UNIQUE INDEX recommendations_project_id_idx ON public.recommendations(project_id);

-- Add trigger for updated_at
CREATE TRIGGER update_recommendations_updated_at
BEFORE UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();