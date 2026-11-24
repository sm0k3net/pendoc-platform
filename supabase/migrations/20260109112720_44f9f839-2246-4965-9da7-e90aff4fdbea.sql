-- Create table for remediation strategies
CREATE TABLE public.remediation_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  executive_summary TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_effort TEXT,
  recommended_timeline TEXT,
  quick_wins JSONB DEFAULT '[]'::jsonb,
  long_term_goals JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable Row Level Security
ALTER TABLE public.remediation_strategies ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own remediation strategies" 
ON public.remediation_strategies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own remediation strategies" 
ON public.remediation_strategies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own remediation strategies" 
ON public.remediation_strategies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own remediation strategies" 
ON public.remediation_strategies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_remediation_strategies_updated_at
BEFORE UPDATE ON public.remediation_strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_remediation_strategies_project_id ON public.remediation_strategies(project_id);
CREATE INDEX idx_remediation_strategies_user_id ON public.remediation_strategies(user_id);