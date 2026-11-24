-- Create attack_vector_versions table to store version history
CREATE TABLE public.attack_vector_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attack_vector_id uuid NOT NULL REFERENCES public.attack_vectors(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  diagram text,
  description text NOT NULL,
  timeline jsonb DEFAULT '[]'::jsonb,
  vulnerability_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attack_vector_versions ENABLE ROW LEVEL SECURITY;

-- Create policies (inherit from parent attack_vector)
CREATE POLICY "Users can view own attack vector versions" 
  ON public.attack_vector_versions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.attack_vectors av 
      WHERE av.id = attack_vector_id AND av.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own attack vector versions" 
  ON public.attack_vector_versions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attack_vectors av 
      WHERE av.id = attack_vector_id AND av.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own attack vector versions" 
  ON public.attack_vector_versions FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.attack_vectors av 
      WHERE av.id = attack_vector_id AND av.user_id = auth.uid()
    )
  );

-- Index for fast lookup
CREATE INDEX idx_attack_vector_versions_attack_vector_id ON public.attack_vector_versions(attack_vector_id);
CREATE INDEX idx_attack_vector_versions_version_number ON public.attack_vector_versions(attack_vector_id, version_number DESC);