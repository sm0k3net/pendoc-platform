-- Create severity enum for vulnerabilities
CREATE TYPE public.vulnerability_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- Create likelihood enum for vulnerabilities  
CREATE TYPE public.vulnerability_likelihood AS ENUM ('high', 'medium', 'low');

-- Create OWASP category enum
CREATE TYPE public.owasp_category AS ENUM ('web', 'api', 'mobile', 'ai');

-- Create vulnerabilities table
CREATE TABLE public.vulnerabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity vulnerability_severity NOT NULL DEFAULT 'medium',
  likelihood vulnerability_likelihood NOT NULL DEFAULT 'medium',
  owasp_category owasp_category,
  owasp_item TEXT,
  cvss_score DECIMAL(3,1) CHECK (cvss_score >= 0 AND cvss_score <= 10),
  tool TEXT,
  execution_command TEXT,
  detailed_description TEXT,
  remediation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Create policies for vulnerabilities
CREATE POLICY "Users can view vulnerabilities in their projects"
ON public.vulnerabilities
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_share_access(auth.uid(), 'project'::share_resource_type, project_id)
);

CREATE POLICY "Users can create vulnerabilities in their projects"
ON public.vulnerabilities
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update their own vulnerabilities"
ON public.vulnerabilities
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vulnerabilities"
ON public.vulnerabilities
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vulnerabilities_updated_at
BEFORE UPDATE ON public.vulnerabilities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();